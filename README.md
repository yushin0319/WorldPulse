# WorldPulse

世界ニュースを地図上に可視化するアプリ。6 つの RSS ソース（BBC / Guardian / Al Jazeera / NHK / CNN / DW）から記事を取得し、Gemini 2.5 Flash で日本語に翻訳・要約・国コード付与した上位 10 件を Cloudflare D1 に保存。React + Leaflet で世界地図上にカテゴリ別マーカー表示する。毎日 00:00 JST（15:00 UTC）に cron で自動更新。

- **本番（Frontend）**: https://worldpulse.pages.dev
- **API（Worker）**: worldpulse-api（Cloudflare Workers）

## スタック

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Leaflet
- 状態管理: TanStack Query v5（サーバー状態）+ Zustand（UI 状態）
- API Client: Hono RPC（型安全な `hc<AppType>()`）
- Worker: Hono on Cloudflare Workers + Drizzle ORM + toucan-js（Sentry）
- DB: Cloudflare D1（`daily_news` / `news_articles`）
- AI: Gemini 2.5 Flash（structured JSON output）
- 観測: Sentry / observability-tail (tail_consumers) / Workers Observability

## 構成

- `frontend/` — Vite + React SPA（Cloudflare Pages にデプロイ）
- `worker/` — Hono on Workers（API + RSS 取得 cron）
  - `src/routes/news.ts` — `/api/news/*` ハンドラ
  - `src/services/{rss,gemini,news}.ts` — RSS 取得 / Gemini 選定 / D1 アクセス
  - `src/db/schema.ts` — Drizzle スキーマ
  - `src/lib/{sentry,d1-wrapper}.ts` — Sentry 配線 / D1 ラッパー
- `shared/api.ts`, `shared/types.ts` — フロント↔worker 型共有
- `database/` — D1 スキーマ・seed スクリプト

## API

| Endpoint | キャッシュ | 用途 |
|---|---|---|
| `GET /api/news/today` | 5分 + swr 1h | 当日のニュース |
| `GET /api/news/dates` | 5分 | データ存在日の一覧 |
| `GET /api/news/country/:code` | 30分 | 国別履歴（ISO 3166-1 alpha-2） |
| `GET /api/news/:date` | 1時間 | 指定日のニュース |
| `GET /health` | — | 死活 |

`/api/*` は IP 単位の rate limit（60 req/min、Worker isolate 内 in-memory）と CORS（`worldpulse.pages.dev` のみ許可）が適用される。

## 開発

```bash
# Worker（本番 D1 に読み取り接続）
cd worker && bun install && bunx wrangler dev --remote --port 8787

# Frontend（vite proxy 経由で Worker へ）
cd frontend && bun install && bun run dev
```

ローカル D1 シード手順・CORS 回避用 vite proxy 設定は [CLAUDE.md](CLAUDE.md) を参照。

## テスト・Lint

```bash
cd worker && bun test
cd frontend && bunx vitest run
bunx @biomejs/biome check .
```

## デプロイ

main マージで自動（`.github/workflows/deploy.yml` が Worker → Frontend の順に走る）。手動なら:

```bash
cd worker && bunx wrangler deploy
cd frontend && bun run build && bunx wrangler pages deploy dist
```

## 運用ルール

- main 直 commit 禁止、必ず PR 経由
- `GEMINI_API_KEY` は `wrangler secret put` のみ。コードにコミットしない
- ローカル開発で vite proxy を `vite.config.ts` に追加した場合、コミット前に戻す
- 観測: `tail-errors.py --since 24h --script worldpulse-api` でエラー履歴を取得

詳細・既知 gotcha は [CLAUDE.md](CLAUDE.md) を参照。
