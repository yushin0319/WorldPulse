// Shared type definitions — single source of truth
// Both worker and frontend import from this file.

export const VALID_CATEGORIES = [
  "politics",
  "economy",
  "conflict",
  "science",
  "disaster",
  "health",
  "environment",
  "tech",
  "culture",
  "general",
] as const;

export type NewsCategory = (typeof VALID_CATEGORIES)[number];

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
  category: NewsCategory;
  publishedAt: string | null;
}

export interface DailyNews {
  fetchDate: string;
  totalArticlesFetched: number;
  articles: NewsArticle[];
}

export interface AvailableDates {
  dates: string[];
}

export interface CountryNewsArticle extends NewsArticle {
  fetchDate: string;
}

export interface CountryNewsResponse {
  countryCode: string;
  articles: CountryNewsArticle[];
}
