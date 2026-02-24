CREATE TABLE IF NOT EXISTS daily_news (
    id TEXT PRIMARY KEY,
    fetch_date TEXT NOT NULL UNIQUE,
    total_articles_fetched INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news_articles (
    id TEXT PRIMARY KEY,
    daily_news_id TEXT NOT NULL REFERENCES daily_news(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    original_title TEXT NOT NULL,
    original_snippet TEXT NOT NULL,
    title_ja TEXT NOT NULL,
    summary_ja TEXT NOT NULL,
    country_code TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (daily_news_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_daily_news_date ON daily_news(fetch_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_daily ON news_articles(daily_news_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_country ON news_articles(country_code);
