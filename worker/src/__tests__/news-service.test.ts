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
    const today = new Date().toISOString().slice(0, 10);

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
    expect(result.dates[0]).toBe(new Date().toISOString().slice(0, 10));
  });

  it("getAvailableDates: データがない場合は空配列を返す", async () => {
    const result = await getAvailableDates(env.DB);
    expect(result.dates).toHaveLength(0);
  });
});
