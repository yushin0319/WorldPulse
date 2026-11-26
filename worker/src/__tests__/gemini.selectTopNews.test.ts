// C1/C2: selectTopNews
import { afterEach, describe, expect, it, vi } from "vitest";
import { selectTopNews } from "../services/gemini";

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

describe("selectTopNews (中継 gemini-relay 経由)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("中継を渡すと中継の fetch で Gemini を呼び、グローバル fetch は使わない", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    const relayFetch = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(VALID_GEMINI_RESPONSE, { status: 200 }),
    );

    const result = await selectTopNews(
      ONE_ARTICLE,
      "my-secret-key",
      undefined,
      {
        fetch: relayFetch,
      } as unknown as Fetcher,
    );

    expect(result.length).toBe(1);
    expect(globalFetch).not.toHaveBeenCalled();
    expect(relayFetch).toHaveBeenCalledTimes(1);
    const [url, init] = relayFetch.mock.calls[0];
    // 中継はパスだけを見て generativelanguage.googleapis.com に送る
    expect(new URL(url).pathname).toBe(
      "/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(url).not.toContain("my-secret-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "my-secret-key",
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("中継経由で 1 回目が失敗したら、10 秒待って中継で送り直す", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
    const relayFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(VALID_GEMINI_RESPONSE, { status: 200 }),
      );

    const promise = selectTopNews(ONE_ARTICLE, "test-key", undefined, {
      fetch: relayFetch,
    } as unknown as Fetcher);
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result.length).toBe(1);
    expect(relayFetch).toHaveBeenCalledTimes(2);
  });
});

describe("selectTopNews", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("APIキーがURLパラメータではなくx-goog-api-keyヘッダーで送信される", async () => {
    let capturedUrl: string | undefined;
    let capturedHeaders: Record<string, string> | undefined;

    // 有効な結果を返して1回目で早期returnさせ、リトライ前バックオフを回避する
    const validResult = JSON.stringify([
      {
        index: 0,
        country_code: "US",
        lat: 40,
        lng: -74,
        title_ja: "テスト",
        summary_ja: "テスト要約",
        category: "general",
      },
    ]);

    vi.stubGlobal("fetch", (url: string, opts: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = opts.headers as Record<string, string>;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: validResult }] } }],
          }),
          { status: 200 },
        ),
      );
    });

    const articles = [
      {
        title: "Test",
        snippet: "test",
        url: "https://example.com",
        source: "Test",
        publishedAt: null,
      },
    ];
    await selectTopNews(articles, "my-secret-key");

    expect(capturedUrl).toBeDefined();
    expect(capturedUrl).not.toContain("my-secret-key");
    expect(capturedHeaders?.["x-goog-api-key"]).toBe("my-secret-key");
  });

  it("180秒タイムアウトで両方の試行が失敗するとエラーをスロー", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      (_url: string, opts: RequestInit) =>
        new Promise<Response>((_, reject) => {
          opts.signal?.addEventListener("abort", () => {
            reject(
              new DOMException(
                "signal is aborted without reason",
                "AbortError",
              ),
            );
          });
        }),
    );

    const promise = selectTopNews([], "test-key");
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

    // 有効な結果を返す（リトライ不要にする）
    const validResult = JSON.stringify([
      {
        index: 0,
        country_code: "US",
        lat: 40,
        lng: -74,
        title_ja: "テスト",
        summary_ja: "テスト要約",
        category: "general",
      },
    ]);

    vi.stubGlobal("fetch", (_url: string, opts: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        opts.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
        setTimeout(() => {
          resolve(
            new Response(
              JSON.stringify({
                candidates: [{ content: { parts: [{ text: validResult }] } }],
              }),
              { status: 200 },
            ),
          );
        }, 179_000);
      });
    });

    const articles = [
      {
        title: "Test",
        snippet: "test",
        url: "https://example.com",
        source: "Test",
        publishedAt: null,
      },
    ];
    const promise = selectTopNews(articles, "test-key");
    await vi.advanceTimersByTimeAsync(179_000);
    const result = await promise;
    expect(result.length).toBe(1);
  });
});
