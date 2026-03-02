import type {
  DailyNewsResponse,
  NewsArticle,
  NewsCategory,
  AvailableDatesResponse,
  RssArticle,
  GeminiSelectedArticle,
  PreviousArticle,
  CountryNewsResponse,
} from "../types";

// 今日（or最新日）のニュース取得
export async function getTodayNews(
  db: D1Database
): Promise<DailyNewsResponse | null> {
  const row = await db
    .prepare(
      "SELECT id, fetch_date, total_articles_fetched FROM daily_news ORDER BY fetch_date DESC LIMIT 1"
    )
    .first<{ id: string; fetch_date: string; total_articles_fetched: number }>();

  if (!row) return null;

  const articles = await getArticlesByDailyId(db, row.id);
  return {
    fetchDate: row.fetch_date,
    totalArticlesFetched: row.total_articles_fetched,
    articles,
  };
}

// 指定日のニュース取得
export async function getNewsByDate(
  db: D1Database,
  date: string
): Promise<DailyNewsResponse | null> {
  const row = await db
    .prepare(
      "SELECT id, fetch_date, total_articles_fetched FROM daily_news WHERE fetch_date = ?"
    )
    .bind(date)
    .first<{ id: string; fetch_date: string; total_articles_fetched: number }>();

  if (!row) return null;

  const articles = await getArticlesByDailyId(db, row.id);
  return {
    fetchDate: row.fetch_date,
    totalArticlesFetched: row.total_articles_fetched,
    articles,
  };
}

// データ存在日一覧（直近30日）
export async function getAvailableDates(
  db: D1Database
): Promise<AvailableDatesResponse> {
  const { results } = await db
    .prepare(
      "SELECT fetch_date FROM daily_news ORDER BY fetch_date DESC LIMIT 30"
    )
    .all<{ fetch_date: string }>();

  return { dates: results.map((r) => r.fetch_date) };
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

// 日次ニュース保存（INSERT OR IGNOREによるアトミック重複チェック + バッチ書込）
export async function saveDailyNews(
  db: D1Database,
  allArticles: RssArticle[],
  selected: GeminiSelectedArticle[]
): Promise<void> {
  const today = getJstDateString();
  const dailyId = crypto.randomUUID();

  // INSERT OR IGNORE — fetch_dateのUNIQUE制約違反時はアトミックにスキップ
  const dailyResult = await db
    .prepare(
      "INSERT OR IGNORE INTO daily_news (id, fetch_date, total_articles_fetched) VALUES (?, ?, ?)"
    )
    .bind(dailyId, today, allArticles.length)
    .run();

  if (dailyResult.meta.changes === 0) {
    console.log(`Already processed ${today}, skipping`);
    return;
  }

  // news_articles をバッチで書込
  const stmts: D1PreparedStatement[] = [];

  const articleStmt = db.prepare(
    `INSERT INTO news_articles (id, daily_news_id, rank, source_name, source_url, original_title, original_snippet, title_ja, summary_ja, country_code, latitude, longitude, category, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i];
    const original = allArticles[item.index];
    if (!original) continue;

    stmts.push(
      articleStmt.bind(
        crypto.randomUUID(),
        dailyId,
        i + 1,
        original.source,
        sanitizeUrl(original.url),
        original.title,
        original.snippet,
        item.title_ja,
        item.summary_ja,
        item.country_code,
        item.lat,
        item.lng,
        item.category.toLowerCase(),
        original.publishedAt ?? null
      )
    );
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
}

// 過去N日分の選択済み記事を取得（重複排除用）
interface RecentArticleRow {
  title_ja: string;
  original_title: string;
  fetch_date: string;
}

export async function getRecentArticles(
  db: D1Database,
  days: number = 3
): Promise<PreviousArticle[]> {
  const today = getJstDateString();

  const { results } = await db
    .prepare(
      `SELECT na.title_ja, na.original_title, dn.fetch_date
       FROM news_articles na
       JOIN daily_news dn ON na.daily_news_id = dn.id
       WHERE dn.fetch_date < ?
       ORDER BY dn.fetch_date DESC
       LIMIT ?`
    )
    .bind(today, days * 10)
    .all<RecentArticleRow>();

  return results.map((r) => ({
    titleJa: r.title_ja,
    originalTitle: r.original_title,
    fetchDate: r.fetch_date,
  }));
}

// 国別ニュース履歴取得（全日付横断）
interface CountryArticleRow extends NewsArticleRow {
  fetch_date: string;
}

export async function getNewsByCountry(
  db: D1Database,
  countryCode: string
): Promise<CountryNewsResponse> {
  const { results } = await db
    .prepare(
      `SELECT na.id, na.rank, na.source_name, na.source_url, na.original_title,
              na.title_ja, na.summary_ja, na.country_code, na.latitude, na.longitude,
              na.category, na.published_at, dn.fetch_date
       FROM news_articles na
       JOIN daily_news dn ON na.daily_news_id = dn.id
       WHERE na.country_code = ?
       ORDER BY dn.fetch_date DESC, na.rank ASC LIMIT 100`
    )
    .bind(countryCode)
    .all<CountryArticleRow>();

  return {
    countryCode,
    articles: results.map((r) => ({ ...rowToArticle(r), fetchDate: r.fetch_date })),
  };
}

// ヘルパー: DB行からNewsArticleオブジェクトを生成
interface NewsArticleRow {
  id: string;
  rank: number;
  source_name: string;
  source_url: string;
  original_title: string;
  title_ja: string;
  summary_ja: string;
  country_code: string;
  latitude: number;
  longitude: number;
  category: string;
  published_at: string | null;
}

function rowToArticle(r: NewsArticleRow): NewsArticle {
  return {
    id: r.id,
    rank: r.rank,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    originalTitle: r.original_title,
    titleJa: r.title_ja,
    summaryJa: r.summary_ja,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    category: r.category as NewsCategory,
    publishedAt: r.published_at,
  };
}

// ヘルパー: daily_news_id で記事一覧取得（必要カラムのみ）
async function getArticlesByDailyId(
  db: D1Database,
  dailyId: string
): Promise<NewsArticle[]> {
  const { results } = await db
    .prepare(
      `SELECT id, rank, source_name, source_url, original_title,
              title_ja, summary_ja, country_code, latitude, longitude,
              category, published_at
       FROM news_articles WHERE daily_news_id = ? ORDER BY rank ASC`
    )
    .bind(dailyId)
    .all<NewsArticleRow>();

  return results.map(rowToArticle);
}
