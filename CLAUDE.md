# WorldPulse

世界ニュース地図ビジュアライゼーションアプリ。

## 技術スタック
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion
- State: TanStack Query v5（サーバー状態） + Zustand（UI状態のみ）
- API Client: Hono RPC（`hc<AppType>()`で型安全）
- Backend: Hono on Cloudflare Workers
- ORM: Drizzle ORM（D1ドライバー、`worker/src/db/schema.ts`）
- DB: Cloudflare D1 (SQLite)
- Map: react-leaflet + Leaflet (CartoDB Dark Matter tiles)
- AI: Gemini 2.5 Flash (日次RSS選定+翻訳)

## アーキテクチャ
- `shared/api.ts`: フロントエンド↔ワーカー間の型共有（`AppType` re-export）
- `frontend/src/hooks/useNewsQueries.ts`: TanStack Queryフック（クエリキーファクトリパターン）
- `frontend/src/stores/newsStore.ts`: UI状態のみ（selectedArticleId, selectedCountryCode, selectedDate）
- `worker/src/db/schema.ts`: Drizzleスキーマ定義（`daily_news`, `news_articles`）
- `worker/src/services/news.ts`: Drizzleクエリビルダーでデータアクセス

## 開発コマンド
- Worker: `cd worker && npm run dev`
- Frontend: `cd frontend && npm run dev`
- Worker テスト: `cd worker && npm test`
- Frontend テスト: `cd frontend && npx vitest run`
- D1 スキーマ適用: `wrangler d1 execute worldpulse --file=database/schema.sql --remote`

## ローカル開発（UI確認）

### 起動手順
1. Worker を起動（本番D1に接続）:
   ```bash
   cd worker && npx wrangler dev --remote --port 8787
   ```
2. Frontend を起動:
   ```bash
   cd frontend && npm run dev
   ```
3. vite.config.ts にプロキシを追加（CORS回避）:
   ```ts
   server: {
     proxy: {
       "/api": "http://localhost:8787",
     },
   },
   ```
4. frontend/.env.local を作成:
   ```
   VITE_API_BASE_URL=
   ```
   （空にすることで相対パス `/api/...` → viteプロキシ経由でWorkerへ）

### 注意事項
- `wrangler dev --remote` は本番D1に**読み取り**アクセスする（本番Workerには影響なし、ターミナル閉じたら消える）
- `.dev.vars` は `wrangler.toml` の `[vars]` を上書き**できない**（`--var` フラグも同様）
- CORS回避にはviteプロキシが唯一の確実な方法
- `wrangler dev`（--remoteなし）はローカルSQLite使用。テストデータが必要な場合:
  ```bash
  npx wrangler d1 execute worldpulse --local --file=database/schema.sql
  ```
- **コミット前に vite.config.ts のプロキシ設定を戻すこと**（本番ビルドには不要）

## Lint / Format
- **Biome** で lint + format + import sort を統一管理（`biome.json`）
- `npx @biomejs/biome check .` で全チェック、`--write` で自動修正
- pre-commit hook で `biome check --staged` が自動実行される
- CI（test.yml）でも lint ジョブが走る
- ESLint / Prettier は使わない

## ルール
- TDD: テストを先に書く
- main直接コミット禁止、PR経由でマージ
- Gemini API Key は wrangler secret のみ、コードに含めない
