import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { NewsArticle } from "../types/api";
import NewsMarker from "./NewsMarker";

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface WorldMapProps {
  articles: NewsArticle[];
  selectedArticleId: string | null;
  onSelectArticle: (id: string | null) => void;
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
        style={{ width: "100%", height: "100%", background: "#0d1220" }}
        zoomControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          subdomains="abcd"
          maxZoom={19}
          noWrap
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
