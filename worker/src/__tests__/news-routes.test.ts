import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import type { Env } from "../types";
import { newsRoutes } from "../routes/news";
import { saveDailyNews } from "../services/news";
import type { RssArticle, GeminiSelectedArticle } from "../types";

// テスト用Honoアプリ
const app = new Hono<{ Bindings: Env }>();
app.route("/api/news", newsRoutes);

async function initDb() {
  await env.DB.exec("CREATE TABLE IF NOT EXISTS daily_news (id TEXT PRIMARY KEY, fetch_date TEXT NOT NULL UNIQUE, total_articles_fetched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
  await env.DB.exec("CREATE TABLE IF NOT EXISTS news_articles (id TEXT PRIMARY KEY, daily_news_id TEXT NOT NULL REFERENCES daily_news(id) ON DELETE CASCADE, rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10), source_name TEXT NOT NULL, source_url TEXT NOT NULL, original_title TEXT NOT NULL, original_snippet TEXT NOT NULL, title_ja TEXT NOT NULL, summary_ja TEXT NOT NULL, country_code TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, category TEXT NOT NULL DEFAULT 'general', published_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (daily_news_id, rank))");
}

const mockArticles: RssArticle[] = [
  {
    title: "Test",
    snippet: "Snippet",
    url: "http://example.com",
    source: "BBC",
    publishedAt: null,
  },
];

const mockSelected: GeminiSelectedArticle[] = [
  {
    index: 0,
    country_code: "JP",
    lat: 35.6762,
    lng: 139.6503,
    title_ja: "テスト",
    summary_ja: "テスト要約",
    category: "general",
  },
];

describe("News API ルート", () => {
  beforeEach(async () => {
    await initDb();
    await env.DB.exec("DELETE FROM news_articles");
    await env.DB.exec("DELETE FROM daily_news");
  });

  it("GET /api/news/today: データがある場合200を返す", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const res = await app.request(
      "/api/news/today",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.articles).toHaveLength(1);
    expect(body.articles[0].titleJa).toBe("テスト");
  });

  it("GET /api/news/today: データがない場合404を返す", async () => {
    const res = await app.request(
      "/api/news/today",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" }
    );
    expect(res.status).toBe(404);
  });

  it("GET /api/news/:date: 不正な日付形式は400を返す", async () => {
    const res = await app.request(
      "/api/news/invalid",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" }
    );
    expect(res.status).toBe(400);
  });

  it("GET /api/news/:date: 存在しない日付は404を返す", async () => {
    const res = await app.request(
      "/api/news/2000-01-01",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" }
    );
    expect(res.status).toBe(404);
  });

  it("GET /api/news/dates: 日付一覧を返す", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const res = await app.request(
      "/api/news/dates",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dates).toHaveLength(1);
  });
});
