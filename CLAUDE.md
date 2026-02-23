# WorldPulse

世界ニュース地図ビジュアライゼーションアプリ。

## 技術スタック
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion
- Backend: Hono on Cloudflare Workers
- DB: Cloudflare D1 (SQLite)
- Map: react-simple-maps
- AI: Gemini 2.0 Flash (日次RSS選定+翻訳)

## 開発コマンド
- Worker: `cd worker && npm run dev`
- Frontend: `cd frontend && npm run dev`
- Worker テスト: `cd worker && npm test`
- Frontend テスト: `cd frontend && npx vitest run`
- D1 スキーマ適用: `wrangler d1 execute worldpulse --file=database/schema.sql --remote`

## ルール
- TDD: テストを先に書く
- main直接コミット禁止、PR経由でマージ
- Gemini API Key は wrangler secret のみ、コードに含めない
