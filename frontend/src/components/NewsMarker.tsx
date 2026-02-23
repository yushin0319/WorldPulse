import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { NewsArticle } from "../types/api";

const CATEGORY_COLORS: Record<string, string> = {
  politics: "#ef4444",
  conflict: "#ef4444",
  economy: "#f59e0b",
  disaster: "#f97316",
  health: "#22c55e",
  environment: "#22c55e",
  science: "#3b82f6",
  tech: "#3b82f6",
  culture: "#a855f7",
  general: "#6b7280",
};

function getMarkerSize(rank: number): number {
  if (rank <= 3) return 8;
  if (rank <= 7) return 6;
  return 4;
}

interface NewsMarkerProps {
  article: NewsArticle;
  isSelected: boolean;
  onClick: () => void;
}

export default function NewsMarker({
  article,
  isSelected,
  onClick,
}: NewsMarkerProps) {
  const color = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.general;
  const size = getMarkerSize(article.rank);
  const boxSize = size * 5;

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        iconSize: [boxSize, boxSize],
        iconAnchor: [boxSize / 2, boxSize / 2],
        html: `
        <div style="position:relative;width:${boxSize}px;height:${boxSize}px;" data-testid="marker-${article.id}">
          <div class="news-marker-pulse" style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:${size * 2}px;height:${size * 2}px;
            border-radius:50%;
            background:${color};
            animation-delay:${article.rank * 0.15}s;
          "></div>
          <div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:${size * 2}px;height:${size * 2}px;
            border-radius:50%;
            background:${color};
            opacity:0.8;
          "></div>
          ${
            isSelected
              ? `<div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:${(size + 4) * 2}px;height:${(size + 4) * 2}px;
            border-radius:50%;
            border:2px solid white;
          "></div>`
              : ""
          }
        </div>
      `,
      }),
    [article.id, article.rank, article.category, isSelected, color, size, boxSize]
  );

  return (
    <Marker
      position={[article.latitude, article.longitude]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    />
  );
}
