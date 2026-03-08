import { setupServer } from "msw/node";

// テストごとに server.use() でハンドラを追加する
// afterEach で server.resetHandlers() が呼ばれ自動リセット
export const server = setupServer();
