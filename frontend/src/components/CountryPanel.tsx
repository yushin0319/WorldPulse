import type { CountryNewsArticle } from "../types/api";
import { getCountryFlagUrl, getCountryInfo } from "../constants/countries";
import { CATEGORY_BG } from "../constants/categories";

interface CountryPanelProps {
  countryCode: string;
  articles: CountryNewsArticle[];
  isLoading: boolean;
  onBack: () => void;
}

export default function CountryPanel({
  countryCode,
  articles,
  isLoading,
  onBack,
}: CountryPanelProps) {
  const info = getCountryInfo(countryCode);

  // 日付でグループ化
  const grouped = articles.reduce<Record<string, CountryNewsArticle[]>>(
    (acc, article) => {
      const key = article.fetchDate;
      if (!acc[key]) acc[key] = [];
      acc[key].push(article);
      return acc;
    },
    {}
  );
  const dateKeys = Object.keys(grouped);

  return (
    <div className="flex h-full flex-col" data-testid="country-panel">
      {/* ヘッダー */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-[#0a0f1a] px-4 py-3"
        data-testid="country-panel-header"
      >
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-200"
          data-testid="country-panel-back"
        >
          ← 戻る
        </button>
        <img
          src={getCountryFlagUrl(countryCode)}
          alt={`${info.nameJa}の国旗`}
          className="inline-block h-[18px] w-[24px] rounded-sm"
          loading="lazy"
        />
        <span className="font-medium text-gray-200">{info.nameJa}</span>
        <span className="text-xs text-gray-500">({info.capitalJa})</span>
      </div>

      {/* コンテンツ */}
      {isLoading ? (
        <div
          className="flex flex-1 items-center justify-center"
          data-testid="country-panel-loading"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        </div>
      ) : articles.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center p-4 text-sm text-gray-500"
          data-testid="country-panel-empty"
        >
          この国のニュースはまだありません
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {dateKeys.map((date) => (
            <div key={date}>
              <div className="sticky top-0 bg-[#0f1525] px-4 py-2 text-xs font-semibold text-gray-400">
                {date}
              </div>
              {grouped[date].map((article) => {
                const colorClass =
                  CATEGORY_BG[article.category] ?? CATEGORY_BG.general;
                return (
                  <div
                    key={article.id}
                    className="border-b border-gray-800 px-4 py-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
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
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {article.summaryJa}
                    </p>
                    {article.sourceUrl && (
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-blue-400 hover:text-blue-300"
                      >
                        元記事を読む →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
