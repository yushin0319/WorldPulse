import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import CountryPanel from "../components/CountryPanel";
import DateNavigator from "../components/DateNavigator";
import NewsPanel from "../components/NewsPanel";
import NewsTooltip from "../components/NewsTooltip";
import WorldMap from "../components/WorldMap";
import {
  useAvailableDates,
  useCountryNews,
  useNewsByDate,
  useTodayNews,
} from "../hooks/useNewsQueries";
import { useNewsStore } from "../stores/newsStore";

export default function MapPage() {
  const {
    selectedArticleId,
    selectedCountryCode,
    selectedDate,
    selectArticle,
    selectCountry,
    selectDate,
  } = useNewsStore();

  // サーバー状態は TanStack Query で管理
  const todayQuery = useTodayNews();
  const dateQuery = useNewsByDate(selectedDate);
  const datesQuery = useAvailableDates();
  const countryQuery = useCountryNews(selectedCountryCode);

  // selectedDate が null なら today、あれば date クエリを使用
  const activeQuery = selectedDate ? dateQuery : todayQuery;
  const articles = activeQuery.data?.articles ?? [];
  const fetchDate = activeQuery.data?.fetchDate ?? null;
  const isLoading = todayQuery.isLoading;
  const isFetching = selectedDate ? dateQuery.isFetching : false;
  const error = activeQuery.error?.message ?? null;

  // 日付一覧: todayの日付も含める
  const availableDates = (() => {
    const dates = datesQuery.data?.dates ?? [];
    if (fetchDate && !dates.includes(fetchDate)) {
      return [fetchDate, ...dates];
    }
    return dates;
  })();

  // ページタイトル更新
  useEffect(() => {
    document.title = fetchDate ? `WorldPulse - ${fetchDate}` : "WorldPulse";
  }, [fetchDate]);

  const selectedArticle = articles.find((a) => a.id === selectedArticleId);
  const panelRef = useRef<HTMLDivElement>(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  // 日付変更ハンドラ
  const handleDateChange = useCallback(
    (date: string) => {
      // today の日付と同じならリセット（today クエリに戻す）
      if (date === todayQuery.data?.fetchDate) {
        selectDate(null);
      } else {
        selectDate(date);
      }
    },
    [todayQuery.data?.fetchDate, selectDate],
  );

  // マーカークリック→国パネルを開く
  const handleMarkerClick = useCallback(
    (id: string | null) => {
      if (!id) return;
      const article = articles.find((a) => a.id === id);
      if (article) {
        selectCountry(article.countryCode);
      }
    },
    [articles, selectCountry],
  );

  // 国ポリゴンクリック→国パネルを開く
  const handleCountryClick = useCallback(
    (countryCode: string) => {
      selectCountry(countryCode);
    },
    [selectCountry],
  );

  // 選択カードの位置を測定してツールチップの top を合わせる
  const measureCardPosition = useCallback(() => {
    if (!selectedArticleId || !panelRef.current) return;
    const card = panelRef.current.querySelector(
      `[data-testid="news-card-${selectedArticleId}"]`,
    ) as HTMLElement | null;
    if (card) {
      setTooltipTop(card.offsetTop - panelRef.current.scrollTop);
    }
  }, [selectedArticleId]);

  useEffect(() => {
    measureCardPosition();
  }, [measureCardPosition]);

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-[#0a0f1a]"
        data-testid="loading-screen"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0f1a]">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <h1 className="text-lg font-bold text-gray-200">WorldPulse</h1>
        <DateNavigator
          currentDate={fetchDate}
          availableDates={availableDates}
          onDateChange={handleDateChange}
        />
      </header>

      {/* エラー表示 */}
      {error && (
        <div className="flex flex-col items-center bg-red-900/50 px-4 py-2 text-center text-sm text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => activeQuery.refetch()}
            className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
          >
            再読み込み
          </button>
        </div>
      )}

      {/* メインコンテンツ: PC=横並び / スマホ=縦積み */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 地図エリア */}
        <div className="relative h-[50dvh] shrink-0 lg:h-auto lg:flex-1">
          <WorldMap
            articles={articles}
            selectedArticleId={selectedArticleId}
            onSelectArticle={handleMarkerClick}
            onCountryClick={handleCountryClick}
            selectedCountryCode={selectedCountryCode}
          />
          {/* 日付変更時のオーバーレイ（全画面スピナーではない） */}
          {isFetching && (
            <div className="absolute inset-0 z-500 flex items-center justify-center bg-[#0a0f1a]/60">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
            </div>
          )}
        </div>

        {/* パネル: PC=右サイドバー / スマホ=下半分 */}
        <div className="relative z-1000 min-h-0 flex-1 border-t border-gray-800 lg:w-80 lg:flex-none lg:border-l lg:border-t-0">
          {selectedCountryCode ? (
            <CountryPanel
              countryCode={selectedCountryCode}
              articles={countryQuery.data?.articles ?? []}
              isLoading={countryQuery.isLoading}
              onBack={() => selectCountry(null)}
            />
          ) : (
            <>
              {/* ツールチップ: PCのみ、選択カードの上端に合わせて左に表示 */}
              <AnimatePresence>
                {selectedArticle && (
                  <div
                    key={selectedArticle.id}
                    className="absolute right-full top-0 z-1000 mr-4 hidden max-h-[calc(100%-2rem)] overflow-y-auto [scrollbar-width:none] lg:block"
                    style={{ top: tooltipTop }}
                  >
                    <NewsTooltip
                      article={selectedArticle}
                      onClose={() => selectArticle(null)}
                    />
                  </div>
                )}
              </AnimatePresence>
              <div
                ref={panelRef}
                className="h-full overflow-y-auto [scrollbar-width:thin]"
                onScroll={measureCardPosition}
              >
                <NewsPanel
                  articles={articles}
                  selectedArticleId={selectedArticleId}
                  onSelectArticle={selectArticle}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
