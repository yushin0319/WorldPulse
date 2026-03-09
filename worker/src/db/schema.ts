import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const dailyNews = sqliteTable(
  "daily_news",
  {
    id: text("id").primaryKey(),
    fetchDate: text("fetch_date").notNull().unique(),
    totalArticlesFetched: integer("total_articles_fetched")
      .notNull()
      .default(0),
    createdAt: text("created_at").notNull().default("(datetime('now'))"),
  },
  (table) => [index("idx_daily_news_date").on(table.fetchDate)],
);

export const newsArticles = sqliteTable(
  "news_articles",
  {
    id: text("id").primaryKey(),
    dailyNewsId: text("daily_news_id")
      .notNull()
      .references(() => dailyNews.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    originalTitle: text("original_title").notNull(),
    originalSnippet: text("original_snippet").notNull(),
    titleJa: text("title_ja").notNull(),
    summaryJa: text("summary_ja").notNull(),
    countryCode: text("country_code").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    category: text("category").notNull().default("general"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default("(datetime('now'))"),
  },
  (table) => [
    uniqueIndex("uq_daily_rank").on(table.dailyNewsId, table.rank),
    index("idx_news_articles_daily").on(table.dailyNewsId),
    index("idx_news_articles_country").on(table.countryCode),
  ],
);
