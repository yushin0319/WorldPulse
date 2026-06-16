import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// vitest-pool-workers 0.16.x (vitest4) は cloudflareTest plugin 方式。
// 0.16.15 は workerd 上で @vitest/utils の assertTypes を exports map 経由で
// 解決できないため、deps.optimizer.ssr で @vitest/utils を pre-bundle して回避。
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.toml" } })],
  test: {
    deps: {
      optimizer: {
        ssr: { enabled: true, include: ["@vitest/utils"] },
      },
    },
  },
});
