import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useCallback } from "react";
import type { NewsArticle } from "../types/api";
import PulsingMarker from "./PulsingMarker";

// geoUrl を Natural Earth 110m TopoJSON に設定
const GEO_URL = "/world-110m.json";

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
  const handleBackgroundClick = useCallback(() => {
    onSelectArticle(null);
  }, [onSelectArticle]);

  return (
    <div
      className="relative h-full w-full"
      data-testid="world-map"
      onClick={handleBackgroundClick}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: 160,
          center: [10, 5],
        }}
        width={900}
        height={450}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1a2035"
                  stroke="#2a3550"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#243050", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {articles.map((article) => {
            // react-simple-mapsのMarkerを使わず、projectionのコールバックで座標変換
            // ComposableMapのprojection経由で変換されるため、Markerコンポーネントを使用
            return (
              <PulsingMarkerWrapper
                key={article.id}
                article={article}
                isSelected={selectedArticleId === article.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectArticle(
                    selectedArticleId === article.id ? null : article.id
                  );
                }}
              />
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}

// react-simple-maps の Marker を使うラッパー
import { Marker } from "react-simple-maps";

function PulsingMarkerWrapper({
  article,
  isSelected,
  onClick,
}: {
  article: NewsArticle;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Marker coordinates={[article.longitude, article.latitude]}>
      <g onClick={onClick}>
        <PulsingMarker
          article={article}
          x={0}
          y={0}
          isSelected={isSelected}
          onClick={() => {}}
        />
      </g>
    </Marker>
  );
}
