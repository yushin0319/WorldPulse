import { Hono } from "hono";
import type { Env } from "../types";
import {
  getTodayNews,
  getNewsByDate,
  getAvailableDates,
} from "../services/news";

export const newsRoutes = new Hono<{ Bindings: Env }>();

// 今日（or最新日）のニュース — 5分キャッシュ + stale-while-revalidate
newsRoutes.get("/today", async (c) => {
  const result = await getTodayNews(c.env.DB);
  if (!result) {
    return c.json({ error: "No news data available" }, 404);
  }
  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return c.json(result);
});

// データ存在日一覧 — 5分キャッシュ
newsRoutes.get("/dates", async (c) => {
  const result = await getAvailableDates(c.env.DB);
  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return c.json(result);
});

// 指定日のニュース — 過去日は不変なので1時間キャッシュ
newsRoutes.get("/:date", async (c) => {
  const date = c.req.param("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
  }
  const result = await getNewsByDate(c.env.DB, date);
  if (!result) {
    return c.json({ error: `No news data for ${date}` }, 404);
  }
  c.header("Cache-Control", "public, max-age=3600");
  return c.json(result);
});
