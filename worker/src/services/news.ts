import type {
  DailyNewsResponse,
  NewsArticle,
  AvailableDatesResponse,
  RssArticle,
  GeminiSelectedArticle,
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

// 日次ニュース保存（重複チェック + バッチ書込）
export async function saveDailyNews(
  db: D1Database,
  allArticles: RssArticle[],
  selected: GeminiSelectedArticle[]
): Promise<void> {
  const today = getJstDateString();

  // 既に同日のデータがあればスキップ
  const existing = await db
    .prepare("SELECT id FROM daily_news WHERE fetch_date = ?")
    .bind(today)
    .first();
  if (existing) {
    console.log(`Already processed ${today}, skipping`);
    return;
  }

  const dailyId = crypto.randomUUID();

  // daily_news + news_articles を一括バッチで書込（アトミック）
  const stmts: D1PreparedStatement[] = [];

  stmts.push(
    db
      .prepare(
        "INSERT INTO daily_news (id, fetch_date, total_articles_fetched) VALUES (?, ?, ?)"
      )
      .bind(dailyId, today, allArticles.length)
  );

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

  await db.batch(stmts);
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
    .all();

  return results.map((r) => ({
    id: r.id as string,
    rank: r.rank as number,
    sourceName: r.source_name as string,
    sourceUrl: r.source_url as string,
    originalTitle: r.original_title as string,
    titleJa: r.title_ja as string,
    summaryJa: r.summary_ja as string,
    countryCode: r.country_code as string,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    category: r.category as string,
    publishedAt: (r.published_at as string) ?? null,
  }));
}
