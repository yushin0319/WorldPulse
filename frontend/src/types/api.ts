import type { NewsCategory } from "../constants/categories";

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
