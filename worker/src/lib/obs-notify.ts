import type { Env } from "../types";

export interface ObsNotifyPayload {
  severity: "critical" | "warning" | "info";
  subject: string;
  summary?: string;
  raw_payload?: unknown;
}

// Service binding はホスト名を使わずパスだけを相手の Worker に渡す。ホスト名は任意の値でよい
const OBS_NOTIFY_ENDPOINT = "https://observability-tail/obs-notify";

/**
 * 観測性通知を observability-tail Worker の POST /obs-notify に送り、Notion 観測性 DB に記録させる。
 * 同じアカウントの Worker から workers.dev の URL へ fetch すると error 1042 で届かないため、
 * Service binding (`OBS`) 経由で呼ぶ。
 * binding か合言葉が無ければ送らない。送信に失敗しても例外は投げない (cron の本処理を止めない)。
 */
export async function notifyObs(
  env: Pick<Env, "OBS" | "OBS_WEBHOOK_SECRET">,
  payload: ObsNotifyPayload,
): Promise<void> {
  if (!env.OBS || !env.OBS_WEBHOOK_SECRET) return;
  try {
    const res = await env.OBS.fetch(OBS_NOTIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": env.OBS_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        ...payload,
        service: "cf-worker",
        repo: "WorldPulse",
      }),
    });
    if (!res.ok) {
      // 403 (合言葉の不一致) や 400 (本文の検証失敗) を黙って捨てない。
      // console.error は tail_consumers 経由で observability-tail にも拾われる
      const detail = (await res.text()).slice(0, 200);
      console.error(`obs-notify failed: HTTP ${res.status} ${detail}`.trim());
    }
  } catch (e) {
    console.error("obs-notify failed:", e);
  }
}
