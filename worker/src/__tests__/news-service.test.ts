import {
  describe,
  it,
  expect,
  beforeEach,
} from "vitest";
import {
  env,
} from "cloudflare:test";
import {
  saveDailyNews,
  getTodayNews,
  getNewsByDate,
  getAvailableDates,
  getJstDateString,
} from "../services/news";
import type { RssArticle, GeminiSelectedArticle } from "../types";

// テスト前にスキーマを適用
async function initDb() {
  await env.DB.exec("CREATE TABLE IF NOT EXISTS daily_news (id TEXT PRIMARY KEY, fetch_date TEXT NOT NULL UNIQUE, total_articles_fetched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
  await env.DB.exec("CREATE TABLE IF NOT EXISTS news_articles (id TEXT PRIMARY KEY, daily_news_id TEXT NOT NULL REFERENCES daily_news(id) ON DELETE CASCADE, rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10), source_name TEXT NOT NULL, source_url TEXT NOT NULL, original_title TEXT NOT NULL, original_snippet TEXT NOT NULL, title_ja TEXT NOT NULL, summary_ja TEXT NOT NULL, country_code TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, category TEXT NOT NULL DEFAULT 'general', published_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (daily_news_id, rank))");
}

// テストデータ
const mockArticles: RssArticle[] = [
  {
    title: "Test Article One",
    snippet: "Snippet one",
    url: "http://example.com/1",
    source: "BBC",
    publishedAt: "2026-02-23T00:00:00Z",
  },
  {
    title: "Test Article Two",
    snippet: "Snippet two",
    url: "http://example.com/2",
    source: "CNN",
    publishedAt: null,
  },
];

const mockSelected: GeminiSelectedArticle[] = [
  {
    index: 0,
    country_code: "JP",
    lat: 35.6762,
    lng: 139.6503,
    title_ja: "テスト記事1",
    summary_ja: "テスト要約1",
    category: "general",
  },
  {
    index: 1,
    country_code: "US",
    lat: 38.9072,
    lng: -77.0369,
    title_ja: "テスト記事2",
    summary_ja: "テスト要約2",
    category: "politics",
  },
];

describe("getJstDateString", () => {
  it("UTCの日付にJST (+9h) オフセットを加えた日付文字列を返す", () => {
    // 22:00 UTC = 翌日07:00 JST → JSTでは翌日
    const result = getJstDateString(new Date("2026-02-23T22:00:00Z"));
    expect(result).toBe("2026-02-24");
  });

  it("UTC 14:59 (JST 23:59) はまだ同日", () => {
    const result = getJstDateString(new Date("2026-02-23T14:59:00Z"));
    expect(result).toBe("2026-02-23");
  });

  it("UTC 15:00 (JST 翌日00:00) は翌日になる", () => {
    const result = getJstDateString(new Date("2026-02-23T15:00:00Z"));
    expect(result).toBe("2026-02-24");
  });

  it("引数なしで現在時刻のJST日付を返す", () => {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const expected = jst.toISOString().slice(0, 10);
    expect(getJstDateString()).toBe(expected);
  });
});

describe("D1 ニュースサービス", () => {
  beforeEach(async () => {
    await initDb();
    // テーブルをクリア
    await env.DB.exec("DELETE FROM news_articles");
    await env.DB.exec("DELETE FROM daily_news");
  });

  it("saveDailyNews: 記事を保存し取得できる", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const result = await getTodayNews(env.DB);
    expect(result).not.toBeNull();
    expect(result!.totalArticlesFetched).toBe(2);
    expect(result!.articles).toHaveLength(2);
    expect(result!.articles[0].titleJa).toBe("テスト記事1");
    expect(result!.articles[0].countryCode).toBe("JP");
    expect(result!.articles[1].titleJa).toBe("テスト記事2");
    expect(result!.articles[1].rank).toBe(2);
  });

  it("getNewsByDate: 指定日のニュースを取得できる", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);
    const today = getJstDateString();

    const result = await getNewsByDate(env.DB, today);
    expect(result).not.toBeNull();
    expect(result!.articles).toHaveLength(2);
  });

  it("getNewsByDate: 存在しない日付はnullを返す", async () => {
    const result = await getNewsByDate(env.DB, "2000-01-01");
    expect(result).toBeNull();
  });

  it("getTodayNews: データがない場合はnullを返す", async () => {
    const result = await getTodayNews(env.DB);
    expect(result).toBeNull();
  });

  it("getAvailableDates: 日付一覧を返す", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const result = await getAvailableDates(env.DB);
    expect(result.dates).toHaveLength(1);
    expect(result.dates[0]).toBe(getJstDateString());
  });

  it("getAvailableDates: データがない場合は空配列を返す", async () => {
    const result = await getAvailableDates(env.DB);
    expect(result.dates).toHaveLength(0);
  });

  it("saveDailyNews: 同日の重複保存はスキップされる", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);
    // 2回目の保存は重複チェックでスキップされる
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const result = await getTodayNews(env.DB);
    expect(result).not.toBeNull();
    // スキップされているので1日分のみ
    expect(result!.articles).toHaveLength(2);
  });

  it("saveDailyNews: selectedのindexが範囲外の場合はスキップされる", async () => {
    const outOfRangeSelected: GeminiSelectedArticle[] = [
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "正常",
        summary_ja: "テスト",
        category: "general",
      },
      {
        index: 99, // mockArticlesには2件しかないので範囲外
        country_code: "US",
        lat: 38.0,
        lng: -77.0,
        title_ja: "範囲外",
        summary_ja: "テスト",
        category: "general",
      },
    ];
    await saveDailyNews(env.DB, mockArticles, outOfRangeSelected);

    const result = await getTodayNews(env.DB);
    expect(result).not.toBeNull();
    // index=99の記事はスキップされ1件のみ
    expect(result!.articles).toHaveLength(1);
    expect(result!.articles[0].titleJa).toBe("正常");
  });

  it("saveDailyNews: 不正なURLは空文字列にサニタイズされる", async () => {
    const articlesWithBadUrl: RssArticle[] = [
      {
        title: "Bad URL",
        snippet: "Test",
        url: "javascript:alert(1)",
        source: "Test",
        publishedAt: null,
      },
    ];
    const selected: GeminiSelectedArticle[] = [
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
      },
    ];
    await saveDailyNews(env.DB, articlesWithBadUrl, selected);

    const result = await getTodayNews(env.DB);
    expect(result).not.toBeNull();
    expect(result!.articles[0].sourceUrl).toBe("");
  });

  it("saveDailyNews: selected配列が空の場合も正常に動作する", async () => {
    await saveDailyNews(env.DB, mockArticles, []);

    const result = await getTodayNews(env.DB);
    expect(result).not.toBeNull();
    expect(result!.totalArticlesFetched).toBe(2);
    expect(result!.articles).toHaveLength(0);
  });
});
