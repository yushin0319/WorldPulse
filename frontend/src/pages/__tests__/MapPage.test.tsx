import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  getNewsByDate,
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

describe("MapPage", () => {
  beforeEach(() => {
    useNewsStore.setState({
      articles: [],
      fetchDate: null,
      availableDates: [],
      totalArticlesFetched: 0,
      selectedArticleId: null,
      isLoading: false,
      isFetching: false,
      error: null,
      selectedCountryCode: null,
      countryArticles: [],
      isLoadingCountry: false,
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

    render(<MapPage />);

    await waitFor(() => {
      expect(getTodayNews).toHaveBeenCalledOnce();
      expect(getAvailableDates).toHaveBeenCalledOnce();
    });
  });

  it("ローディング中はスケルトンを表示する", () => {
    useNewsStore.setState({ isLoading: true });

    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 0,
      articles: [],
    });
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    render(<MapPage />);
    expect(screen.getByTestId("loading-screen")).toBeInTheDocument();
  });

  it("エラー時にエラーメッセージを表示する", async () => {
    vi.mocked(getTodayNews).mockRejectedValue(new Error("ネットワークエラー"));
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    render(<MapPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "ニュースの取得に失敗しました。時間をおいて再試行してください。",
        ),
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

    render(<MapPage />);

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
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: ["2026-02-23"] });
    vi.mocked(getNewsByCountry).mockResolvedValue({
      countryCode: "DE",
      articles: [],
    });

    render(<MapPage />);

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
    vi.mocked(getTodayNews).mockRejectedValue(new Error("ネットワークエラー"));
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    render(<MapPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "再読み込み" }),
      ).toBeInTheDocument();
    });
  });

  it("リトライボタンクリックでfetchTodayNewsが呼ばれる（fetchDateなし）", async () => {
    const user = userEvent.setup();
    vi.mocked(getTodayNews).mockRejectedValue(new Error("ネットワークエラー"));
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: [] });

    render(<MapPage />);

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

    // 初回mount + リトライの計2回呼ばれる
    expect(getTodayNews).toHaveBeenCalledTimes(2);
  });

  it("リトライボタンクリックでfetchNewsByDateが呼ばれる（fetchDateあり）", async () => {
    const user = userEvent.setup();
    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: ["2026-02-23"] });

    render(<MapPage />);

    await waitFor(() => {
      expect(screen.getByText("テスト記事1")).toBeInTheDocument();
    });

    // 日付変更でエラーを発生させる
    vi.mocked(getNewsByDate).mockRejectedValue(new Error("日付エラー"));
    useNewsStore.getState().fetchNewsByDate("2026-02-20");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "再読み込み" }),
      ).toBeInTheDocument();
    });

    vi.mocked(getNewsByDate).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });

    await user.click(screen.getByRole("button", { name: "再読み込み" }));

    // fetchNewsByDate が fetchDate（2026-02-23）で呼ばれる
    expect(getNewsByDate).toHaveBeenCalledWith("2026-02-23");
  });

  it("selectedCountryCodeがある場合、NewsPanelの代わりにCountryPanelを表示する", async () => {
    vi.mocked(getTodayNews).mockResolvedValue({
      fetchDate: "2026-02-23",
      totalArticlesFetched: 50,
      articles: mockArticles,
    });
    vi.mocked(getAvailableDates).mockResolvedValue({ dates: ["2026-02-23"] });
    vi.mocked(getNewsByCountry).mockResolvedValue({
      countryCode: "JP",
      articles: [{ ...mockArticles[0], fetchDate: "2026-02-23" }],
    });

    render(<MapPage />);

    // データ取得待ち
    await waitFor(() => {
      expect(screen.getByText("テスト記事1")).toBeInTheDocument();
    });

    // 国パネルを開く
    useNewsStore.getState().selectCountry("JP");
    await useNewsStore.getState().fetchCountryNews("JP");

    await waitFor(() => {
      expect(screen.getByTestId("country-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("news-panel")).not.toBeInTheDocument();
    });
  });
});
