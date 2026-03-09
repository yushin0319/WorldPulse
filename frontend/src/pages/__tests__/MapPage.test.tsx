import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, type ReactNode, vi } from "vitest";
import MapPage from "../MapPage";

// APIモック
vi.mock("../../services/api", () => ({
  getTodayNews: vi.fn(),
  getNewsByDate: vi.fn(),
  getAvailableDates: vi.fn(),
  getNewsByCountry: vi.fn(),
}));

// react-leaflet モック
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ flyTo: vi.fn(), fitBounds: vi.fn(), getZoom: () => 2 }),
}));

// CountryLayer モック
vi.mock("../../components/CountryLayer", () => ({
  default: ({ onCountryClick }: { onCountryClick: (code: string) => void }) => (
    <div data-testid="country-layer" onClick={() => onCountryClick("DE")} />
  ),
}));

// leaflet CSS モック
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import {
  getAvailableDates,
  getNewsByCountry,
  getTodayNews,
} from "../../services/api";
import { useNewsStore } from "../../stores/newsStore";

const mockArticles = [
  {
    id: "1",
    rank: 1,
    sourceName: "BBC",
    sourceUrl: "https://bbc.com/1",
    originalTitle: "Test",
    titleJa: "テスト記事1",
    summaryJa: "要約1",
    countryCode: "JP",
    latitude: 35.68,
    longitude: 139.65,
    category: "general",
    publishedAt: null,
  },
];

// テスト用 QueryClient ラッパー
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderWithQuery(ui: ReactNode) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("MapPage", () => {
  beforeEach(() => {
    useNewsStore.setState({
      selectedArticleId: null,
      selectedCountryCode: null,
      selectedDate: null,
    });
    vi.clearAllMocks();
  });

  it("初回マウント時にデータを取得する", async () => {
    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-23"],
    });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(getTodayNews).toHaveBeenCalledOnce();
      expect(getAvailableDates).toHaveBeenCalledOnce();
    });
  });

  it("ローディング中はスケルトンを表示する", () => {
    // getTodayNews が未解決のままなら isLoading=true
    vi.mocked(getTodayNews).mockReturnValue(new Promise(() => {}));
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    renderWithQuery(<MapPage />);
    expect(screen.getByTestId("loading-screen")).toBeInTheDocument();
  });

  it("エラー時にエラーメッセージを表示する", async () => {
    vi.mocked(getTodayNews).mockRejectedValue(
      new Error("API error: 500 Internal Server Error"),
    );
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(
        screen.getByText("API error: 500 Internal Server Error"),
      ).toBeInTheDocument();
    });
  });

  it("データ取得後に地図とニュースパネルを表示する", async () => {
    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-23"],
    });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(screen.getByTestId("world-map")).toBeInTheDocument();
      expect(screen.getByText("テスト記事1")).toBeInTheDocument();
    });
  });

  it("国ポリゴンクリックでCountryPanelが開く", async () => {
    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-23"],
    });
    vi.mocked(getNewsByCountry).mockResolvedValue({
      countryCode: "DE",
      articles: [],
    });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(screen.getByTestId("world-map")).toBeInTheDocument();
    });

    // 国ポリゴンクリック（モックはDEを返す）
    screen.getByTestId("country-layer").click();

    await waitFor(() => {
      expect(getNewsByCountry).toHaveBeenCalledWith("DE");
      expect(screen.getByTestId("country-panel")).toBeInTheDocument();
    });
  });

  it("エラー時にリトライボタンが表示される", async () => {
    vi.mocked(getTodayNews).mockRejectedValue(
      new Error("API error: 500 Internal Server Error"),
    );
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "再読み込み" }),
      ).toBeInTheDocument();
    });
  });

  it("リトライボタンクリックで再取得される", async () => {
    const user = userEvent.setup();
    vi.mocked(getTodayNews).mockRejectedValueOnce(
      new Error("API error: 500 Internal Server Error"),
    );
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "再読み込み" }),
      ).toBeInTheDocument();
    });

    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-24",
      totalArticlesFetched: 0,
      articles: [],
    });

    await user.click(screen.getByRole("button", { name: "再読み込み" }));

    await waitFor(() => {
      expect(
        screen.queryByText("API error: 500 Internal Server Error"),
      ).not.toBeInTheDocument();
    });
  });

  it("selectedCountryCodeがある場合、NewsPanelの代わりにCountryPanelを表示する", async () => {
    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });
    vi.mocked(getAvailableDates).mockResolvedValue({
      dates: ["2026-02-23"],
    });
    vi.mocked(getNewsByCountry).mockResolvedValue({
      countryCode: "JP",
      articles: [{ ...mockArticles[0], fetchDate: "2026-02-23" }],
    });

    renderWithQuery(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText("テスト記事1")).toBeInTheDocument();
    });

    // 国パネルを開く（Zustand UI state のみ変更）
    useNewsStore.getState().selectCountry("JP");

    await waitFor(() => {
      expect(screen.getByTestId("country-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("news-panel")).not.toBeInTheDocument();
    });
  });
});
