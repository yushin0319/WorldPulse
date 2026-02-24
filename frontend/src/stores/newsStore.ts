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
  isFetching: boolean;
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
  isFetching: false,
  error: null,

  fetchTodayNews: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getTodayNews();
      set((state) => {
        // datesキャッシュが古い場合に備え、fetchDateを先頭に追加
        const dates = state.availableDates.includes(data.fetchDate)
          ? state.availableDates
          : [data.fetchDate, ...state.availableDates];
        return {
          articles: data.articles,
          fetchDate: data.fetchDate,
          totalArticlesFetched: data.totalArticlesFetched,
          availableDates: dates,
          isLoading: false,
        };
      });
    } catch {
      set({
        error: "ニュースの取得に失敗しました。時間をおいて再試行してください。",
        isLoading: false,
      });
    }
  },

  fetchNewsByDate: async (date: string) => {
    // 日付変更時はisFetching（全画面スピナーではなくオーバーレイ）
    set({ isFetching: true, error: null, selectedArticleId: null });
    try {
      const data = await getNewsByDate(date);
      set({
        articles: data.articles,
        fetchDate: data.fetchDate,
        totalArticlesFetched: data.totalArticlesFetched,
        isFetching: false,
      });
    } catch {
      set({
        error: "ニュースの取得に失敗しました。時間をおいて再試行してください。",
        isFetching: false,
      });
    }
  },

  fetchAvailableDates: async () => {
    try {
      const data = await getAvailableDates();
      set({ availableDates: data.dates });
    } catch (e) {
      console.warn("日付一覧の取得に失敗:", e);
    }
  },

  selectArticle: (id: string | null) => {
    set({ selectedArticleId: id });
  },
}));
