import { motion } from "framer-motion";
import type { NewsArticle } from "../types/api";

interface NewsTooltipProps {
  article: NewsArticle;
  onClose: () => void;
}

export default function NewsTooltip({ article, onClose }: NewsTooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-4 left-1/2 z-20 w-80 max-w-[90vw] -translate-x-1/2 rounded-lg border border-gray-700 bg-[#111827] p-4 shadow-xl lg:bottom-auto lg:left-auto lg:right-4 lg:top-4 lg:translate-x-0"
      data-testid="news-tooltip"
    >
      <button
        onClick={onClose}
        className="absolute right-2 top-2 text-gray-400 hover:text-gray-200"
        aria-label="閉じる"
      >
        ✕
      </button>
      <p className="mb-1 text-xs text-gray-400">
        #{article.rank} · {article.sourceName}
      </p>
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
