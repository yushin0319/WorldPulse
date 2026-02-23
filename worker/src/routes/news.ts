import { Hono } from "hono";
import type { Env } from "../types";
import {
  getTodayNews,
  getNewsByDate,
  getAvailableDates,
} from "../services/news";

export const newsRoutes = new Hono<{ Bindings: Env }>();

// 今日（or最新日）のニュース
newsRoutes.get("/today", async (c) => {
  const result = await getTodayNews(c.env.DB);
  if (!result) {
    return c.json({ error: "No news data available" }, 404);
  }
  return c.json(result);
});

// データ存在日一覧（/:date より先に定義して優先マッチさせる）
newsRoutes.get("/dates", async (c) => {
  const result = await getAvailableDates(c.env.DB);
  return c.json(result);
});

// 指定日のニュース
newsRoutes.get("/:date", async (c) => {
  const date = c.req.param("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
  }
  const result = await getNewsByDate(c.env.DB, date);
  if (!result) {
    return c.json({ error: `No news data for ${date}` }, 404);
  }
  return c.json(result);
});
