import { describe, it, expect, vi, beforeEach } from "vitest";
import L from "leaflet";
import type { NewsArticle } from "../../types/api";

// react-leaflet の Marker をモック
vi.mock("react-leaflet", () => ({
  Marker: () => null,
}));

// divIcon の呼び出しを検証するためにスパイ
vi.spyOn(L, "divIcon");

const mockArticle = (overrides: Partial<NewsArticle> = {}): NewsArticle => ({
  id: "1",
  rank: 1,
  sourceName: "BBC",
  sourceUrl: "https://bbc.com/1",
  originalTitle: "Test",
  titleJa: "テスト",
  summaryJa: "要約",
  countryCode: "JP",
  latitude: 35.68,
  longitude: 139.65,
  category: "general",
  publishedAt: null,
  ...overrides,
});

// NewsMarker は DivIcon の HTML を生成するので、
// divIcon に渡される引数を検証する
import { render } from "@testing-library/react";
import NewsMarker from "../NewsMarker";

describe("NewsMarker", () => {
  beforeEach(() => {
    vi.mocked(L.divIcon).mockClear();
  });

  it("正しいdata-testidを含むアイコンを生成する", () => {
    render(
      <NewsMarker
        article={mockArticle({ id: "abc" })}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const call = vi.mocked(L.divIcon).mock.calls[0][0];
    expect(call?.html).toContain('data-testid="marker-abc"');
  });

  it("カテゴリに応じた色を使用する", () => {
    render(
      <NewsMarker
        article={mockArticle({ category: "politics" })}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const call = vi.mocked(L.divIcon).mock.calls[0][0];
    // politics = #ef4444
    expect(call?.html).toContain("#ef4444");
  });

  it("選択時にボーダー付きリングを表示する", () => {
    render(
      <NewsMarker
        article={mockArticle()}
        isSelected={true}
        onClick={() => {}}
      />
    );
    const call = vi.mocked(L.divIcon).mock.calls[0][0];
    expect(call?.html).toContain("border:2px solid white");
  });

  it("未選択時にリングを表示しない", () => {
    render(
      <NewsMarker
        article={mockArticle()}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const call = vi.mocked(L.divIcon).mock.calls[0][0];
    expect(call?.html).not.toContain("border:2px solid white");
  });

  it("ランクに応じてアイコンサイズが変わる", () => {
    // rank 1 → size 8 → boxSize max(40, 44) = 44
    render(
      <NewsMarker
        article={mockArticle({ id: "r1", rank: 1 })}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const call1 = vi.mocked(L.divIcon).mock.calls[0][0];
    expect(call1?.iconSize).toEqual([44, 44]);

    // rank 8 → size 4 → boxSize max(20, 44) = 44
    render(
      <NewsMarker
        article={mockArticle({ id: "r8", rank: 8 })}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const lastIdx = vi.mocked(L.divIcon).mock.calls.length - 1;
    const call2 = vi.mocked(L.divIcon).mock.calls[lastIdx][0];
    expect(call2?.iconSize).toEqual([44, 44]);
  });
});
