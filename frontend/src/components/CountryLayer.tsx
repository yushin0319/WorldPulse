import { useEffect, useState, useCallback, useRef } from "react";
import { GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type L from "leaflet";

interface CountryLayerProps {
  onCountryClick: (countryCode: string) => void;
  selectedCountryCode: string | null;
}

// タッチデバイス（hover非対応）では国境を目立たせて操作可能と示す
const isTouchOnly =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: none)").matches;

const defaultStyle: PathOptions = {
  fillColor: "#ffffff",
  fillOpacity: isTouchOnly ? 0.05 : 0,
  weight: isTouchOnly ? 0.8 : 0.5,
  color: isTouchOnly ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
};

const hoverStyle: PathOptions = {
  fillOpacity: 0.08,
  fillColor: "#ffffff",
  weight: 1,
  color: "rgba(255,255,255,0.3)",
};

const selectedStyle: PathOptions = {
  fillOpacity: 0.1,
  fillColor: "#ffffff",
  weight: 1.5,
  color: "rgba(255,255,255,0.4)",
};

// GeoJSONデータ（~209KB, gzip ~30KB）はpublic/に配置し遅延読み込み。
// 初期バンドルに含まれない。データ生成: scripts/prepare-countries-geojson.mjs
export default function CountryLayer({ onCountryClick, selectedCountryCode }: CountryLayerProps) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  const onClickRef = useRef(onCountryClick);
  onClickRef.current = onCountryClick;

  // 国コード → Leafletレイヤーのマッピング
  const layerMapRef = useRef<Map<string, L.Path>>(new Map());
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/countries-110m.geojson")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => setGeoData(data))
      .catch(() => {
        // fetch失敗時は何も表示しない
      });
  }, []);

  // selectedCountryCode変更時にスタイルを更新
  useEffect(() => {
    const prev = selectedRef.current;
    selectedRef.current = selectedCountryCode;

    if (prev && layerMapRef.current.has(prev)) {
      layerMapRef.current.get(prev)!.setStyle(defaultStyle);
    }
    if (selectedCountryCode && layerMapRef.current.has(selectedCountryCode)) {
      layerMapRef.current.get(selectedCountryCode)!.setStyle(selectedStyle);
    }
  }, [selectedCountryCode]);

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const path = layer as L.Path;
      const code = feature.properties?.iso_a2;

      if (code && code !== "-99") {
        layerMapRef.current.set(code, path);
      }

      layer.on({
        mouseover: () => {
          // 選択中の国はselectedStyleを維持
          if (code && code === selectedRef.current) {
            path.setStyle(selectedStyle);
          } else {
            path.setStyle(hoverStyle);
          }
        },
        mouseout: () => {
          // 選択中の国はselectedStyleを維持
          if (code && code === selectedRef.current) {
            path.setStyle(selectedStyle);
          } else {
            path.setStyle(defaultStyle);
          }
        },
        click: () => {
          if (code && code !== "-99") {
            // 前の選択をリセット
            const prev = selectedRef.current;
            if (prev && prev !== code && layerMapRef.current.has(prev)) {
              layerMapRef.current.get(prev)!.setStyle(defaultStyle);
            }
            // タッチデバイスではmouseoutがclick直後に同期発火するため、
            // useEffect（非同期）を待たずにrefとスタイルを即座に更新する
            selectedRef.current = code;
            path.setStyle(selectedStyle);
            onClickRef.current(code);
          }
        },
      });
    },
    []
  );

  if (!geoData) return null;

  return (
    <GeoJSON data={geoData} style={() => defaultStyle} onEachFeature={onEachFeature} />
  );
}
