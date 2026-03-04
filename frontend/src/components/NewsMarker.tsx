import L from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { CATEGORY_HEX } from "../constants/categories";
import type { NewsArticle } from "../types/api";

function getMarkerSize(rank: number): number {
  if (rank <= 3) return 8;
  if (rank <= 7) return 6;
  return 4;
}

// タッチターゲット最小サイズ（44px以上）
const MIN_BOX_SIZE = 44;

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
  const color = CATEGORY_HEX[article.category] ?? CATEGORY_HEX.general;
  const size = getMarkerSize(article.rank);
  const boxSize = Math.max(size * 5, MIN_BOX_SIZE);

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
    [article.id, article.rank, isSelected, color, size, boxSize],
  );

  return (
    <Marker
      position={[article.latitude, article.longitude]}
      icon={icon}
      title={article.titleJa}
      alt={article.titleJa}
      eventHandlers={{ click: onClick }}
    />
  );
}
