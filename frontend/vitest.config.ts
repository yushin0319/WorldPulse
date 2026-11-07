import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // vite8 + plugin-react6 では test ファイルへの JSX 変換が classic runtime に
  // フォールバックし `React is not defined` になる。esbuild で automatic を明示。
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    environment: "happy-dom",
    // msw 3 は fetch を Node の http 層で横取りするため、happy-dom の fetch が
    // 先に CORS プリフライト (OPTIONS) を送ってしまい本リクエストまで届かない。
    // テスト環境では同一オリジンポリシーを無効化して msw 2 と同じ挙動に揃える。
    environmentOptions: {
      happyDOM: {
        settings: { fetch: { disableSameOriginPolicy: true } },
      },
    },
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
