import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTodayNews, getNewsByDate, getAvailableDates } from "../api";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTodayNews: /api/news/today を呼び出す", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fetchDate: "2026-02-23", articles: [] }),
    });

    const result = await getTodayNews();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/news/today")
    );
    expect(result.fetchDate).toBe("2026-02-23");
  });

  it("getNewsByDate: /api/news/{date} を呼び出す", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fetchDate: "2026-02-22", articles: [] }),
    });

    await getNewsByDate("2026-02-22");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/news/2026-02-22")
    );
  });

  it("getAvailableDates: /api/news/dates を呼び出す", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dates: ["2026-02-23"] }),
    });

    const result = await getAvailableDates();
    expect(result.dates).toEqual(["2026-02-23"]);
  });

  it("APIエラー時にErrorをthrowする", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(getTodayNews()).rejects.toThrow("API error: 404 Not Found");
  });
});
