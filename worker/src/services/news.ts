import { desc, eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dailyNews, newsArticles } from "../db/schema";
import { queryD1 } from "../lib/d1-wrapper";
import type {
  AvailableDatesResponse,
  CountryNewsResponse,
  DailyNewsResponse,
  GeminiSelectedArticle,
  NewsArticle,
  NewsCategory,
  PreviousArticle,
  RssArticle,
} from "../types";

// 今日（or最新日）のニュース取得
export async function getTodayNews(
  d1: D1Database,
): Promise<DailyNewsResponse | null> {
  const db = drizzle(d1);
  const rows = await queryD1("daily_news.latest", () =>
    db
      .select({
        id: dailyNews.id,
        fetchDate: dailyNews.fetchDate,
        totalArticlesFetched: dailyNews.totalArticlesFetched,
      })
      .from(dailyNews)
      .orderBy(desc(dailyNews.fetchDate))
      .limit(1),
  );

  const row = rows[0];
  if (!row) return null;

  const articles = await getArticlesByDailyId(d1, row.id);
  return {
    fetchDate: row.fetchDate,
    totalArticlesFetched: row.totalArticlesFetched,
    articles,
  };
}

// 指定日のニュース取得
export async function getNewsByDate(
  d1: D1Database,
  date: string,
): Promise<DailyNewsResponse | null> {
  const db = drizzle(d1);
  const rows = await queryD1("daily_news.by_date", () =>
    db
      .select({
        id: dailyNews.id,
        fetchDate: dailyNews.fetchDate,
        totalArticlesFetched: dailyNews.totalArticlesFetched,
      })
      .from(dailyNews)
      .where(eq(dailyNews.fetchDate, date))
      .limit(1),
  );

  const row = rows[0];
  if (!row) return null;

  const articles = await getArticlesByDailyId(d1, row.id);
  return {
    fetchDate: row.fetchDate,
    totalArticlesFetched: row.totalArticlesFetched,
    articles,
  };
}

// データ存在日一覧（直近30日）
export async function getAvailableDates(
  d1: D1Database,
): Promise<AvailableDatesResponse> {
  const db = drizzle(d1);
  const rows = await queryD1("daily_news.available_dates", () =>
    db
      .select({ fetchDate: dailyNews.fetchDate })
      .from(dailyNews)
      .orderBy(desc(dailyNews.fetchDate))
      .limit(30),
  );

  return { dates: rows.map((r) => r.fetchDate) };
}

// JST (UTC+9) の日付文字列を返す
export function getJstDateString(now?: Date): string {
  const d = now ?? new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// URLプロトコル検証（http/httpsのみ許可）
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
    return "";
  } catch {
    return "";
  }
}

