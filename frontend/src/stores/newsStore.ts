import { create } from "zustand";
import type { NewsArticle, CountryNewsArticle } from "../types/api";
import { getTodayNews, getNewsByDate, getAvailableDates, getNewsByCountry } from "../services/api";

interface NewsState {
  articles: NewsArticle[];
  fetchDate: string | null;
  availableDates: string[];
  totalArticlesFetched: number;
  selectedArticleId: string | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;

  // 国パネル
  selectedCountryCode: string | null;
  countryArticles: CountryNewsArticle[];
  isLoadingCountry: boolean;

  fetchTodayNews: () => Promise<void>;
  fetchNewsByDate: (date: string) => Promise<void>;
  fetchAvailableDates: () => Promise<void>;
  selectArticle: (id: string | null) => void;
  selectCountry: (code: string | null) => void;
  fetchCountryNews: (code: string) => Promise<void>;
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
  selectedCountryCode: null,
  countryArticles: [],
  isLoadingCountry: false,

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
    // 日付変更時はisFetching（全画面スピナーではなくオーバーレイ）+ 国パネルリセット
    set({ isFetching: true, error: null, selectedArticleId: null, selectedCountryCode: null, countryArticles: [] });
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
      set((state) => {
        // fetchTodayNewsが先に完了していた場合、fetchDateを保持
        const dates =
          state.fetchDate && !data.dates.includes(state.fetchDate)
            ? [state.fetchDate, ...data.dates]
            : data.dates;
        return { availableDates: dates };
      });
    } catch (e) {
      console.warn("日付一覧の取得に失敗:", e);
    }
  },

  selectArticle: (id: string | null) => {
    set({ selectedArticleId: id });
  },

  selectCountry: (code: string | null) => {
    if (code) {
      set({ selectedCountryCode: code, selectedArticleId: null });
    } else {
      set({ selectedCountryCode: null, countryArticles: [] });
    }
  },

  fetchCountryNews: async (code: string) => {
    set({ isLoadingCountry: true, error: null, selectedCountryCode: code });
    try {
      const data = await getNewsByCountry(code);
      set({ countryArticles: data.articles, isLoadingCountry: false });
    } catch {
      set({
        error: "国別ニュースの取得に失敗しました。",
        isLoadingCountry: false,
      });
    }
  },
}));
