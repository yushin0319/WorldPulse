import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// vitest-pool-workers 0.16.x (vitest 4 対応) で API 刷新。
// defineWorkersConfig + poolOptions.workers は廃止され、cloudflareTest を
// plugin として渡す方式に変わった。
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.toml" } })],
});
