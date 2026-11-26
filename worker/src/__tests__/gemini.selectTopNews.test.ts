// C1/C2: selectTopNews
import { afterEach, describe, expect, it, vi } from "vitest";
import { type GeminiEnv, selectTopNews } from "../services/gemini";

const RELAY_URL =
  "https://gemini-relay/v1beta/models/gemini-2.5-flash:generateContent";

const VALID_GEMINI_RESPONSE = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify([
              {
                index: 0,
                country_code: "US",
                lat: 40,
                lng: -74,
                title_ja: "テスト",
                summary_ja: "テスト要約",
                category: "general",
              },
            ]),
          },
        ],
      },
    },
  ],
});

const ONE_ARTICLE = [
  {
    title: "Test",
    snippet: "test",
    url: "https://example.com",
    source: "Test",
    publishedAt: null,
  },
];

/** gemini-relay の偽物を持つ env。Gemini はこの fetch 経由でだけ呼ばれる */
function relayEnv(
  impl: (url: string, init: RequestInit) => Promise<Response>,
): { env: GeminiEnv; relayFetch: ReturnType<typeof vi.fn> } {
  const relayFetch = vi.fn(impl);
  return {
    env: {
      GEMINI_API_KEY: "my-secret-key",
      GEMINI_RELAY: { fetch: relayFetch } as unknown as Fetcher,
    },
    relayFetch,
  };
}

const ok = () =>
  Promise.resolve(new Response(VALID_GEMINI_RESPONSE, { status: 200 }));

describe("selectTopNews", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("Gemini は中継の fetch でだけ呼び、キーは URL ではなく x-goog-api-key ヘッダで送る", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    const { env, relayFetch } = relayEnv(ok);

    const result = await selectTopNews(ONE_ARTICLE, env);

    expect(result.length).toBe(1);
    expect(globalFetch).not.toHaveBeenCalled();
    expect(relayFetch).toHaveBeenCalledTimes(1);
    const [url, init] = relayFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(RELAY_URL);
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe(
      "my-secret-key",
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("中継の応答の cf-placement を毎回ログに残す", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { env } = relayEnv(() =>
      Promise.resolve(
        new Response(VALID_GEMINI_RESPONSE, {
          status: 200,
          headers: { "cf-placement": "remote-IAD" },
        }),
      ),
    );

    await selectTopNews(ONE_ARTICLE, env);

    const lines = log.mock.calls
      .map(([line]) => String(line))
      .filter((line) => line.includes('"gemini_relay"'));
    expect(lines.map((line) => JSON.parse(line))).toEqual([
      { type: "gemini_relay", status: 200, placement: "remote-IAD" },
    ]);
  });

  it("1 回目が失敗したら、10 秒待って中継で送り直す", async () => {
    vi.useFakeTimers();
    const { env, relayFetch } = relayEnv(ok);
    relayFetch.mockResolvedValueOnce(new Response("{}", { status: 503 }));

    const promise = selectTopNews(ONE_ARTICLE, env);
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result.length).toBe(1);
    expect(relayFetch.mock.calls.map(([url]) => url)).toEqual([
      RELAY_URL,
      RELAY_URL,
    ]);
  });

  it("180秒タイムアウトで両方の試行が失敗するとエラーをスロー", async () => {
    vi.useFakeTimers();
    const { env } = relayEnv(
      (_url, init) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(
              new DOMException(
                "signal is aborted without reason",
                "AbortError",
              ),
            );
          });
        }),
    );

    const promise = selectTopNews([], env);
    // reject ハンドラを advance より先に登録する。fake timer の advance 中に
    // promise が reject されると、expect().rejects 登録前に settle して
    // vitest4 が一瞬 unhandled rejection と判定するため。
    const expectation = expect(promise).rejects.toThrow();
    // 1回目タイムアウト(180s) + リトライ前バックオフ(10s) + 2回目タイムアウト(180s)
    await vi.advanceTimersByTimeAsync(180_001);
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(180_001);
    await expectation;
  });

  it("179秒では応答できればタイムアウトしない", async () => {
    vi.useFakeTimers();
    const { env } = relayEnv(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
          setTimeout(() => {
            resolve(new Response(VALID_GEMINI_RESPONSE, { status: 200 }));
          }, 179_000);
        }),
    );

    const promise = selectTopNews(ONE_ARTICLE, env);
    await vi.advanceTimersByTimeAsync(179_000);
    const result = await promise;
    expect(result.length).toBe(1);
  });
});
