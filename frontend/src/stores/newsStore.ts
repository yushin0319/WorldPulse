import { create } from "zustand";

// UI state のみ管理（サーバー状態は TanStack Query に移行済み）
interface NewsUIState {
  selectedArticleId: string | null;
  selectedCountryCode: string | null;
  // 日付選択状態（null = 最新日 = today クエリ使用）
  selectedDate: string | null;

  selectArticle: (id: string | null) => void;
  selectCountry: (code: string | null) => void;
  selectDate: (date: string | null) => void;
}

export const useNewsStore = create<NewsUIState>((set) => ({
  selectedArticleId: null,
  selectedCountryCode: null,
  selectedDate: null,

  selectArticle: (id: string | null) => {
    set({ selectedArticleId: id });
  },

  selectCountry: (code: string | null) => {
    if (code) {
      set({ selectedCountryCode: code, selectedArticleId: null });
    } else {
      set({ selectedCountryCode: null });
    }
  },

  selectDate: (date: string | null) => {
    // 日付変更時は選択状態をリセット
    set({
      selectedDate: date,
      selectedArticleId: null,
      selectedCountryCode: null,
    });
  },
}));
