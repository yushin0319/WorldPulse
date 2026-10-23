import { describe, expect, it } from "vitest";
import { buildTileUrl } from "../mapTiles";

describe("buildTileUrl", () => {
  it("キーがあればタイル URL の末尾に key パラメータを付ける", () => {
    expect(buildTileUrl("abc123")).toBe(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png?key=abc123",
    );
  });

  it("キーに URL で使えない文字があればエンコードする", () => {
    expect(buildTileUrl("a b&c")).toMatch(/\?key=a%20b%26c$/);
  });

  it("キーが無いときは key パラメータを付けない", () => {
    expect(buildTileUrl(undefined)).toBe(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    );
    expect(buildTileUrl("")).not.toContain("key=");
  });
});
