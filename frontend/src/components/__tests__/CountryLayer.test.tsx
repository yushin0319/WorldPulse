import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    // 初回render時にonEachFeatureを呼び出してレイヤーを登録
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
    fakeLayers.clear();
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

  it("fetch失敗時はエラーメッセージを表示し地図レイヤーは描画しない", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByText("地図データの読み込みに失敗しました")).toBeInTheDocument();
      expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
    });
  });

  it("国クリックでonCountryClickが呼ばれる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );
    const onCountryClick = vi.fn();

    render(<CountryLayer onCountryClick={onCountryClick} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("country-JP")).toBeInTheDocument();
    });

    screen.getByTestId("country-JP").click();
    expect(onCountryClick).toHaveBeenCalledWith("JP");
  });

  it("selectedCountryCode変更時に対応する国にselectedStyleが適用される", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    const { rerender } = render(
      <CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });

    // JP を選択
    rerender(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode="JP" />);

    const jpLayer = fakeLayers.get("JP");
    expect(jpLayer?.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 2, color: "rgba(255,255,255,0.6)" })
    );
  });

  it("selectedCountryCode解除時にdefaultStyleに戻る", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    const { rerender } = render(
      <CountryLayer onCountryClick={vi.fn()} selectedCountryCode="JP" />
    );

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });

    // 選択解除
    rerender(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    const jpLayer = fakeLayers.get("JP");
    // 最後のsetStyle呼び出しがdefaultStyle（weight: 0.5）であること
    const lastCall = jpLayer?.setStyle.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual(
      expect.objectContaining({ weight: 0.5 })
    );
  });

  it("選択国を切り替えると前の国がdefaultStyleに戻る", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    const { rerender } = render(
      <CountryLayer onCountryClick={vi.fn()} selectedCountryCode="JP" />
    );

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });

    // JP → US に切り替え
    rerender(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode="US" />);

    const jpLayer = fakeLayers.get("JP");
    const usLayer = fakeLayers.get("US");

    // JPはdefaultStyleに戻り、USにselectedStyleが適用される
    expect(jpLayer?.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 0.5 })
    );
    expect(usLayer?.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 2, color: "rgba(255,255,255,0.6)" })
    );
  });

  it("選択中の国にmouseoverしてもselectedStyleが維持される", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });

    const jpLayer = fakeLayers.get("JP")!;

    // JP をクリックして選択
    jpLayer.handlers.click();
    jpLayer.setStyle.mockClear();

    // 選択中の国にmouseover → selectedStyleが維持されること
    jpLayer.handlers.mouseover();
    expect(jpLayer.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 2, color: "rgba(255,255,255,0.6)" })
    );
  });

  it("クリック後のmouseoutでselectedStyleが維持される（タッチデバイス対策）", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });

    const jpLayer = fakeLayers.get("JP")!;

    // click → mouseout の順で同期的に発火（タッチデバイスの挙動を再現）
    jpLayer.handlers.click();
    jpLayer.handlers.mouseout();

    // 最後のsetStyle呼び出しがselectedStyle（weight: 1.5）であること
    const lastCall = jpLayer.setStyle.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual(
      expect.objectContaining({ weight: 2, color: "rgba(255,255,255,0.6)" })
    );
  });

  it("クリックで別の国に切り替えると前の国が即座にdefaultStyleに戻る", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockGeoJSON), { status: 200 })
    );

    render(<CountryLayer onCountryClick={vi.fn()} selectedCountryCode={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
    });

    const jpLayer = fakeLayers.get("JP")!;
    const usLayer = fakeLayers.get("US")!;

    // JP をクリック
    jpLayer.handlers.click();
    expect(jpLayer.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 2 })
    );

    // US をクリック → JP は click ハンドラー内で即座に defaultStyle に戻る
    jpLayer.setStyle.mockClear();
    usLayer.handlers.click();

    expect(jpLayer.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 0.5 })
    );
    expect(usLayer.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 2 })
    );
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

    screen.getByTestId("country--99").click();
    expect(onCountryClick).not.toHaveBeenCalled();
  });
});
