import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { newsRoutes } from "./routes/news";
import { fetchAndProcessNews } from "./services/rss";
import { selectTopNews } from "./services/gemini";
import { saveDailyNews } from "./services/news";

const app = new Hono<{ Bindings: Env }>();

// CORS（本番ドメインのみ許可）
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN;
      if (origin === allowed || allowed === "*") return origin;
      return "";
    },
  })
);

// Routes
app.route("/api/news", newsRoutes);

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/", (c) => c.json({ app: "WorldPulse API", status: "ok" }));

// 手動トリガー用（認証必須）
app.post("/api/trigger", async (c) => {
  const secret = c.req.header("X-Trigger-Secret");
  if (!c.env.TRIGGER_SECRET || secret !== c.env.TRIGGER_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const articles = await fetchAndProcessNews();
  if (articles.length === 0) {
    return c.json({ error: "No articles fetched" }, 500);
  }
  const selected = await selectTopNews(articles, c.env.GEMINI_API_KEY);
  if (selected.length === 0) {
    return c.json({ error: "Gemini returned no results", totalFetched: articles.length }, 500);
  }
  await saveDailyNews(c.env.DB, articles, selected);
  return c.json({ ok: true, totalFetched: articles.length, selected: selected.length });
});

export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          const articles = await fetchAndProcessNews();
          if (articles.length === 0) {
            console.error("No articles fetched, skipping");
            return;
          }

          const selected = await selectTopNews(articles, env.GEMINI_API_KEY);
          if (selected.length === 0) {
            console.error("Gemini returned no results, skipping");
            return;
          }

          await saveDailyNews(env.DB, articles, selected);
          console.log(
            `Saved ${selected.length} articles from ${articles.length} total`
          );
        } catch (e) {
          console.error("Scheduled job failed:", e);
        }
      })()
    );
  },
};
