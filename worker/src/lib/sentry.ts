/**
 * Sentry エラートラッキングのヘルパ (L15).
 *
 * @sentry/cloudflare は nodejs_compat 必須で vitest-pool-workers と
 * 互換性問題があるため、軽量な toucan-js を採用。
 *
 * - 各リクエスト/cron で `createSentry(env, ctx)` してインスタンス取得
 * - DSN 未設定なら null を返し、呼び出し側で no-op
 * - release は SENTRY_RELEASE env var (CI で git SHA を渡す)
 */
import { type Options, Toucan } from "toucan-js";

interface SentryEnv {
  SENTRY_DSN?: string;
  SENTRY_RELEASE?: string;
}

// 引数の型は toucan-js から導出する。ExecutionContext 全体を要求すると Hono の
// c.executionCtx (tracing を持たない) が渡せず、workers-types 更新で型が壊れる。
// Toucan の context は waitUntil のみ要求する (toucan-js の Context 型)。
export function createSentry(
  env: SentryEnv,
  ctx?: Pick<Options, "request" | "context">,
): Toucan | null {
  if (!env.SENTRY_DSN) return null;
  return new Toucan({
    dsn: env.SENTRY_DSN,
    release: env.SENTRY_RELEASE || undefined,
    request: ctx?.request,
    context: ctx?.context,
    tracesSampleRate: 0,
  });
}
