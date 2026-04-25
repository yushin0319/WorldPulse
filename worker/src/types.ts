// 共有型定義は shared/types.ts に集約。ここでは re-export + worker固有型のみ定義する。

// Worker サービス内で使われている既存名を維持するための型エイリアス
export type {
  AvailableDates,
  AvailableDates as AvailableDatesResponse,
  CountryNewsArticle,
  CountryNewsResponse,
  DailyNews,
  DailyNews as DailyNewsResponse,
  NewsArticle,
  NewsCategory,
} from "../../shared/types";
export { VALID_CATEGORIES } from "../../shared/types";

// Cloudflare Workers 環境固有の型（frontend では不要）
export interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
  CORS_ORIGIN: string;
  TRIGGER_SECRET?: string;
  DISCORD_WEBHOOK_URL?: string;
  // L15: Sentry エラートラッキング（DSN は wrangler secret、release は CI で git SHA を渡す）
  SENTRY_DSN?: string;
  SENTRY_RELEASE?: string;
}

export interface RssArticle {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

export interface GeminiSelectedArticle {
  index: number;
  country_code: string;
  lat: number;
  lng: number;
  title_ja: string;
  summary_ja: string;
  category: string;
}

// 日をまたいだ重複排除用（過去の選択済み記事）
export interface PreviousArticle {
  titleJa: string;
  originalTitle: string;
  fetchDate: string;
}
