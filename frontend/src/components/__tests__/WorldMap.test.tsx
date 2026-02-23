import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorldMap from "../WorldMap";
import type { NewsArticle } from "../../types/api";

// react-leaflet をモック（jsdomではLeafletのDOM操作が動かないため）
vi.mock("react-leaflet", () => ({
  MapContainer: ({
    children,
  }: React.PropsWithChildren) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => ({ flyTo: vi.fn(), fitBounds: vi.fn(), getZoom: () => 2 }),
}));

// NewsMarker をモック
vi.mock("../NewsMarker", () => ({
  default: ({
    article,
    isSelected,
    onClick,
  }: {
    article: NewsArticle;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <div
      data-testid={`marker-${article.id}`}
      data-selected={isSelected}
      onClick={onClick}
    />
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
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("CartoDB Dark Matterタイルレイヤーを表示する", () => {
    render(
      <WorldMap
        articles={[]}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
  });

  it("記事ごとにマーカーを表示する", () => {
    const articles = [
      mockArticle({ id: "1" }),
      mockArticle({ id: "2", latitude: 51.5, longitude: -0.12 }),
    ];
    render(
      <WorldMap
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByTestId("marker-1")).toBeInTheDocument();
    expect(screen.getByTestId("marker-2")).toBeInTheDocument();
  });

  it("選択中の記事のマーカーにisSelected=trueが渡される", () => {
    const articles = [mockArticle({ id: "sel-1" })];
    render(
      <WorldMap
        articles={articles}
        selectedArticleId="sel-1"
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByTestId("marker-sel-1").dataset.selected).toBe("true");
  });

  it("マーカークリックでonSelectArticleが呼ばれる", () => {
    const onSelect = vi.fn();
    const articles = [mockArticle({ id: "click-1" })];
    render(
      <WorldMap
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={onSelect}
      />
    );
    screen.getByTestId("marker-click-1").click();
    expect(onSelect).toHaveBeenCalledWith("click-1");
  });

  it("選択中のマーカーをクリックすると選択解除される", () => {
    const onSelect = vi.fn();
    const articles = [mockArticle({ id: "toggle-1" })];
    render(
      <WorldMap
        articles={articles}
        selectedArticleId="toggle-1"
        onSelectArticle={onSelect}
      />
    );
    screen.getByTestId("marker-toggle-1").click();
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
