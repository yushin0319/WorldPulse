# WorldPulse

世界各地のニュースをリアルタイムに地図上で可視化するWebアプリケーション。

毎朝自動で6つの国際RSSソースからニュースを取得し、Gemini 2.5 Flashが重要度・地域多様性・カテゴリバランスを考慮してトップ10を選定。日本語に翻訳して2D世界地図上にマッピングします。

## Demo

https://worldpulse.pages.dev/

## Architecture

```
[Workers Cron Trigger 毎朝 7:00 JST]
  → RSS取得(6ソース) → Gemini 1回呼出 → D1書込

[ブラウザ]
  → Cloudflare Pages (React SPA)
    → Cloudflare Workers (Hono API)
      → D1 (SQLite)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (dark theme) |
| Animation | Framer Motion |
| Map | react-leaflet + Leaflet (CartoDB Dark Matter tiles) |
| State | Zustand |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| AI | Gemini 2.5 Flash (structured JSON output) |
| RSS | fast-xml-parser |
| CI | GitHub Actions (Vitest + TypeScript check) |

## RSS Sources

- BBC World
- Al Jazeera
- NHK World
- CNN World
- The Guardian World
- DW (Deutsche Welle)

## Features

- 世界地図上にパルスアニメーション付きマーカーでニュースを表示
- マーカーサイズはランク順（1-3位:大、4-7位:中、8-10位:小）
- カテゴリ別カラー（politics/conflict:赤、economy/tech:青、science/health:緑、その他:黄）
- クリックで日本語タイトル(~20文字) → 要約(~200文字)を表示
- 地図上の国をクリックして国別ニュース履歴を表示（GeoJSONポリゴン）
- 国旗画像表示（flagcdn.com CDN）
- 日付ナビゲーションで過去のニュースを閲覧可能
- レスポンシブ対応（PC:横並び / スマホ:縦積み）

## Development

### Prerequisites

- Node.js 22+
- Wrangler CLI (`npm install -g wrangler`)

### Setup

```bash
# Worker
cd worker && npm install

# Frontend
cd frontend && npm install
```

### Dev Server

```bash
# Worker (port 8787)
cd worker && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### Test

```bash
# Worker
cd worker && npm test

# Frontend
cd frontend && npx vitest run
```

### Deploy

```bash
# D1 schema
wrangler d1 execute worldpulse --file=database/schema.sql --remote

# Worker
cd worker && wrangler deploy

# Frontend
cd frontend && npm run build
wrangler pages deploy dist --project-name=worldpulse
```

### Secrets

```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put TRIGGER_SECRET
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/news/today` | 最新日のニュース10件 |
| GET | `/api/news/:date` | 指定日のニュース (YYYY-MM-DD) |
| GET | `/api/news/dates` | データ存在日一覧 |
| GET | `/api/news/country/:code` | 国別ニュース履歴 (ISO alpha-2) |
| POST | `/api/trigger` | 手動ニュース取得 (要認証) |
| GET | `/health` | ヘルスチェック |

## Cost

月額 ~$0.06 (Gemini API のみ。Cloudflare は全て無料枠内)

## License

MIT
