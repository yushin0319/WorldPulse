import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../mocks/server";
import { getAvailableDates, getNewsByDate, getTodayNews } from "../api";

const API_BASE = "http://localhost:8787";

describe("API client", () => {
  it("getTodayNews: /api/news/today を呼び出す", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${API_BASE}/api/news/today`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ fetchDate: "2026-02-23", articles: [] });
      }),
    );

    const result = await getTodayNews();
    expect(capturedUrl).toContain("/api/news/today");
    expect(result.fetchDate).toBe("2026-02-23");
  });

  it("getNewsByDate: /api/news/{date} を呼び出す", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${API_BASE}/api/news/2026-02-22`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ fetchDate: "2026-02-22", articles: [] });
      }),
    );

    await getNewsByDate("2026-02-22");
    expect(capturedUrl).toContain("/api/news/2026-02-22");
  });

  it("getAvailableDates: /api/news/dates を呼び出す", async () => {
    server.use(
      http.get(`${API_BASE}/api/news/dates`, () =>
        HttpResponse.json({ dates: ["2026-02-23"] }),
      ),
    );

    const result = await getAvailableDates();
    expect(result.dates).toEqual(["2026-02-23"]);
  });

  it("APIエラー時にErrorをthrowする", async () => {
    server.use(
      http.get(
        `${API_BASE}/api/news/today`,
        () => new HttpResponse(null, { status: 404, statusText: "Not Found" }),
      ),
    );

    await expect(getTodayNews()).rejects.toThrow("API error: 404");
  });

  it("500エラー時もErrorをthrowする", async () => {
    server.use(
      http.get(
        `${API_BASE}/api/news/today`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: "Internal Server Error",
          }),
      ),
    );

    await expect(getTodayNews()).rejects.toThrow("API error: 500");
  });

  it("ネットワーク切断時（fetch throw）にErrorが伝播する", async () => {
    server.use(
      http.get(`${API_BASE}/api/news/today`, () => HttpResponse.error()),
    );

    await expect(getTodayNews()).rejects.toThrow();
  });

  it("レスポンスがJSONでない場合にErrorが伝播する", async () => {
    server.use(
      http.get(
        `${API_BASE}/api/news/today`,
        () => new HttpResponse("not json", { status: 200 }),
      ),
    );

    await expect(getTodayNews()).rejects.toThrow();
  });
});
