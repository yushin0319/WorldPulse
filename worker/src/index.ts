import * as Sentry from "@sentry/cloudflare";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { newsRoutes } from "./routes/news";
import { selectTopNews } from "./services/gemini";
import { getRecentArticles, saveDailyNews } from "./services/news";
import { fetchAndProcessNews } from "./services/rss";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Rate Limiting（1分間に最大 RATE_LIMIT_MAX_REQUESTS リクエスト/IP）
// CF Workers は isolate 単位で Map を保持するため in-memory が現実的な選択。
// isolate が再起動されると Map はリセットされる（許容できる動作）。
const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAP_CLEANUP_THRESHOLD = 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
app.use("/api/*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return c.json({ error: "Too many requests" }, 429);
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }
  // 古いエントリのクリーンアップ（RATE_LIMIT_MAP_CLEANUP_THRESHOLD 件超過時）
  if (rateLimitMap.size > RATE_LIMIT_MAP_CLEANUP_THRESHOLD) {
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetAt) rateLimitMap.delete(key);
    }
  }
  await next();
});

// CORS（本番ドメインのみ許可）
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN;
      if (origin === allowed) return origin;
      return "";
    },
  }),
);

// Routes（Hono RPC 型推論のため route() の戻り値から型をエクスポート）
const newsRoute = app.route("/api/news", newsRoutes);
export type AppType = typeof newsRoute;

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/", (c) => c.json({ app: "WorldPulse API", status: "ok" }));

// 手動トリガー用（認証必須）
app.post("/api/trigger", async (c) => {
  const secret = c.req.header("X-Trigger-Secret");
  if (!c.env.TRIGGER_SECRET || secret !== c.env.TRIGGER_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const articles = await fetchAndProcessNews();
    if (articles.length === 0) {
      return c.json({ error: "No articles fetched" }, 500);
    }
    const previousArticles = await getRecentArticles(c.env.DB, 3);
    const selected = await selectTopNews(
      articles,
      c.env.GEMINI_API_KEY,
      previousArticles,
    );
    if (selected.length === 0) {
      return c.json(
        { error: "Gemini returned no results", totalFetched: articles.length },
        500,
      );
    }
    await saveDailyNews(c.env.DB, articles, selected);
    return c.json({
      ok: true,
      totalFetched: articles.length,
      selected: selected.length,
      previousArticlesUsed: previousArticles.length,
    });
  } catch (e) {
    console.error("Trigger failed:", e);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Discord通知（エラー時のみ使用）
async function notifyDiscord(
  webhookUrl: string,
  message: string,
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.error("Discord notification failed:", e);
  }
}

// L15: Sentry でラップ。SENTRY_DSN 未設定なら no-op (lazy init)。
// release は CI が SENTRY_RELEASE 環境変数で git SHA を渡す。
const handler = {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const startTime = Date.now();
        try {
          const articles = await fetchAndProcessNews();
          if (articles.length === 0) {
            const msg =
              "WorldPulse Cron: RSS取得0件。全フィードが失敗した可能性あり";
            console.error(msg);
            if (env.DISCORD_WEBHOOK_URL)
              await notifyDiscord(env.DISCORD_WEBHOOK_URL, msg);
            return;
          }

          const previousArticles = await getRecentArticles(env.DB, 3);
          const selected = await selectTopNews(
            articles,
            env.GEMINI_API_KEY,
            previousArticles,
          );
          if (selected.length === 0) {
            const msg = `WorldPulse Cron: Gemini選定0件（リトライ含む）。RSS ${articles.length}件取得済み`;
            console.error(msg);
            if (env.DISCORD_WEBHOOK_URL)
              await notifyDiscord(env.DISCORD_WEBHOOK_URL, msg);
            return;
          }

          await saveDailyNews(env.DB, articles, selected);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(
            `Saved ${selected.length} articles from ${articles.length} total (dedup: ${previousArticles.length} previous, ${elapsed}s)`,
          );
        } catch (e) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const errorMsg = e instanceof Error ? e.message : String(e);
          const msg = `WorldPulse Cron failed (${elapsed}s): ${errorMsg}`;
          console.error(msg);
          // L15: Sentry にも投げる（DSN 未設定なら withSentry が no-op 化）
          Sentry.captureException(e);
          if (env.DISCORD_WEBHOOK_URL)
            await notifyDiscord(env.DISCORD_WEBHOOK_URL, msg);
        }
      })(),
    );
  },
};

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN ?? "",
    release: env.SENTRY_RELEASE ?? undefined,
    tracesSampleRate: 0.1,
    enabled: Boolean(env.SENTRY_DSN),
  }),
  handler,
);
