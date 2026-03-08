// M12: Rate Limiting
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { newsRoutes } from "../routes/news";
import type { Env } from "../types";

async function initDb() {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS daily_news (id TEXT PRIMARY KEY, fetch_date TEXT NOT NULL UNIQUE, total_articles_fetched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS news_articles (id TEXT PRIMARY KEY, daily_news_id TEXT NOT NULL REFERENCES daily_news(id) ON DELETE CASCADE, rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10), source_name TEXT NOT NULL, source_url TEXT NOT NULL, original_title TEXT NOT NULL, original_snippet TEXT NOT NULL, title_ja TEXT NOT NULL, summary_ja TEXT NOT NULL, country_code TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, category TEXT NOT NULL DEFAULT 'general', published_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (daily_news_id, rank))",
  );
}

describe("M12: Rate Limiting", () => {
  beforeEach(async () => {
    await initDb();
    await env.DB.exec("DELETE FROM news_articles");
    await env.DB.exec("DELETE FROM daily_news");
  });

  function createRateLimitApp() {
    const localRateLimitMap = new Map<
      string,
      { count: number; resetAt: number }
    >();
    const rlApp = new Hono<{ Bindings: Env }>();
    rlApp.use("/api/*", async (c, next) => {
      const ip = c.req.header("cf-connecting-ip") ?? "unknown";
      const now = Date.now();
      const entry = localRateLimitMap.get(ip);
      if (entry && now < entry.resetAt) {
        if (entry.count >= 60) {
          return c.json({ error: "Too many requests" }, 429);
        }
        entry.count++;
      } else {
        localRateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
      }
      await next();
    });
    rlApp.route("/api/news", newsRoutes);
    return rlApp;
  }

  it("60回以内のリクエストは通過する", async () => {
    const rlApp = createRateLimitApp();
    const envBindings = { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" };
    const reqInit = { headers: { "cf-connecting-ip": "10.0.0.1" } };

    const res = await rlApp.request("/api/news/today", reqInit, envBindings);
    expect(res.status).not.toBe(429);
  });

  it("61回目のリクエストは429 Too Many Requests を返す", async () => {
    const rlApp = createRateLimitApp();
    const envBindings = { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" };
    const reqInit = { headers: { "cf-connecting-ip": "10.0.0.2" } };

    // 60回送る（全て通過するはず）
    for (let i = 0; i < 60; i++) {
      const res = await rlApp.request("/api/news/today", reqInit, envBindings);
      expect(res.status).not.toBe(429);
    }

    // 61回目は429
    const res61 = await rlApp.request("/api/news/today", reqInit, envBindings);
    expect(res61.status).toBe(429);
    const body = (await res61.json()) as { error: string };
    expect(body.error).toBe("Too many requests");
  });

  it("異なるIPは独立してカウントされる", async () => {
    const rlApp = createRateLimitApp();
    const envBindings = { DB: env.DB, GEMINI_API_KEY: "", CORS_ORIGIN: "*" };

    // IP A で60回
    for (let i = 0; i < 60; i++) {
      await rlApp.request(
        "/api/news/today",
        { headers: { "cf-connecting-ip": "10.0.0.3" } },
        envBindings,
      );
    }

    // IP B の1回目は通過する
    const resB = await rlApp.request(
      "/api/news/today",
      { headers: { "cf-connecting-ip": "10.0.0.4" } },
      envBindings,
    );
    expect(resB.status).not.toBe(429);
  });
});
