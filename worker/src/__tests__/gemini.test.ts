import { describe, it, expect } from "vitest";
import { buildPrompt, parseGeminiResponse } from "../services/gemini";
import type { RssArticle } from "../types";

describe("buildPrompt", () => {
  it("記事一覧を正しいフォーマットでプロンプトに変換する", () => {
    const articles: RssArticle[] = [
      {
        title: "Test Article",
        snippet: "Test snippet",
        url: "http://example.com",
        source: "BBC",
        publishedAt: null,
      },
      {
        title: "Another Article",
        snippet: "Another snippet",
        url: "http://example.com/2",
        source: "CNN",
        publishedAt: null,
      },
    ];

    const prompt = buildPrompt(articles);
    expect(prompt).toContain("[0] BBC | Test Article | Test snippet");
    expect(prompt).toContain("[1] CNN | Another Article | Another snippet");
    expect(prompt).toContain("top 10");
    expect(prompt).toContain("title_ja");
    expect(prompt).toContain("summary_ja");
  });

  it("空配列でもプロンプトを生成できる", () => {
    const prompt = buildPrompt([]);
    expect(prompt).toContain("ARTICLES:");
  });
});

describe("parseGeminiResponse", () => {
  it("正常なJSONレスポンスをパースできる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.6762,
        lng: 139.6503,
        title_ja: "日本で大地震",
        summary_ja: "日本で大きな地震が発生しました。",
        category: "disaster",
      },
      {
        index: 3,
        country_code: "US",
        lat: 38.9072,
        lng: -77.0369,
        title_ja: "米大統領が演説",
        summary_ja: "アメリカ大統領が重要な演説を行いました。",
        category: "politics",
      },
    ]);

    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(2);
    expect(result[0].country_code).toBe("JP");
    expect(result[0].title_ja).toBe("日本で大地震");
    expect(result[1].index).toBe(3);
  });

  it("マークダウンコードブロックで囲まれたJSONもパースできる", () => {
    const response = '```json\n[{"index":0,"country_code":"UK","lat":51.5,"lng":-0.1,"title_ja":"英国ニュース","summary_ja":"テスト要約","category":"general"}]\n```';
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
    expect(result[0].country_code).toBe("UK");
  });

  it("10件を超える結果は10件に切り詰める", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      index: i,
      country_code: "JP",
      lat: 35.0,
      lng: 139.0,
      title_ja: `記事${i}`,
      summary_ja: `要約${i}`,
      category: "general",
    }));
    const result = parseGeminiResponse(JSON.stringify(items), 15);
    expect(result).toHaveLength(10);
  });

  it("不正なJSONは空配列を返す", () => {
    expect(parseGeminiResponse("not json", 10)).toHaveLength(0);
  });

  it("配列でないJSONは空配列を返す", () => {
    expect(parseGeminiResponse('{"key":"value"}', 10)).toHaveLength(0);
  });

  it("必須フィールドが欠けたアイテムはフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "正常",
        summary_ja: "正常な記事",
        category: "general",
      },
      { index: 1, country_code: "US" }, // 不完全
    ]);
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
  });
});
