"""wrangler d1 execute --json の出力をINSERT SQLに変換する"""

import io
import json
import sys

# Windows cp932 エンコードエラー回避
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def esc(v):
    """SQLエスケープ"""
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    if len(sys.argv) != 3:
        print("Usage: python json-to-seed.py <daily.json> <articles.json>", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        daily_rows = json.load(f)[0]["results"]

    with open(sys.argv[2], encoding="utf-8") as f:
        article_rows = json.load(f)[0]["results"]

    print(f"-- seed-data.sql: Generated from production D1")
    print(f"-- {len(daily_rows)} days, {len(article_rows)} articles")
    print()
    print("DELETE FROM news_articles;")
    print("DELETE FROM daily_news;")
    print()

    for r in daily_rows:
        print(
            f"INSERT INTO daily_news (id, fetch_date, total_articles_fetched, created_at)"
            f" VALUES ({esc(r['id'])}, {esc(r['fetch_date'])},"
            f" {r['total_articles_fetched']}, {esc(r['created_at'])});"
        )

    print()

    cols = (
        "id", "daily_news_id", "rank", "source_name", "source_url",
        "original_title", "original_snippet", "title_ja", "summary_ja",
        "country_code", "latitude", "longitude", "category",
        "published_at", "created_at",
    )
    num_cols = {"rank", "latitude", "longitude"}

    for r in article_rows:
        vals = []
        for c in cols:
            v = r[c]
            if c in num_cols:
                vals.append(str(v))
            else:
                vals.append(esc(v))
        print(f"INSERT INTO news_articles ({', '.join(cols)}) VALUES ({', '.join(vals)});")


if __name__ == "__main__":
    main()
