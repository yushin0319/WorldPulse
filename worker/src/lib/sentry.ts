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
import { Toucan } from "toucan-js";

interface SentryEnv {
  SENTRY_DSN?: string;
  SENTRY_RELEASE?: string;
}

export function createSentry(
  env: SentryEnv,
  ctx?: { request?: Request; context?: ExecutionContext },
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
