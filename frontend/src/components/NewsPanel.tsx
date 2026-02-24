import type { NewsArticle } from "../types/api";
import { CATEGORY_BG } from "../constants/categories";

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
        className="flex h-full items-center justify-center p-4 text-sm text-gray-500"
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
          CATEGORY_BG[article.category] ?? CATEGORY_BG.general;

        return (
          <button
            key={article.id}
            onClick={() =>
              onSelectArticle(isSelected ? null : article.id)
            }
            aria-pressed={isSelected}
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
              <>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  {article.summaryJa}
                </p>
                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300"
                  >
                    元記事を読む →
                  </a>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
