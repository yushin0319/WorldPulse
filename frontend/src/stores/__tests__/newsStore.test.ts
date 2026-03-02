import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNewsStore } from "../newsStore";

// APIモック
vi.mock("../../services/api", () => ({
  getTodayNews: vi.fn(),
  getNewsByDate: vi.fn(),
  getAvailableDates: vi.fn(),
  getNewsByCountry: vi.fn(),
}));

import { getTodayNews, getNewsByDate, getAvailableDates, getNewsByCountry } from "../../services/api";

const mockTodayNews = {
  fetchDate: "2026-02-23",
  totalArticlesFetched: 50,
  articles: [
    {
      id: "1",
      rank: 1,
      sourceName: "BBC",
      sourceUrl: "http://bbc.com/1",
      originalTitle: "Test",
      titleJa: "テスト",
      summaryJa: "テスト要約",
      countryCode: "JP",
      latitude: 35.68,
      longitude: 139.65,
      category: "general",
      publishedAt: null,
    },
  ],
};

describe("newsStore", () => {
  beforeEach(() => {
    // ストアリセット
    useNewsStore.setState({
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
    });
    vi.clearAllMocks();
  });

  it("初期状態が正しい", () => {
    const state = useNewsStore.getState();
    expect(state.articles).toHaveLength(0);
    expect(state.fetchDate).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedArticleId).toBeNull();
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

  it("fetchTodayNews: 成功時にデータをセットする", async () => {
    vi.mocked(getTodayNews).mockResolvedValue(mockTodayNews);

    await useNewsStore.getState().fetchTodayNews();

    const state = useNewsStore.getState();
    expect(state.articles).toHaveLength(1);
    expect(state.fetchDate).toBe("2026-02-23");
    expect(state.totalArticlesFetched).toBe(50);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("fetchTodayNews: fetchDateがavailableDatesに含まれない場合、先頭に追加する", async () => {
    // datesキャッシュが古く "2026-02-23" のみの状態
    useNewsStore.setState({ availableDates: ["2026-02-23"] });
    const newData = { ...mockTodayNews, fetchDate: "2026-02-24" };
    vi.mocked(getTodayNews).mockResolvedValue(newData);

    await useNewsStore.getState().fetchTodayNews();

    const state = useNewsStore.getState();
    expect(state.fetchDate).toBe("2026-02-24");
    expect(state.availableDates).toEqual(["2026-02-24", "2026-02-23"]);
  });

  it("fetchTodayNews: fetchDateが既にavailableDatesにある場合、重複追加しない", async () => {
    useNewsStore.setState({ availableDates: ["2026-02-23", "2026-02-22"] });
    vi.mocked(getTodayNews).mockResolvedValue(mockTodayNews);

    await useNewsStore.getState().fetchTodayNews();

    expect(useNewsStore.getState().availableDates).toEqual(["2026-02-23", "2026-02-22"]);
  });

  it("fetchTodayNews: エラー時にerrorをセットする", async () => {
    vi.mocked(getTodayNews).mockRejectedValue(new Error("Network error"));

    await useNewsStore.getState().fetchTodayNews();

    const state = useNewsStore.getState();
    expect(state.error).toBe("ニュースの取得に失敗しました。時間をおいて再試行してください。");
    expect(state.isLoading).toBe(false);
    expect(state.articles).toHaveLength(0);
  });

  it("fetchNewsByDate: 日付指定でデータを取得する", async () => {
    vi.mocked(getNewsByDate).mockResolvedValue(mockTodayNews);

    await useNewsStore.getState().fetchNewsByDate("2026-02-23");

    expect(getNewsByDate).toHaveBeenCalledWith("2026-02-23");
    expect(useNewsStore.getState().articles).toHaveLength(1);
  });

  it("fetchNewsByDate: 選択中の記事をリセットする", async () => {
    useNewsStore.getState().selectArticle("old-id");
    vi.mocked(getNewsByDate).mockResolvedValue(mockTodayNews);

    await useNewsStore.getState().fetchNewsByDate("2026-02-23");

    expect(useNewsStore.getState().selectedArticleId).toBeNull();
  });

  it("fetchAvailableDates: 日付一覧を取得する", async () => {
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-23", "2026-02-22"],
    });

    await useNewsStore.getState().fetchAvailableDates();

    expect(useNewsStore.getState().availableDates).toEqual([
      "2026-02-23",
      "2026-02-22",
    ]);
  });

  it("fetchNewsByDate: エラー時にerrorをセットしisFetchingをfalseにする", async () => {
    vi.mocked(getNewsByDate).mockRejectedValue(new Error("Server error"));

    await useNewsStore.getState().fetchNewsByDate("2026-02-22");

    const state = useNewsStore.getState();
    expect(state.error).toBe("ニュースの取得に失敗しました。時間をおいて再試行してください。");
    expect(state.isFetching).toBe(false);
  });

  it("fetchNewsByDate: isFetchingがtrueになりisLoadingはfalseのまま", async () => {
    let resolveFn: (value: unknown) => void;
    vi.mocked(getNewsByDate).mockImplementation(
      () => new Promise((resolve) => { resolveFn = resolve; })
    );

    const promise = useNewsStore.getState().fetchNewsByDate("2026-02-22");
    expect(useNewsStore.getState().isFetching).toBe(true);
    expect(useNewsStore.getState().isLoading).toBe(false);

    resolveFn!(mockTodayNews);
    await promise;
    expect(useNewsStore.getState().isFetching).toBe(false);
  });

  it("fetchAvailableDates: fetchTodayNewsが先に完了していた場合、fetchDateを保持する", async () => {
    // fetchTodayNewsが先に完了: fetchDate="2026-02-24", availableDates=["2026-02-24"]
    useNewsStore.setState({
      fetchDate: "2026-02-24",
      availableDates: ["2026-02-24"],
    });
    // APIキャッシュが古く "2026-02-24" を含まない
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-23", "2026-02-22"],
    });

    await useNewsStore.getState().fetchAvailableDates();

    // fetchDateが先頭に追加され、失われない
    expect(useNewsStore.getState().availableDates).toEqual([
      "2026-02-24",
      "2026-02-23",
      "2026-02-22",
    ]);
  });

  it("fetchAvailableDates: APIレスポンスにfetchDateが含まれる場合、重複追加しない", async () => {
    useNewsStore.setState({
      fetchDate: "2026-02-24",
      availableDates: ["2026-02-24"],
    });
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-24", "2026-02-23"],
    });

    await useNewsStore.getState().fetchAvailableDates();

    expect(useNewsStore.getState().availableDates).toEqual([
      "2026-02-24",
      "2026-02-23",
    ]);
  });

  it("fetchAvailableDates: エラー時もavailableDatesは変更されない", async () => {
    useNewsStore.setState({ availableDates: ["2026-02-23"] });
    vi.mocked(getAvailableDates).mockRejectedValue(new Error("fail"));

    await useNewsStore.getState().fetchAvailableDates();

    // エラーが起きても既存の日付一覧は保持される
    expect(useNewsStore.getState().availableDates).toEqual(["2026-02-23"]);
    // エラーメッセージは設定されない（静かに失敗）
    expect(useNewsStore.getState().error).toBeNull();
  });

  // --- 国パネル ---

  it("初期状態: 国パネル関連がnull/空", () => {
    const state = useNewsStore.getState();
    expect(state.selectedCountryCode).toBeNull();
    expect(state.countryArticles).toHaveLength(0);
    expect(state.isLoadingCountry).toBe(false);
  });

  it("selectCountry: 国コードをセットしselectedArticleIdをクリアする", () => {
    useNewsStore.getState().selectArticle("art-1");
    useNewsStore.getState().selectCountry("JP");

    const state = useNewsStore.getState();
    expect(state.selectedCountryCode).toBe("JP");
    expect(state.selectedArticleId).toBeNull();
  });

  it("selectCountry(null): 国パネルを閉じてcountryArticlesもクリアする", () => {
    useNewsStore.setState({
      selectedCountryCode: "JP",
      countryArticles: [{ id: "1", rank: 1, sourceName: "BBC", sourceUrl: "", originalTitle: "", titleJa: "", summaryJa: "", countryCode: "JP", latitude: 0, longitude: 0, category: "general", publishedAt: null, fetchDate: "2026-02-23" }],
    });

    useNewsStore.getState().selectCountry(null);

    expect(useNewsStore.getState().selectedCountryCode).toBeNull();
    expect(useNewsStore.getState().countryArticles).toHaveLength(0);
  });

  it("fetchCountryNews: 成功時にcountryArticlesをセットする", async () => {
    const mockCountryNews = {
      countryCode: "JP",
      articles: [
        { id: "c1", rank: 1, sourceName: "BBC", sourceUrl: "", originalTitle: "", titleJa: "JP記事", summaryJa: "要約", countryCode: "JP", latitude: 35, longitude: 139, category: "general", publishedAt: null, fetchDate: "2026-02-23" },
      ],
    };
    vi.mocked(getNewsByCountry).mockResolvedValue(mockCountryNews);

    await useNewsStore.getState().fetchCountryNews("JP");

    const state = useNewsStore.getState();
    expect(state.countryArticles).toHaveLength(1);
    expect(state.countryArticles[0].titleJa).toBe("JP記事");
    expect(state.isLoadingCountry).toBe(false);
    // fetchCountryNews は selectedCountryCode を変更しない（selectCountry の責務）
    expect(state.selectedCountryCode).toBeNull();
  });

  it("fetchCountryNews: ローディング中はisLoadingCountryがtrue", async () => {
    let resolveFn: (value: unknown) => void;
    vi.mocked(getNewsByCountry).mockImplementation(
      () => new Promise((resolve) => { resolveFn = resolve; })
    );

    const promise = useNewsStore.getState().fetchCountryNews("US");
    expect(useNewsStore.getState().isLoadingCountry).toBe(true);

    resolveFn!({ countryCode: "US", articles: [] });
    await promise;
    expect(useNewsStore.getState().isLoadingCountry).toBe(false);
  });

  it("fetchCountryNews: エラー時にerrorをセットしisLoadingCountryをfalseにする", async () => {
    vi.mocked(getNewsByCountry).mockRejectedValue(new Error("fail"));

    await useNewsStore.getState().fetchCountryNews("JP");

    const state = useNewsStore.getState();
    expect(state.error).toBe("国別ニュースの取得に失敗しました。");
    expect(state.isLoadingCountry).toBe(false);
  });

  it("fetchNewsByDate: selectedCountryCodeもリセットする", async () => {
    useNewsStore.setState({ selectedCountryCode: "JP", countryArticles: [{ id: "c1", rank: 1, sourceName: "", sourceUrl: "", originalTitle: "", titleJa: "", summaryJa: "", countryCode: "JP", latitude: 0, longitude: 0, category: "general", publishedAt: null, fetchDate: "2026-02-23" }] });
    vi.mocked(getNewsByDate).mockResolvedValue(mockTodayNews);

    await useNewsStore.getState().fetchNewsByDate("2026-02-23");

    expect(useNewsStore.getState().selectedCountryCode).toBeNull();
    expect(useNewsStore.getState().countryArticles).toHaveLength(0);
  });
});
