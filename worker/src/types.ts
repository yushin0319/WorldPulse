export interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
  CORS_ORIGIN: string;
  TRIGGER_SECRET?: string;
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

export interface NewsArticle {
  id: string;
  rank: number;
  sourceName: string;
  sourceUrl: string;
  originalTitle: string;
  titleJa: string;
  summaryJa: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  category: string;
  publishedAt: string | null;
}

export interface DailyNewsResponse {
  fetchDate: string;
  totalArticlesFetched: number;
  articles: NewsArticle[];
}

export interface AvailableDatesResponse {
  dates: string[];
}

// 日をまたいだ重複排除用（過去の選択済み記事）
export interface PreviousArticle {
  titleJa: string;
  originalTitle: string;
  fetchDate: string;
}

// 国別ニュース履歴用
export interface CountryNewsArticle extends NewsArticle {
  fetchDate: string;
}

export interface CountryNewsResponse {
  countryCode: string;
  articles: CountryNewsArticle[];
}