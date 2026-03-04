// NewsCategory / VALID_CATEGORIES は shared/types.ts が単一定義源。

export type { NewsCategory } from "../../../shared/types";
export { VALID_CATEGORIES } from "../../../shared/types";

// HEX値（マーカー用）
export const CATEGORY_HEX: Record<string, string> = {
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

// Tailwindクラス（パネル用）
export const CATEGORY_BG: Record<string, string> = {
  politics: "bg-red-500",
  conflict: "bg-red-500",
  economy: "bg-amber-500",
  disaster: "bg-orange-500",
  health: "bg-green-500",
  environment: "bg-green-500",
  science: "bg-blue-500",
  tech: "bg-blue-500",
  culture: "bg-purple-500",
  general: "bg-gray-500",
};
