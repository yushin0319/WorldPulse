import { create } from "zustand";
import type { NewsArticle } from "../types/api";
import { getTodayNews, getNewsByDate, getAvailableDates } from "../services/api";

interface NewsState {
  articles: NewsArticle[];
  fetchDate: string | null;
  availableDates: string[];
  totalArticlesFetched: number;
  selectedArticleId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchTodayNews: () => Promise<void>;
  fetchNewsByDate: (date: string) => Promise<void>;
  fetchAvailableDates: () => Promise<void>;
  selectArticle: (id: string | null) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  articles: [],
  fetchDate: null,
  availableDates: [],
  totalArticlesFetched: 0,
  selectedArticleId: null,
  isLoading: false,
  error: null,

  fetchTodayNews: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getTodayNews();
      set({
        articles: data.articles,
        fetchDate: data.fetchDate,
        totalArticlesFetched: data.totalArticlesFetched,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  fetchNewsByDate: async (date: string) => {
    set({ isLoading: true, error: null, selectedArticleId: null });
    try {
      const data = await getNewsByDate(date);
      set({
        articles: data.articles,
        fetchDate: data.fetchDate,
        totalArticlesFetched: data.totalArticlesFetched,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  fetchAvailableDates: async () => {
    try {
      const data = await getAvailableDates();
      set({ availableDates: data.dates });
    } catch {
      // 日付取得失敗は致命的でないのでエラー表示しない
    }
  },

  selectArticle: (id: string | null) => {
    set({ selectedArticleId: id });
  },
}));
