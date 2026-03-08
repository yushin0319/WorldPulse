// M1: lat/lng 型・範囲バリデーション + country_code 形式チェック
import { describe, expect, it } from "vitest";
import { parseGeminiResponse } from "../services/gemini";

describe("parseGeminiResponse - バリデーション (M1)", () => {
  it("latが文字列の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: "35.6", // 文字列
        lng: 139.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    expect(parseGeminiResponse(response, 10)).toHaveLength(0);
  });

  it("lngが文字列の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: "139.0", // 文字列
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    expect(parseGeminiResponse(response, 10)).toHaveLength(0);
  });

  it("latが有効範囲外（-90〜90）の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 9999,
        lng: 139.0,
        title_ja: "範囲外lat",
        summary_ja: "テスト",
        category: "general",
      },
      {
        index: 1,
        country_code: "US",
        lat: -91,
        lng: -77.0,
        title_ja: "範囲外lat負",
        summary_ja: "テスト",
        category: "general",
      },
      {
        index: 2,
        country_code: "DE",
        lat: 52.5,
        lng: 13.4,
        title_ja: "正常",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
    expect(result[0].country_code).toBe("DE");
  });

  it("lngが有効範囲外（-180〜180）の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: -9999,
        title_ja: "範囲外lng",
        summary_ja: "テスト",
        category: "general",
      },
      {
        index: 1,
        country_code: "FR",
        lat: 48.8,
        lng: 2.3,
        title_ja: "正常",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
    expect(result[0].country_code).toBe("FR");
  });

  it("country_codeが3文字以上の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "USA", // 3文字
        lat: 38.0,
        lng: -77.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    expect(parseGeminiResponse(response, 10)).toHaveLength(0);
  });

  it("country_codeが小文字の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "us", // 小文字
        lat: 38.0,
        lng: -77.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    expect(parseGeminiResponse(response, 10)).toHaveLength(0);
  });

  it("country_codeが空文字の場合はフィルタされる", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "",
        lat: 38.0,
        lng: -77.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
      },
    ]);
    expect(parseGeminiResponse(response, 10)).toHaveLength(0);
  });

  it("parseGeminiResponseの出力に余分なフィールドが含まれない", () => {
    const response = JSON.stringify([
      {
        index: 0,
        country_code: "JP",
        lat: 35.0,
        lng: 139.0,
        title_ja: "テスト",
        summary_ja: "テスト",
        category: "general",
        unexpected_field: "should not appear", // 未知フィールド
        reasoning: "internal thought",
      },
    ]);
    const result = parseGeminiResponse(response, 10);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("unexpected_field");
    expect(result[0]).not.toHaveProperty("reasoning");
  });
});
