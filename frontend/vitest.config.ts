import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // vite8 + plugin-react6 では test ファイルへの JSX 変換が classic runtime に
  // フォールバックし `React is not defined` になる。esbuild で automatic を明示。
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
