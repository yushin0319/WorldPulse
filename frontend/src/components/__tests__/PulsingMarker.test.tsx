import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import PulsingMarker from "../PulsingMarker";
import type { NewsArticle } from "../../types/api";

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

// SVGコンポーネントなのでSVGコンテナ内でレンダリング
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

describe("PulsingMarker", () => {
  it("正しいdata-testidでレンダリングされる", () => {
    const { container } = renderInSvg(
      <PulsingMarker
        article={mockArticle({ id: "abc" })}
        x={100}
        y={200}
        isSelected={false}
        onClick={() => {}}
      />
    );
    expect(container.querySelector('[data-testid="marker-abc"]')).toBeTruthy();
  });

  it("指定座標に配置される", () => {
    const { container } = renderInSvg(
      <PulsingMarker
        article={mockArticle()}
        x={150}
        y={250}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const g = container.querySelector('[data-testid="marker-1"]');
    expect(g?.getAttribute("transform")).toBe("translate(150, 250)");
  });

  it("選択時にリング（strokeのcircle）を表示する", () => {
    const { container } = renderInSvg(
      <PulsingMarker
        article={mockArticle()}
        x={0}
        y={0}
        isSelected={true}
        onClick={() => {}}
      />
    );
    const g = container.querySelector('[data-testid="marker-1"]');
    // 選択時: パルス circle + 内側 circle + リング circle = 3つ
    const circles = g?.querySelectorAll("circle");
    expect(circles?.length).toBe(3);
  });

  it("未選択時にリングを表示しない", () => {
    const { container } = renderInSvg(
      <PulsingMarker
        article={mockArticle()}
        x={0}
        y={0}
        isSelected={false}
        onClick={() => {}}
      />
    );
    const g = container.querySelector('[data-testid="marker-1"]');
    // 未選択: パルス circle + 内側 circle = 2つ
    const circles = g?.querySelectorAll("circle");
    expect(circles?.length).toBe(2);
  });

  it("クリックでonClickが呼ばれる", () => {
    const onClick = vi.fn();
    const { container } = renderInSvg(
      <PulsingMarker
        article={mockArticle()}
        x={0}
        y={0}
        isSelected={false}
        onClick={onClick}
      />
    );
    const g = container.querySelector('[data-testid="marker-1"]');
    g?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ランクに応じてマーカーサイズが変わる", () => {
    // rank 1 → size 8
    const { container: c1 } = renderInSvg(
      <PulsingMarker
        article={mockArticle({ id: "r1", rank: 1 })}
        x={0}
        y={0}
        isSelected={false}
        onClick={() => {}}
      />
    );
    // rank 8 → size 4
    const { container: c2 } = renderInSvg(
      <PulsingMarker
        article={mockArticle({ id: "r8", rank: 8 })}
        x={0}
        y={0}
        isSelected={false}
        onClick={() => {}}
      />
    );

    const innerCircle1 = c1.querySelector('[data-testid="marker-r1"]')
      ?.querySelectorAll("circle")[1];
    const innerCircle2 = c2.querySelector('[data-testid="marker-r8"]')
      ?.querySelectorAll("circle")[1];

    // rank 1 は rank 8 より大きい
    const r1 = Number(innerCircle1?.getAttribute("r"));
    const r2 = Number(innerCircle2?.getAttribute("r"));
    expect(r1).toBeGreaterThan(r2);
  });
});
