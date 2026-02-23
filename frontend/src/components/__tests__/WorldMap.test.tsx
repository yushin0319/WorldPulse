import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorldMap from "../WorldMap";
import type { NewsArticle } from "../../types/api";

// react-simple-maps をモック（jsdomではSVGのprojectionが動かないため）
vi.mock("react-simple-maps", () => ({
  ComposableMap: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <svg data-testid="composable-map" {...props}>{children}</svg>
  ),
  ZoomableGroup: ({ children }: React.PropsWithChildren) => (
    <g data-testid="zoomable-group">{children}</g>
  ),
  Geographies: ({ children }: { children: (args: { geographies: never[] }) => React.ReactNode }) =>
    children({ geographies: [] }),
  Geography: () => <path data-testid="geography" />,
  Marker: ({ children, coordinates }: React.PropsWithChildren<{ coordinates: [number, number] }>) => (
    <g data-testid={`marker-${coordinates[0]}-${coordinates[1]}`}>{children}</g>
  ),
}));

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

describe("WorldMap", () => {
  it("地図コンテナをレンダリングする", () => {
    render(
      <WorldMap
        articles={[]}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByTestId("world-map")).toBeInTheDocument();
    expect(screen.getByTestId("composable-map")).toBeInTheDocument();
  });

  it("記事ごとにマーカーを表示する", () => {
    const articles = [
      mockArticle({ id: "1", latitude: 35.68, longitude: 139.65 }),
      mockArticle({ id: "2", latitude: 51.5, longitude: -0.12 }),
    ];
    render(
      <WorldMap
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    // PulsingMarkerのdata-testidで確認
    expect(screen.getByTestId("marker-1")).toBeInTheDocument();
    expect(screen.getByTestId("marker-2")).toBeInTheDocument();
  });

  it("背景クリックで選択解除される", async () => {
    const onSelect = vi.fn();
    render(
      <WorldMap
        articles={[]}
        selectedArticleId="1"
        onSelectArticle={onSelect}
      />
    );
    screen.getByTestId("world-map").click();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("選択中の記事のマーカーにisSelectedが渡される", () => {
    const articles = [mockArticle({ id: "sel-1" })];
    const { container } = render(
      <WorldMap
        articles={articles}
        selectedArticleId="sel-1"
        onSelectArticle={() => {}}
      />
    );
    // 選択時にリング（3つ目のcircle）が存在することで確認
    const markerG = container.querySelector('[data-testid="marker-sel-1"]');
    const circles = markerG?.querySelectorAll("circle");
    expect(circles?.length).toBe(3);
  });
});
