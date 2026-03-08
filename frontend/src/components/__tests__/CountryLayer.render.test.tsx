import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CountryLayer from "../CountryLayer";

// レイヤーのsetStyle呼び出しを追跡するためのマップ
const fakeLayers = new Map<
  string,
  { setStyle: ReturnType<typeof vi.fn>; handlers: Record<string, () => void> }
>();

// react-leafletモック: GeoJSONをdivで代替
// onEachFeatureをrender時に呼び出し、レイヤーをfakeLayersに登録する
vi.mock("react-leaflet", () => ({
  GeoJSON: ({
    data,
    onEachFeature,
  }: {
    data: GeoJSON.FeatureCollection;
    onEachFeature?: (feature: GeoJSON.Feature, layer: unknown) => void;
    style?: unknown;
  }) => {
    if (onEachFeature) {
      data.features.forEach((f) => {
        const code = f.properties?.iso_a2 ?? "??";
        if (!fakeLayers.has(code)) {
          const handlers: Record<string, () => void> = {};
          const fakeLayer = {
            on: (h: Record<string, () => void>) => {
              Object.assign(handlers, h);
            },
            setStyle: vi.fn(),
            handlers,
          };
          fakeLayers.set(code, fakeLayer);
          onEachFeature(f, fakeLayer);
        }
      });
    }

    return (
      <div data-testid="geojson-layer">
        {data.features.map((f) => {
          const code = f.properties?.iso_a2 ?? "??";
          return (
            <div
              key={code}
              data-testid={`country-${code}`}
              onClick={() => fakeLayers.get(code)?.handlers.click?.()}
            />
          );
        })}
      </div>
    );
  },
}));

const mockGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { iso_a2: "JP", name: "Japan" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [139, 35],
            [140, 35],
            [140, 36],
            [139, 36],
            [139, 35],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { iso_a2: "US", name: "United States of America" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-100, 40],
            [-99, 40],
            [-99, 41],
            [-100, 41],
            [-100, 40],
          ],
        ],
      },
    },
  ],
};

describe("CountryLayer - 描画・クリック", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fakeLayers.clear();
  });

  it("GeoJSONデータをfetchして描画する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 }),
    );

    render(
      <CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });
    expect(screen.getByTestId("country-JP")).toBeInTheDocument();
    expect(screen.getByTestId("country-US")).toBeInTheDocument();
  });

  it("fetch失敗時はエラーメッセージを表示し地図レイヤーは描画しない", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(
      <CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("地図データの読み込みに失敗しました"),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
    });
  });

  it("国クリックでonCountryClickが呼ばれる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 }),
    );
    const onCountryClick = vi.fn();

    render(
      <CountryLayer
        onCountryClick={onCountryClick}
        selectedCountryCode={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("country-JP")).toBeInTheDocument();
    });

    screen.getByTestId("country-JP").click();
    expect(onCountryClick).toHaveBeenCalledWith("JP");
  });

  it("iso_a2がない国はクリックしてもコールバックが呼ばれない", async () => {
    const noCodeGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso_a2: "-99", name: "Antarctica" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, -80],
                [10, -80],
                [10, -70],
                [0, -70],
                [0, -80],
              ],
            ],
          },
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(noCodeGeoJSON), { status: 200 }),
    );
    const onCountryClick = vi.fn();

    render(
      <CountryLayer
        onCountryClick={onCountryClick}
        selectedCountryCode={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("country--99")).toBeInTheDocument();
    });

    screen.getByTestId("country--99").click();
    expect(onCountryClick).not.toHaveBeenCalled();
  });
});
