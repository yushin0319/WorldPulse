#!/usr/bin/env bash
# seed-local.sh — 本番D1から直近N日分のデータを取得してローカルD1にシード
#
# 使い方:
#   cd WorldPulse
#   bash database/seed-local.sh        # 直近3日分（デフォルト）
#   bash database/seed-local.sh 7      # 直近7日分
#
# 前提: wrangler がインストール済み、Cloudflare にログイン済み

set -euo pipefail

DAYS="${1:-3}"
DB_NAME="worldpulse"
# Git Bash の /c/Users → C:/Users に変換
to_win_path() { echo "$1" | sed 's|^/\([a-zA-Z]\)/|\1:/|'; }
SCRIPT_DIR="$(to_win_path "$(cd "$(dirname "$0")" && pwd)")"
WORKER_DIR="$SCRIPT_DIR/../worker"
SEED_FILE="$SCRIPT_DIR/seed-data.sql"
TMP_DAILY="$SCRIPT_DIR/.tmp-daily.json"
TMP_ARTICLES="$SCRIPT_DIR/.tmp-articles.json"

cleanup() { rm -f "$TMP_DAILY" "$TMP_ARTICLES"; }
trap cleanup EXIT

echo "=== 本番D1から直近${DAYS}日分のデータを取得 ==="

# 1. daily_news を取得
echo "Fetching daily_news..."
(cd "$WORKER_DIR" && npx wrangler d1 execute "$DB_NAME" --remote --json \
  --command "SELECT * FROM daily_news ORDER BY fetch_date DESC LIMIT $DAYS") > "$TMP_DAILY"

# 2. daily_news の id 一覧を抽出して news_articles を取得
DAILY_IDS=$(python -c "
import json
with open('$TMP_DAILY') as f:
    data = json.load(f)
rows = data[0]['results']
print(','.join(f\"'{r[\"id\"]}'\" for r in rows))
")

if [ -z "$DAILY_IDS" ]; then
  echo "Error: 本番にデータがありません"
  exit 1
fi

echo "Fetching news_articles..."
(cd "$WORKER_DIR" && npx wrangler d1 execute "$DB_NAME" --remote --json \
  --command "SELECT * FROM news_articles WHERE daily_news_id IN ($DAILY_IDS) ORDER BY daily_news_id, rank") > "$TMP_ARTICLES"

# 3. JSON → INSERT SQL に変換
echo "Generating seed SQL..."
python "$SCRIPT_DIR/json-to-seed.py" "$TMP_DAILY" "$TMP_ARTICLES" > "$SEED_FILE"

echo "Generated: $SEED_FILE ($(wc -l < "$SEED_FILE") lines)"

# 4. ローカルD1にインポート
echo "Importing to local D1..."
(cd "$WORKER_DIR" && npx wrangler d1 execute "$DB_NAME" --local --file "$SEED_FILE")

echo "=== シード完了！==="
echo ""
echo "ローカル開発手順:"
echo "  1. cd worker && npx wrangler dev"
echo "  2. cd frontend && npm run dev"
echo "  3. http://localhost:5173 で確認"
