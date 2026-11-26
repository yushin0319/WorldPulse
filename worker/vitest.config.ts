import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// @cloudflare/vitest-pool-workers は v1 で @cloudflare/vitest-plugin に改名された。
// vitest 5 の module-evaluator.js には文字列 "createRequire(import.meta.url)" があり、
// 旧 module registry 用の fallback は import.meta.url を文字列の中まで一括置換するため
// workerd 起動時に SyntaxError: Unexpected identifier 'file' になる
// (cloudflare/workers-sdk#15618)。new_module_registry では置換しない fallback
// (V2) を通るので、テスト実行時だけこのフラグを付ける。本番 (wrangler.toml) は変更しない。
//
// wrangler.toml の Service binding `OBS` (observability-tail) と `GEMINI_RELAY` (gemini-relay) は
// テスト環境に相手の Worker が無いと workerd が起動しないので、差し替える。
// OBS は何もしない応答、GEMINI_RELAY は使われたら分かるよう 503 にする。
// 送信内容を確かめるテストは自前の偽物を渡す (src/__tests__/obs-notify.test.ts / gemini.selectTopNews.test.ts)。
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        compatibilityFlags: ["new_module_registry"],
        serviceBindings: {
          OBS: () => new Response(null, { status: 204 }),
          GEMINI_RELAY: () => new Response(null, { status: 503 }),
        },
      },
    }),
  ],
});
