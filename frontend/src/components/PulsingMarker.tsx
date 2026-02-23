import { motion } from "framer-motion";
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

interface PulsingMarkerProps {
  article: NewsArticle;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function PulsingMarker({
  article,
  x,
  y,
  isSelected,
  onClick,
}: PulsingMarkerProps) {
  const color = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.general;
  const size = getMarkerSize(article.rank);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
      data-testid={`marker-${article.id}`}
    >
      {/* パルスアニメーション（外側の円） */}
      <motion.circle
        r={size}
        fill={color}
        fillOpacity={0.3}
        animate={{
          r: [size, size * 2, size],
          fillOpacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: article.rank * 0.15,
        }}
      />
      {/* 内側の円 */}
      <circle r={size} fill={color} fillOpacity={0.8} />
      {/* 選択時のリング */}
      {isSelected && (
        <motion.circle
          r={size + 4}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        />
      )}
    </g>
  );
}
