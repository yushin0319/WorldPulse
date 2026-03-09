import { beforeEach, describe, expect, it } from "vitest";
import { useNewsStore } from "../newsStore";

// TanStack Query 移行後、Zustand は UI state のみ管理
describe("newsStore (UI state)", () => {
  beforeEach(() => {
    useNewsStore.setState({
      selectedArticleId: null,
      selectedCountryCode: null,
      selectedDate: null,
    });
  });

  it("初期状態が正しい", () => {
    const state = useNewsStore.getState();
    expect(state.selectedArticleId).toBeNull();
    expect(state.selectedCountryCode).toBeNull();
    expect(state.selectedDate).toBeNull();
  });

  it("selectArticle: IDをセットする", () => {
    useNewsStore.getState().selectArticle("abc");
    expect(useNewsStore.getState().selectedArticleId).toBe("abc");
  });

  it("selectArticle: nullで選択解除する", () => {
    useNewsStore.getState().selectArticle("abc");
    useNewsStore.getState().selectArticle(null);
    expect(useNewsStore.getState().selectedArticleId).toBeNull();
  });

  it("selectCountry: 国コードをセットしselectedArticleIdをクリアする", () => {
    useNewsStore.getState().selectArticle("art-1");
    useNewsStore.getState().selectCountry("JP");

    const state = useNewsStore.getState();
    expect(state.selectedCountryCode).toBe("JP");
    expect(state.selectedArticleId).toBeNull();
  });

  it("selectCountry(null): 国パネルを閉じる", () => {
    useNewsStore.setState({ selectedCountryCode: "JP" });
    useNewsStore.getState().selectCountry(null);

    expect(useNewsStore.getState().selectedCountryCode).toBeNull();
  });

  it("selectDate: 日付をセットし選択状態をリセットする", () => {
    useNewsStore.setState({
      selectedArticleId: "art-1",
      selectedCountryCode: "JP",
    });
    useNewsStore.getState().selectDate("2026-02-20");

    const state = useNewsStore.getState();
    expect(state.selectedDate).toBe("2026-02-20");
    expect(state.selectedArticleId).toBeNull();
    expect(state.selectedCountryCode).toBeNull();
  });

  it("selectDate(null): today クエリに戻す", () => {
    useNewsStore.setState({ selectedDate: "2026-02-20" });
    useNewsStore.getState().selectDate(null);

    expect(useNewsStore.getState().selectedDate).toBeNull();
  });
});
