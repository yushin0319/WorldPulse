import { env } from "cloudflare:test";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { beforeEach, describe, expect, it } from "vitest";
import { newsRoutes } from "../routes/news";
import { getJstDateString, saveDailyNews } from "../services/news";
import type { Env, GeminiSelectedArticle, RssArticle } from "../types";

// テスト用Honoアプリ
const app = new Hono<{ Bindings: Env }>();
app.route("/api/news", newsRoutes);

async function initDb() {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS daily_news (id TEXT PRIMARY KEY, fetch_date TEXT NOT NULL UNIQUE, total_articles_fetched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS news_articles (id TEXT PRIMARY KEY, daily_news_id TEXT NOT NULL REFERENCES daily_news(id) ON DELETE CASCADE, rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10), source_name TEXT NOT NULL, source_url TEXT NOT NULL, original_title TEXT NOT NULL, original_snippet TEXT NOT NULL, title_ja TEXT NOT NULL, summary_ja TEXT NOT NULL, country_code TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, category TEXT NOT NULL DEFAULT 'general', published_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (daily_news_id, rank))",
  );
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
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.articles).toHaveLength(1);
    expect(body.articles[0].titleJa).toBe("テスト");
  });

  it("GET /api/news/today: Cache-Controlヘッダーが設定される", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const res = await app.request(
      "/api/news/today",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=3600",
    );
  });

  it("GET /api/news/today: データがない場合404を返す", async () => {
    const res = await app.request(
      "/api/news/today",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(404);
  });

  it("GET /api/news/:date: 不正な日付形式は400を返す", async () => {
    const res = await app.request(
      "/api/news/invalid",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(400);
  });

  it("GET /api/news/:date: 存在しない日付は404を返す", async () => {
    const res = await app.request(
      "/api/news/2000-01-01",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(404);
  });

  it("GET /api/news/dates: 日付一覧を返す", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);

    const res = await app.request(
      "/api/news/dates",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dates).toHaveLength(1);
  });

  it("GET /api/news/:date: 過去日にはmax-age=3600のCache-Controlが設定される", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);
    const today = getJstDateString();

    const res = await app.request(
      `/api/news/${today}`,
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("GET /api/news/country/:code: 正しい国コードで200を返す", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);
    const res = await app.request(
      "/api/news/country/JP",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      countryCode: string;
      articles: unknown[];
    };
    expect(body.countryCode).toBe("JP");
    expect(body.articles).toHaveLength(1);
  });

  it("GET /api/news/country/:code: 小文字の国コードは400を返す", async () => {
    const res = await app.request(
      "/api/news/country/jp",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(400);
  });

  it("GET /api/news/country/:code: 3文字コードは400を返す", async () => {
    const res = await app.request(
      "/api/news/country/JPN",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(400);
  });

  it("GET /api/news/country/:code: 該当記事なしでも200で空配列を返す", async () => {
    const res = await app.request(
      "/api/news/country/ZZ",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { articles: unknown[] };
    expect(body.articles).toHaveLength(0);
  });

  it("GET /api/news/country/:code: Cache-Controlが1800秒に設定される", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);
    const res = await app.request(
      "/api/news/country/JP",
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=1800");
  });

  it("GET /api/news/:date: country追加後も正常に動作する", async () => {
    await saveDailyNews(env.DB, mockArticles, mockSelected);
    const today = getJstDateString();
    const res = await app.request(
      `/api/news/${today}`,
      {},
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    expect(res.status).toBe(200);
  });
});

describe("M4: CORS ワイルドカード除去", () => {
  beforeEach(async () => {
    await initDb();
    await env.DB.exec("DELETE FROM news_articles");
    await env.DB.exec("DELETE FROM daily_news");
  });

  it("CORS_ORIGIN='*' でも任意のオリジンを許可しない", async () => {
    const corsApp = new Hono<{ Bindings: Env }>();
    corsApp.use(
      "/api/*",
      cors({
        origin: (origin, c) => {
          const allowed = c.env.CORS_ORIGIN;
          if (origin === allowed) return origin;
          return "";
        },
      }),
    );
    corsApp.route("/api/news", newsRoutes);

    const res = await corsApp.request(
      "/api/news/today",
      { headers: { Origin: "https://evil.example.com" } },
      { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" },
    );
    // CORS_ORIGIN="*" でも "https://evil.example.com" !== "*" なので許可されない
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("CORS_ORIGIN が一致するオリジンは許可される", async () => {
    const corsApp = new Hono<{ Bindings: Env }>();
    corsApp.use(
      "/api/*",
      cors({
        origin: (origin, c) => {
          const allowed = c.env.CORS_ORIGIN;
          if (origin === allowed) return origin;
          return "";
        },
      }),
    );
    corsApp.route("/api/news", newsRoutes);

    await saveDailyNews(env.DB, mockArticles, mockSelected);
    const res = await corsApp.request(
      "/api/news/today",
      { headers: { Origin: "https://worldpulse.pages.dev" } },
      {
        DB: env.DB,
        GEMINI_API_KEY: "",
        CORS_ORIGIN: "https://worldpulse.pages.dev",
      },
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://worldpulse.pages.dev",
    );
  });
});
