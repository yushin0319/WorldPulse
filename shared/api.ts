// Hono RPC 型契約 — Frontend はここから AppType を参照する
// Worker 内部パスへの直接依存を避けるための中間層
export type { AppType } from "../worker/src/index";
