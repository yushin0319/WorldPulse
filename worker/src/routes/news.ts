import { Hono } from "hono";
import {
  getAvailableDates,
  getNewsByCountry,
  getNewsByDate,
  getTodayNews,
} from "../services/news";
import type { Env } from "../types";

const CACHE_SHORT = "public, max-age=300, stale-while-revalidate=3600"; // 5分 + swr1時間
const CACHE_MEDIUM = "public, max-age=1800"; // 30分
const CACHE_LONG = "public, max-age=3600"; // 1時間

// Hono RPC 用にメソッドチェインで定義（型推論に必要）
export const newsRoutes = new Hono<{ Bindings: Env }>()
  // 今日（or最新日）のニュース — 5分キャッシュ + stale-while-revalidate
  .get("/today", async (c) => {
    const result = await getTodayNews(c.env.DB);
    if (!result) {
      return c.json({ error: "No news data available" }, 404);
    }
    c.header("Cache-Control", CACHE_SHORT);
    return c.json(result);
  })
  // データ存在日一覧 — 5分キャッシュ
  .get("/dates", async (c) => {
    const result = await getAvailableDates(c.env.DB);
    c.header("Cache-Control", CACHE_SHORT);
    return c.json(result);
  })
  // 国別ニュース履歴 — 30分キャッシュ
  .get("/country/:code", async (c) => {
    const code = c.req.param("code");
    if (!/^[A-Z]{2}$/.test(code)) {
      return c.json(
        {
          error:
            "Invalid country code. Use 2 uppercase letters (ISO 3166-1 alpha-2)",
        },
        400,
      );
    }
    const result = await getNewsByCountry(c.env.DB, code);
    c.header("Cache-Control", CACHE_MEDIUM);
    return c.json(result);
  })
  // 指定日のニュース — 過去日は不変なので1時間キャッシュ
  .get("/:date", async (c) => {
    const date = c.req.param("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
    }
    const result = await getNewsByDate(c.env.DB, date);
    if (!result) {
      return c.json({ error: `No news data for ${date}` }, 404);
    }
    c.header("Cache-Control", CACHE_LONG);
    return c.json(result);
  });
