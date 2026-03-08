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

describe("newsStore - fetchAvailableDates 高度な挙動", () => {
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

  it("fetchAvailableDates: fetchTodayNewsが先に完了していた場合、fetchDateを保持する", async () => {
    useNewsStore.setState({
      fetchDate: "2026-02-24",
      availableDates: ["2026-02-24"],
    });
    server.use(
      http.get(`${API_BASE}/api/news/dates`, () =>
        HttpResponse.json({ dates: ["2026-02-23", "2026-02-22"] }),
      ),
    );

    await useNewsStore.getState().fetchAvailableDates();

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
    server.use(
      http.get(`${API_BASE}/api/news/dates`, () =>
        HttpResponse.json({ dates: ["2026-02-24", "2026-02-23"] }),
      ),
    );

    await useNewsStore.getState().fetchAvailableDates();

    expect(useNewsStore.getState().availableDates).toEqual([
      "2026-02-24",
      "2026-02-23",
    ]);
  });

  it("fetchAvailableDates: エラー時もavailableDatesは変更されない", async () => {
    useNewsStore.setState({ availableDates: ["2026-02-23"] });
    server.use(
      http.get(
        `${API_BASE}/api/news/dates`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await useNewsStore.getState().fetchAvailableDates();

    expect(useNewsStore.getState().availableDates).toEqual(["2026-02-23"]);
    expect(useNewsStore.getState().error).toBe(
      "日付一覧の取得に失敗しました。",
    );
  });
});

describe("newsStore - 国パネル", () => {
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
      countryArticles: [
        {
          id: "1",
          rank: 1,
          sourceName: "BBC",
          sourceUrl: "",
          originalTitle: "",
          titleJa: "",
          summaryJa: "",
          countryCode: "JP",
          latitude: 0,
          longitude: 0,
          category: "general",
          publishedAt: null,
          fetchDate: "2026-02-23",
        },
      ],
    });

    useNewsStore.getState().selectCountry(null);

    expect(useNewsStore.getState().selectedCountryCode).toBeNull();
    expect(useNewsStore.getState().countryArticles).toHaveLength(0);
  });

  it("fetchCountryNews: 成功時にcountryArticlesをセットする", async () => {
    const mockCountryNews = {
      countryCode: "JP",
      articles: [
        {
          id: "c1",
          rank: 1,
          sourceName: "BBC",
          sourceUrl: "",
          originalTitle: "",
          titleJa: "JP記事",
          summaryJa: "要約",
          countryCode: "JP",
          latitude: 35,
          longitude: 139,
          category: "general",
          publishedAt: null,
          fetchDate: "2026-02-23",
        },
      ],
    };
    server.use(
      http.get(`${API_BASE}/api/news/country/JP`, () =>
        HttpResponse.json(mockCountryNews),
      ),
    );

    await useNewsStore.getState().fetchCountryNews("JP");

    const state = useNewsStore.getState();
    expect(state.countryArticles).toHaveLength(1);
    expect(state.countryArticles[0].titleJa).toBe("JP記事");
    expect(state.isLoadingCountry).toBe(false);
    expect(state.selectedCountryCode).toBeNull();
  });

  it("fetchCountryNews: ローディング中はisLoadingCountryがtrue", async () => {
    let resolveGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      resolveGate = resolve;
    });
    server.use(
      http.get(`${API_BASE}/api/news/country/US`, async () => {
        await gate;
        return HttpResponse.json({ countryCode: "US", articles: [] });
      }),
    );

    const promise = useNewsStore.getState().fetchCountryNews("US");
    expect(useNewsStore.getState().isLoadingCountry).toBe(true);

    resolveGate();
    await promise;
    expect(useNewsStore.getState().isLoadingCountry).toBe(false);
  });

  it("fetchCountryNews: エラー時にerrorをセットしisLoadingCountryをfalseにする", async () => {
    server.use(
      http.get(
        `${API_BASE}/api/news/country/JP`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await useNewsStore.getState().fetchCountryNews("JP");

    const state = useNewsStore.getState();
    expect(state.error).toBe("国別ニュースの取得に失敗しました。");
    expect(state.isLoadingCountry).toBe(false);
  });

  it("fetchNewsByDate: selectedCountryCodeもリセットする", async () => {
    useNewsStore.setState({
      selectedCountryCode: "JP",
      countryArticles: [
        {
          id: "c1",
          rank: 1,
          sourceName: "",
          sourceUrl: "",
          originalTitle: "",
          titleJa: "",
          summaryJa: "",
          countryCode: "JP",
          latitude: 0,
          longitude: 0,
          category: "general",
          publishedAt: null,
          fetchDate: "2026-02-23",
        },
      ],
    });
    server.use(
      http.get(`${API_BASE}/api/news/2026-02-23`, () =>
        HttpResponse.json(mockTodayNews),
      ),
    );

    await useNewsStore.getState().fetchNewsByDate("2026-02-23");

    expect(useNewsStore.getState().selectedCountryCode).toBeNull();
    expect(useNewsStore.getState().countryArticles).toHaveLength(0);
  });
});
