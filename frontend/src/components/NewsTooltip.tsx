import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { NewsArticle } from "../types/api";
import { getCountryFlagUrl, getCountryInfo } from "../constants/countries";

interface NewsTooltipProps {
  article: NewsArticle;
  onClose: () => void;
}

export default function NewsTooltip({ article, onClose }: NewsTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-label={article.titleJa}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="relative w-80 rounded-lg border border-gray-700 bg-[#111827] p-4 shadow-xl outline-none"
      data-testid="news-tooltip"
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
        <span>#{article.rank}</span>
        <span>{getCountryInfo(article.countryCode).nameJa}</span>
        <span>·</span>
        <span>{article.sourceName}</span>
        <img
          src={getCountryFlagUrl(article.countryCode)}
          alt={getCountryInfo(article.countryCode).nameJa}
          className="ml-auto inline-block h-[14px] w-[20px] rounded-sm"
          loading="lazy"
        />
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-200"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <h3 className="mb-2 text-base font-bold text-gray-100">
        {article.titleJa}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-gray-300">
        {article.summaryJa}
      </p>
      <a
        href={article.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        元記事を読む →
      </a>
    </motion.div>
  );
}
