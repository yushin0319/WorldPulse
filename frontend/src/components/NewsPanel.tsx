import type { NewsArticle } from "../types/api";

const CATEGORY_COLORS: Record<string, string> = {
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

interface NewsPanelProps {
  articles: NewsArticle[];
  selectedArticleId: string | null;
  onSelectArticle: (id: string | null) => void;
}

export default function NewsPanel({
  articles,
  selectedArticleId,
  onSelectArticle,
}: NewsPanelProps) {
  if (articles.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-4 text-sm text-gray-500"
        data-testid="news-panel-empty"
      >
        ニュースがありません
      </div>
    );
  }

  return (
    <div className="overflow-y-auto" data-testid="news-panel">
      {articles.map((article) => {
        const isSelected = selectedArticleId === article.id;
        const colorClass =
          CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.general;

        return (
          <button
            key={article.id}
            onClick={() =>
              onSelectArticle(isSelected ? null : article.id)
            }
            className={`w-full border-b border-gray-800 px-4 py-3 text-left transition-colors hover:bg-[#1a2035] ${
              isSelected ? "bg-[#1a2035]" : ""
            }`}
            data-testid={`news-card-${article.id}`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">
                #{article.rank}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${colorClass}`}
              />
              <span className="text-xs text-gray-500">
                {article.sourceName}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-200">
              {article.titleJa}
            </p>
            {isSelected && (
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                {article.summaryJa}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
