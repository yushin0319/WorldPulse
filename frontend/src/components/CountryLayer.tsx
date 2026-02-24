import { useEffect, useState, useCallback, useRef } from "react";
import { GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type L from "leaflet";

interface CountryLayerProps {
  onCountryClick: (countryCode: string) => void;
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

// GeoJSONデータ（~209KB, gzip ~30KB）はpublic/に配置し遅延読み込み。
// 初期バンドルに含まれない。データ生成: scripts/prepare-countries-geojson.mjs
export default function CountryLayer({ onCountryClick }: CountryLayerProps) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  const onClickRef = useRef(onCountryClick);
  onClickRef.current = onCountryClick;

  useEffect(() => {
    fetch("/countries-110m.geojson")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => setGeoData(data))
      .catch(() => {
        // fetch失敗時は何も表示しない
      });
  }, []);

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const path = layer as L.Path;
      layer.on({
        mouseover: () => path.setStyle(hoverStyle),
        mouseout: () => path.setStyle(defaultStyle),
        click: () => {
          const code = feature.properties?.iso_a2;
          if (code && code !== "-99") {
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
