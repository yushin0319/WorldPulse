import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { NewsArticle } from "../types/api";
import NewsMarker from "./NewsMarker";

// ラベルなしダークタイル
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// 南極・北極をトリミング（緯度 -60 〜 75）
const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [-60, -180],
  [68, 180],
];

interface WorldMapProps {
  articles: NewsArticle[];
  selectedArticleId: string | null;
  onSelectArticle: (id: string | null) => void;
}

// SPのみ: 選択記事に地図をパンする（PCは全体が見えるので不要）
function FlyToSelected({
  articles,
  selectedArticleId,
}: {
  articles: NewsArticle[];
  selectedArticleId: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedArticleId) return;
    // PC (lg: ≥1024px) ではflyToしない
    if (window.innerWidth >= 1024) return;
    const article = articles.find((a) => a.id === selectedArticleId);
    if (article) {
      map.flyTo([article.latitude, article.longitude], map.getZoom(), {
        duration: 0.5,
      });
    }
  }, [selectedArticleId, articles, map]);
  return null;
}

export default function WorldMap({
  articles,
  selectedArticleId,
  onSelectArticle,
}: WorldMapProps) {
  return (
    <div className="relative h-full w-full" data-testid="world-map">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ width: "100%", height: "100%", background: "#0d1220" }}
        zoomControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          subdomains="abcd"
          maxZoom={19}
          noWrap
          bounds={MAX_BOUNDS}
        />
        <FlyToSelected
          articles={articles}
          selectedArticleId={selectedArticleId}
        />
        {articles.map((article) => (
          <NewsMarker
            key={article.id}
            article={article}
            isSelected={selectedArticleId === article.id}
            onClick={() =>
              onSelectArticle(
                selectedArticleId === article.id ? null : article.id
              )
            }
          />
        ))}
      </MapContainer>
    </div>
  );
}
