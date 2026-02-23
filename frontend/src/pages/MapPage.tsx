import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useNewsStore } from "../stores/newsStore";
import WorldMap from "../components/WorldMap";
import NewsPanel from "../components/NewsPanel";
import DateNavigator from "../components/DateNavigator";
import NewsTooltip from "../components/NewsTooltip";

export default function MapPage() {
  const {
    articles,
    fetchDate,
    availableDates,
    selectedArticleId,
    isLoading,
    isFetching,
    error,
    fetchTodayNews,
    fetchNewsByDate,
    fetchAvailableDates,
    selectArticle,
  } = useNewsStore();

  useEffect(() => {
    fetchTodayNews();
    fetchAvailableDates();
  }, [fetchTodayNews, fetchAvailableDates]);

  // ページタイトル更新
  useEffect(() => {
    document.title = fetchDate ? `WorldPulse - ${fetchDate}` : "WorldPulse";
  }, [fetchDate]);

  const selectedArticle = articles.find((a) => a.id === selectedArticleId);
  const panelRef = useRef<HTMLDivElement>(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  // 選択カードの位置を測定してツールチップの top を合わせる
  const measureCardPosition = useCallback(() => {
    if (!selectedArticleId || !panelRef.current) return;
    const card = panelRef.current.querySelector(
      `[data-testid="news-card-${selectedArticleId}"]`
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
          onDateChange={fetchNewsByDate}
        />
      </header>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900/50 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {/* メインコンテンツ: PC=横並び / スマホ=縦積み */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 地図エリア */}
        <div className="relative h-[50dvh] flex-shrink-0 lg:h-auto lg:flex-1">
          <WorldMap
            articles={articles}
            selectedArticleId={selectedArticleId}
            onSelectArticle={selectArticle}
          />
          {/* 日付変更時のオーバーレイ（全画面スピナーではない） */}
          {isFetching && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#0a0f1a]/60">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
            </div>
          )}
        </div>

        {/* ニュースパネル: PC=右サイドバー / スマホ=下半分 */}
        <div className="relative min-h-0 flex-1 border-t border-gray-800 lg:w-80 lg:flex-none lg:border-l lg:border-t-0">
          {/* ツールチップ: PCのみ、選択カードの上端に合わせて左に表示 */}
          <AnimatePresence>
            {selectedArticle && (
              <div
                key={selectedArticle.id}
                className="absolute right-full top-0 z-[1000] mr-4 hidden max-h-[calc(100%-2rem)] overflow-y-auto lg:block"
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
            className="h-full overflow-y-auto"
            onScroll={measureCardPosition}
          >
            <NewsPanel
              articles={articles}
              selectedArticleId={selectedArticleId}
              onSelectArticle={selectArticle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
