# WorldPulse

世界ニュースを地図上に可視化するアプリ。6 つの RSS ソース（BBC / Guardian / Al Jazeera / NHK / CNN / DW）から記事を取得し、Gemini 2.5 Flash で日本語に翻訳・要約・国コード付与した上位 10 件を Cloudflare D1 に保存。React + Leaflet で世界地図上にカテゴリ別マーカー表示する。毎日 00:00 JST（15:00 UTC）に cron で自動更新。

- **本番（Frontend）**: https://worldpulse.pages.dev
- **API（Worker）**: worldpulse-api（Cloudflare Workers）

## スタック

- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Framer Motion + Leaflet（react-leaflet、地図タイルは CARTO `dark_nolabels`。無料キー `VITE_CARTO_KEY` が必要）
- 状態管理: TanStack Query v5（サーバー状態）+ Zustand（UI 状態）
- API Client: Hono RPC（型安全な `hc<AppType>()`）
- Worker: Hono on Cloudflare Workers + Drizzle ORM + toucan-js（Sentry）
- DB: Cloudflare D1（`daily_news` / `news_articles`）
- AI: Gemini 2.5 Flash（structured JSON output）
- 観測: Sentry（toucan-js）/ observability-tail (tail_consumers) → n8n obs-notify / Workers Observability
- パッケージマネージャ: Bun（ルート / `worker/` / `frontend/` にそれぞれ `bun.lock`。ルートは Biome・Husky・lint-staged のみ）。テストは vitest（worker は `@cloudflare/vitest-plugin`）

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
| `GET /api/news/dates` | 5分 + swr 1h | データ存在日の一覧 |
| `GET /api/news/country/:code` | 30分 | 国別履歴（ISO 3166-1 alpha-2） |
| `GET /api/news/:date` | 1時間 | 指定日のニュース |
| `GET /health` | — | 死活 |
| `POST /api/trigger` | — | RSS 取得〜D1 保存の手動実行（`X-Trigger-Secret` 必須） |
| `POST /api/_sentry-test` | — | Sentry 疎通確認用に意図的に throw する（`X-Trigger-Secret` 必須） |

`/api/*` は IP 単位の rate limit（60 req/min、Worker isolate 内 in-memory）と CORS（`worldpulse.pages.dev` のみ許可）が適用される。

### Sentry への例外集約

`app.onError` で HTTP 経路の未捕捉例外をまとめて `captureException` する（`worker/src/index.ts:63`）。`/api/trigger` と `/api/_sentry-test` は個別の try/catch も持っており、Sentry 送信自体が失敗してもレスポンスには影響させない。Gemini 呼び出しは失敗時に `RETRY_BACKOFF_MS` の待機を挟んでからリトライする。

## 開発

```bash
# Worker（--remote は本番 D1 に接続する。/api/trigger 等の書き込みも本番に反映される）
cd worker && bun install && bunx wrangler dev --remote --port 8787

# Frontend（VITE_API_BASE_URL 未設定なら http://localhost:8787 を直接叩く）
cd frontend && bun install && bun run dev
```

Worker の CORS は `worldpulse.pages.dev` のみ許可なので、ローカルでは vite proxy を足して `VITE_API_BASE_URL=`（空）にする。手順とローカル D1 シードは [CLAUDE.md](CLAUDE.md) を参照。

### 環境変数・シークレット

| 名前 | 置き場所 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | Worker secret | 記事の選定・翻訳 |
| `TRIGGER_SECRET` | Worker secret | `/api/trigger` / `/api/_sentry-test` の認証 |
| `OBS_NOTIFY_URL` | Worker secret（任意） | cron 失敗時の obs-notify 通知先 |
| `SENTRY_DSN` | Worker secret（任意） | Sentry 送信先（`SENTRY_RELEASE` は deploy 時に git SHA を `--var` で渡す） |
| `CORS_ORIGIN` | `worker/wrangler.toml` の `[vars]` | CORS 許可オリジン |
| `VITE_API_BASE_URL` | Frontend ビルド時（GitHub secret） | Worker の URL |
| `VITE_CARTO_KEY` | Frontend ビルド時（GitHub secret） | CARTO 地図タイルの無料キー。無いとタイルが「API KEY REQUIRED」の透かし画像になる |

## テスト・Lint

```bash
cd worker && bun run test    # vitest run（CI と同じ）。`bun test` は Bun 内蔵ランナーで vitest.config.ts を読まない
cd frontend && bunx vitest run
bunx @biomejs/biome check .
```

## デプロイ

main への push で `test.yml` が成功すると、`.github/workflows/deploy.yml` が Worker と Frontend を並列でデプロイする（2 ジョブに依存関係は無い）。失敗時は obs-notify に warning で通知。手動なら:

```bash
cd worker && bunx wrangler deploy
cd frontend && VITE_API_BASE_URL=<Worker の URL> VITE_CARTO_KEY=<キー> bun run build && bunx wrangler pages deploy dist --project-name=worldpulse
```

## 運用ルール

- main 直 commit 禁止、必ず PR 経由
- `GEMINI_API_KEY` などの Worker secret は `wrangler secret put` のみ。コードにコミットしない
- ローカル開発で vite proxy を `vite.config.ts` に追加した場合、コミット前に戻す
- 観測: `tail-errors.py --since 24h --script worldpulse-api` でエラー履歴を取得

詳細・既知 gotcha は [CLAUDE.md](CLAUDE.md) を参照。
