import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../index";
import { notifyObs } from "../lib/obs-notify";
import type { Env } from "../types";

const SECRET = "webhook-secret-for-test";

/** Service binding の偽物。fetch の呼び出しを記録し、指定した応答を返す */
function fakeBinding(respond: () => Response | Promise<Response>) {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    respond(),
  );
  return { binding: { fetch } as unknown as Fetcher, fetch };
}

/** 偽の binding が受け取った呼び出しを Request に組み立て直す */
function sentRequest(fetch: ReturnType<typeof fakeBinding>["fetch"], n = 0) {
  const [input, init] = fetch.mock.calls[n];
  return new Request(input, init);
}

const okResponse = () =>
  Response.json({ success: true, notion: { ok: true }, discord: null });

describe("notifyObs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("binding 経由で /obs-notify に合言葉付きで POST する", async () => {
    const { binding, fetch } = fakeBinding(okResponse);

    await notifyObs(
      { OBS: binding, OBS_WEBHOOK_SECRET: SECRET },
      {
        severity: "warning",
        subject: "件名",
        summary: "本文",
        raw_payload: { a: 1 },
      },
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    const req = sentRequest(fetch);
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/obs-notify");
    expect(req.headers.get("X-Webhook-Secret")).toBe(SECRET);
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual({
      severity: "warning",
      subject: "件名",
      summary: "本文",
      raw_payload: { a: 1 },
      service: "cf-worker",
      repo: "WorldPulse",
    });
  });

  it("合言葉が未設定なら送らない", async () => {
    const { binding, fetch } = fakeBinding(okResponse);

    await notifyObs(
      { OBS: binding, OBS_WEBHOOK_SECRET: undefined },
      { severity: "warning", subject: "件名" },
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("binding が無ければ送らず、例外も投げない", async () => {
    await expect(
      notifyObs(
        { OBS: undefined, OBS_WEBHOOK_SECRET: SECRET },
        { severity: "warning", subject: "件名" },
      ),
    ).resolves.toBeUndefined();
  });

  it("送信が例外で失敗しても投げずに console.error に残す", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { binding } = fakeBinding(() => {
      throw new Error("binding down");
    });

    await expect(
      notifyObs(
        { OBS: binding, OBS_WEBHOOK_SECRET: SECRET },
        { severity: "critical", subject: "件名" },
      ),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "obs-notify failed:",
      expect.any(Error),
    );
  });

  it("2xx 以外の応答は console.error にステータスを残す (403 を黙って捨てない)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { binding } = fakeBinding(() => new Response(null, { status: 403 }));

    await notifyObs(
      { OBS: binding, OBS_WEBHOOK_SECRET: SECRET },
      { severity: "warning", subject: "件名" },
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain("HTTP 403");
  });
});

describe("scheduled から obs-notify への配線", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("RSS が 0 件なら OBS binding に warning を送る", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 全 RSS フィードの取得を失敗させて 0 件にする (binding の fetch は別物なので影響しない)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );
    const { binding, fetch } = fakeBinding(okResponse);
    const pending: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (p: Promise<unknown>) => pending.push(p),
      passThroughOnException: () => {},
    } as unknown as ExecutionContext;
    const testEnv: Env = {
      DB: env.DB,
      GEMINI_API_KEY: "",
      CORS_ORIGIN: "*",
      OBS: binding,
      OBS_WEBHOOK_SECRET: SECRET,
    };

    await worker.scheduled({} as ScheduledEvent, testEnv, ctx);
    await Promise.all(pending);

    expect(fetch).toHaveBeenCalledTimes(1);
    const req = sentRequest(fetch);
    expect(req.headers.get("X-Webhook-Secret")).toBe(SECRET);
    expect(await req.json()).toMatchObject({
      severity: "warning",
      subject: "WorldPulse Cron: RSS 取得 0 件",
      service: "cf-worker",
      repo: "WorldPulse",
    });
  });
});
