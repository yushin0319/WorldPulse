import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "../../mocks/server";
import { useNewsStore } from "../newsStore";

const API_BASE = "http://localhost:8787";

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
    server.use(
      http.get(`${API_BASE}/api/news/today`, () =>
        HttpResponse.json(mockTodayNews),
      ),
    );
    await useNewsStore.getState().fetchTodayNews();
    const state = useNewsStore.getState();
    expect(state.articles).toHaveLength(1);
    expect(state.fetchDate).toBe("2026-02-23");
    expect(state.totalArticlesFetched).toBe(50);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("fetchTodayNews: fetchDateがavailableDatesに含まれない場合、先頭に追加する", async () => {
    useNewsStore.setState({ availableDates: ["2026-02-23"] });
    const newData = { ...mockTodayNews, fetchDate: "2026-02-24" };
    server.use(
      http.get(`${API_BASE}/api/news/today`, () => HttpResponse.json(newData)),
    );
    await useNewsStore.getState().fetchTodayNews();
    const state = useNewsStore.getState();
    expect(state.fetchDate).toBe("2026-02-24");
    expect(state.availableDates).toEqual(["2026-02-24", "2026-02-23"]);
  });

  it("fetchTodayNews: fetchDateが既にavailableDatesにある場合、重複追加しない", async () => {
    useNewsStore.setState({ availableDates: ["2026-02-23", "2026-02-22"] });
    server.use(
      http.get(`${API_BASE}/api/news/today`, () =>
        HttpResponse.json(mockTodayNews),
      ),
    );
    await useNewsStore.getState().fetchTodayNews();
    expect(useNewsStore.getState().availableDates).toEqual([
      "2026-02-23",
      "2026-02-22",
    ]);
  });

  it("fetchTodayNews: エラー時にerrorをセットする", async () => {
    server.use(
      http.get(
        `${API_BASE}/api/news/today`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await useNewsStore.getState().fetchTodayNews();
    const state = useNewsStore.getState();
    expect(state.error).toBe(
      "ニュースの取得に失敗しました。時間をおいて再試行してください。",
    );
    expect(state.isLoading).toBe(false);
    expect(state.articles).toHaveLength(0);
  });

  it("fetchNewsByDate: 日付指定でデータを取得する", async () => {
    server.use(
      http.get(`${API_BASE}/api/news/2026-02-23`, () =>
        HttpResponse.json(mockTodayNews),
      ),
    );
    await useNewsStore.getState().fetchNewsByDate("2026-02-23");
    expect(useNewsStore.getState().articles).toHaveLength(1);
  });

  it("fetchNewsByDate: 選択中の記事をリセットする", async () => {
    useNewsStore.getState().selectArticle("old-id");
    server.use(
      http.get(`${API_BASE}/api/news/2026-02-23`, () =>
        HttpResponse.json(mockTodayNews),
      ),
    );
    await useNewsStore.getState().fetchNewsByDate("2026-02-23");
    expect(useNewsStore.getState().selectedArticleId).toBeNull();
  });

  it("fetchAvailableDates: 日付一覧を取得する", async () => {
    server.use(
      http.get(`${API_BASE}/api/news/dates`, () =>
        HttpResponse.json({ dates: ["2026-02-23", "2026-02-22"] }),
      ),
    );
    await useNewsStore.getState().fetchAvailableDates();
    expect(useNewsStore.getState().availableDates).toEqual([
      "2026-02-23",
      "2026-02-22",
    ]);
  });

  it("fetchNewsByDate: エラー時にerrorをセットしisFetchingをfalseにする", async () => {
    server.use(
      http.get(
        `${API_BASE}/api/news/2026-02-22`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await useNewsStore.getState().fetchNewsByDate("2026-02-22");
    const state = useNewsStore.getState();
    expect(state.error).toBe(
      "ニュースの取得に失敗しました。時間をおいて再試行してください。",
    );
    expect(state.isFetching).toBe(false);
  });

  it("fetchNewsByDate: isFetchingがtrueになりisLoadingはfalseのまま", async () => {
    // gate パターン: ハンドラがリクエストを受けても即座に返さず制御できる
    let resolveGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      resolveGate = resolve;
    });
    server.use(
      http.get(`${API_BASE}/api/news/2026-02-22`, async () => {
        await gate;
        return HttpResponse.json(mockTodayNews);
      }),
    );
    const promise = useNewsStore.getState().fetchNewsByDate("2026-02-22");
    // isFetchingはfetch開始直後に同期でtrueになる
    expect(useNewsStore.getState().isFetching).toBe(true);
    expect(useNewsStore.getState().isLoading).toBe(false);
    resolveGate();
    await promise;
    expect(useNewsStore.getState().isFetching).toBe(false);
  });
});
