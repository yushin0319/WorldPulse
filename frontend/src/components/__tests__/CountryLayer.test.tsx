import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CountryLayer from "../CountryLayer";

// react-leafletモック: GeoJSONをdivで代替
vi.mock("react-leaflet", () => ({
  GeoJSON: ({
    data,
    onEachFeature,
  }: {
    data: GeoJSON.FeatureCollection;
    onEachFeature?: (feature: GeoJSON.Feature, layer: unknown) => void;
    style?: unknown;
  }) => (
    <div data-testid="geojson-layer">
      {data.features.map((f) => {
        const code = f.properties?.iso_a2 ?? "??";
        return (
          <div
            key={code}
            data-testid={`country-${code}`}
            onClick={() => {
              // onEachFeatureで登録されたclickハンドラをシミュレート
              if (onEachFeature) {
                const fakeLayer = {
                  on: (handlers: Record<string, () => void>) => {
                    handlers.click?.();
                  },
                  setStyle: vi.fn(),
                  resetStyle: vi.fn(),
                };
                onEachFeature(f, fakeLayer);
              }
            }}
          />
        );
      })}
    </div>
  ),
}));

const mockGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { iso_a2: "JP", name: "Japan" },
      geometry: { type: "Polygon", coordinates: [[[139, 35], [140, 35], [140, 36], [139, 36], [139, 35]]] },
    },
    {
      type: "Feature",
      properties: { iso_a2: "US", name: "United States of America" },
      geometry: { type: "Polygon", coordinates: [[[-100, 40], [-99, 40], [-99, 41], [-100, 41], [-100, 40]]] },
    },
  ],
};

describe("CountryLayer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GeoJSONデータをfetchして描画する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });
    expect(screen.getByTestId("country-JP")).toBeInTheDocument();
    expect(screen.getByTestId("country-US")).toBeInTheDocument();
  });

  it("fetch失敗時は何も描画しない", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    // GeoJSONレイヤーが表示されないことを確認
    await waitFor(() => {
      expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
    });
  });

  it("国クリックでonCountryClickが呼ばれる", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );
    const onCountryClick = vi.fn();

    render(<CountryLayer onCountryClick={onCountryClick} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("country-JP")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("country-JP"));
    expect(onCountryClick).toHaveBeenCalledWith("JP");
  });

  it("selectedCountryCodeを受け取って描画できる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode="JP" />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });
    expect(screen.getByTestId("country-JP")).toBeInTheDocument();
  });

  it("iso_a2がない国はクリックしてもコールバックが呼ばれない", async () => {
    const noCodeGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso_a2: "-99", name: "Antarctica" },
          geometry: { type: "Polygon", coordinates: [[[0, -80], [10, -80], [10, -70], [0, -70], [0, -80]]] },
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(noCodeGeoJSON), { status: 200 })
    );
    const onCountryClick = vi.fn();

    render(<CountryLayer onCountryClick={onCountryClick} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("country--99")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("country--99"));
    expect(onCountryClick).not.toHaveBeenCalled();
  });
});
