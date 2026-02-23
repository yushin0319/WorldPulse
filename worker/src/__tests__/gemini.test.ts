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

  it("空文字列は空配列を返す", () => {
    expect(parseGeminiResponse("", 10)).toHaveLength(0);
  });

  it("indexが範囲外のアイテムはフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "範囲内",
        summary_ja: "テスト",
        category: "general",
      },
      {
        index: 5,
        country_code: "US",
        lat: 38.0,
        lng: -77.0,
        title_ja: "範囲外",
        summary_ja: "テスト",
        category: "general",
      },
      {
        index: -1,
        country_code: "UK",
        lat: 51.5,
        lng: -0.1,
        title_ja: "負のindex",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    // articleCount=3 なので index=5 と index=-1 はフィルタされる
    const result = parseGeminiResponse(response, 3);
    expect(result).toHaveLength(1);
    expect(result[0].title_ja).toBe("範囲内");
  });

  it("小数のindexはフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 1.5,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "小数",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    expect(parseGeminiResponse(response, 10)).toHaveLength(0);
  });

  it("無効なカテゴリはgeneralに正規化される", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "invalid_category",
      },
    ]);
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("general");
  });

  it("null要素が混在した配列でもクラッシュしない", () => {
    const response = JSON.stringify([
      null,
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "正常",
        summary_ja: "テスト",
        category: "general",
      },
      undefined,
    ]);
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
  });

  it("buildPromptは100件を超える記事を切り詰める", () => {
    const articles: RssArticle[] = Array.from({ length: 120 }, (_, i) => ({
      title: `Article ${i}`,
      snippet: `Snippet ${i}`,
      url: `http://example.com/${i}`,
      source: "Test",
      publishedAt: null,
    }));
    const prompt = buildPrompt(articles);
    // [99]は含まれるが[100]は含まれない
    expect(prompt).toContain("[99]");
    expect(prompt).not.toContain("[100]");
  });
});