// 日次ニュース保存（UNIQUE制約によるアトミック重複チェック + バッチ書込）
export async function saveDailyNews(
  d1: D1Database,
  allArticles: RssArticle[],
  selected: GeminiSelectedArticle[],
): Promise<void> {
  const today = getJstDateString();
  const dailyId = crypto.randomUUID();

  // アトミックな重複チェック: fetch_date の UNIQUE 制約違反でスキップ
  const db = drizzle(d1);
  try {
    await queryD1("daily_news.insert", () =>
      db.insert(dailyNews).values({
        id: dailyId,
        fetchDate: today,
        totalArticlesFetched: allArticles.length,
      }),
    );
  } catch (e) {
    // fetch_date の UNIQUE 制約違反 = 同日データ既存 → スキップ
    // D1 本番は "UNIQUE constraint failed"、miniflare は "Failed query" を返す
    if (e instanceof Error && /UNIQUE|Failed query/.test(e.message)) {
      console.log(`Already processed ${today}, skipping`);
      return;
    }
    throw e;
  }

  // news_articles をバッチで書込
  const articleValues = selected
    .map((item, i) => {
      const original = allArticles[item.index];
      if (!original) return null;
      return {
        id: crypto.randomUUID(),
        dailyNewsId: dailyId,
        rank: i + 1,
        sourceName: original.source,
        sourceUrl: sanitizeUrl(original.url),
        originalTitle: original.title,
        originalSnippet: original.snippet,
        titleJa: item.title_ja,
        summaryJa: item.summary_ja,
        countryCode: item.country_code,
        latitude: item.lat,
        longitude: item.lng,
        category: item.category.toLowerCase(),
        publishedAt: original.publishedAt ?? null,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (articleValues.length > 0) {
    // D1 はバインドパラメータ100個制限のため、1件ずつ insert を batch() で送信
    const stmts = articleValues.map((v) => db.insert(newsArticles).values(v));
    await queryD1("news_articles.batch", () =>
      db.batch(stmts as [(typeof stmts)[0], ...typeof stmts]),
    );
  }
}

// 過去N日分の選択済み記事を取得（重複排除用）
export async function getRecentArticles(
  d1: D1Database,
  days: number = 3,
): Promise<PreviousArticle[]> {
  const today = getJstDateString();
  const db = drizzle(d1);

  const rows = await queryD1("news_articles.recent", () =>
    db
      .select({
        titleJa: newsArticles.titleJa,
        originalTitle: newsArticles.originalTitle,
        fetchDate: dailyNews.fetchDate,
      })
      .from(newsArticles)
      .innerJoin(dailyNews, eq(newsArticles.dailyNewsId, dailyNews.id))
      .where(lt(dailyNews.fetchDate, today))
      .orderBy(desc(dailyNews.fetchDate))
      .limit(days * 10),
  );

  return rows.map((r) => ({
    titleJa: r.titleJa,
    originalTitle: r.originalTitle,
    fetchDate: r.fetchDate,
  }));
}

// 共通: newsArticles の select 列
const articleColumns = {
  id: newsArticles.id,
  rank: newsArticles.rank,
  sourceName: newsArticles.sourceName,
  sourceUrl: newsArticles.sourceUrl,
  originalTitle: newsArticles.originalTitle,
  titleJa: newsArticles.titleJa,
  summaryJa: newsArticles.summaryJa,
  countryCode: newsArticles.countryCode,
  latitude: newsArticles.latitude,
  longitude: newsArticles.longitude,
  category: newsArticles.category,
  publishedAt: newsArticles.publishedAt,
};

// 共通: DB行 → NewsArticle マッピング
function toArticle(r: {
  id: string;
  rank: number;
  sourceName: string;
  sourceUrl: string;
  originalTitle: string;
  titleJa: string;
  summaryJa: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  category: string;
  publishedAt: string | null;
}): NewsArticle {
  return { ...r, category: r.category as NewsCategory };
}

// 国別ニュース履歴取得（全日付横断）
export async function getNewsByCountry(
  d1: D1Database,
  countryCode: string,
): Promise<CountryNewsResponse> {
  const db = drizzle(d1);

  const rows = await queryD1("news_articles.by_country", () =>
    db
      .select({ ...articleColumns, fetchDate: dailyNews.fetchDate })
      .from(newsArticles)
      .innerJoin(dailyNews, eq(newsArticles.dailyNewsId, dailyNews.id))
      .where(eq(newsArticles.countryCode, countryCode))
      .orderBy(desc(dailyNews.fetchDate), newsArticles.rank)
      .limit(100),
  );

  return {
    countryCode,
    articles: rows.map((r) => ({ ...toArticle(r), fetchDate: r.fetchDate })),
  };
}

// ヘルパー: daily_news_id で記事一覧取得
async function getArticlesByDailyId(
  d1: D1Database,
  dailyId: string,
): Promise<NewsArticle[]> {
  const db = drizzle(d1);

  const rows = await queryD1("news_articles.by_daily_id", () =>
    db
      .select(articleColumns)
      .from(newsArticles)
      .where(eq(newsArticles.dailyNewsId, dailyId))
      .orderBy(newsArticles.rank),
  );

  return rows.map(toArticle);
}
