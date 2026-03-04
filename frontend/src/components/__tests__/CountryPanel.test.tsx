import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CountryNewsArticle } from "../../types/api";
import CountryPanel from "../CountryPanel";

const mockArticle = (
  overrides: Partial<CountryNewsArticle> = {},
): CountryNewsArticle => ({
  id: "1",
  rank: 1,
  sourceName: "BBC",
  sourceUrl: "https://bbc.com/1",
  originalTitle: "Test",
  titleJa: "テスト記事",
  summaryJa: "テスト要約",
  countryCode: "JP",
  latitude: 35.68,
  longitude: 139.65,
  category: "general",
  publishedAt: null,
  fetchDate: "2026-02-23",
  ...overrides,
});

describe("CountryPanel", () => {
  it("ヘッダーに国旗画像・国名・首都を表示する", () => {
    render(
      <CountryPanel
        countryCode="JP"
        articles={[]}
        isLoading={false}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText(/日本/)).toBeInTheDocument();
    expect(screen.getByText(/東京/)).toBeInTheDocument();
    expect(screen.getByTestId("country-panel-header")).toBeInTheDocument();
    const flagImg = screen.getByAltText("日本の国旗");
    expect(flagImg).toBeInTheDocument();
    expect(flagImg).toHaveAttribute("src", "https://flagcdn.com/24x18/jp.png");
  });

  it("戻るボタンでonBackが呼ばれる", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <CountryPanel
        countryCode="JP"
        articles={[]}
        isLoading={false}
        onBack={onBack}
      />,
    );

    await user.click(screen.getByTestId("country-panel-back"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("記事を日付グループで表示する", () => {
    const articles = [
      mockArticle({ id: "1", fetchDate: "2026-02-24", titleJa: "新しい記事" }),
      mockArticle({ id: "2", fetchDate: "2026-02-23", titleJa: "古い記事" }),
    ];
    render(
      <CountryPanel
        countryCode="JP"
        articles={articles}
        isLoading={false}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("2026-02-24")).toBeInTheDocument();
    expect(screen.getByText("2026-02-23")).toBeInTheDocument();
    expect(screen.getByText("新しい記事")).toBeInTheDocument();
    expect(screen.getByText("古い記事")).toBeInTheDocument();
  });

  it("ローディング中はスピナーを表示する", () => {
    render(
      <CountryPanel
        countryCode="JP"
        articles={[]}
        isLoading={true}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("country-panel-loading")).toBeInTheDocument();
  });

  it("記事が空の場合にメッセージを表示する", () => {
    render(
      <CountryPanel
        countryCode="JP"
        articles={[]}
        isLoading={false}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("country-panel-empty")).toBeInTheDocument();
  });

  it("未登録の国コードではコードをそのまま表示する", () => {
    render(
      <CountryPanel
        countryCode="ZZ"
        articles={[]}
        isLoading={false}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText(/ZZ/)).toBeInTheDocument();
  });

  it("sourceUrlがある場合に元記事リンクが表示される", () => {
    const articles = [mockArticle({ sourceUrl: "https://bbc.com/1" })];
    render(
      <CountryPanel
        countryCode="JP"
        articles={articles}
        isLoading={false}
        onBack={vi.fn()}
      />,
    );

    const link = screen.getByText("元記事を読む →");
    expect(link).toHaveAttribute("href", "https://bbc.com/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("sourceUrlが空の場合に元記事リンクが表示されない", () => {
    const articles = [mockArticle({ sourceUrl: "" })];
    render(
      <CountryPanel
        countryCode="JP"
        articles={articles}
        isLoading={false}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText("元記事を読む →")).not.toBeInTheDocument();
  });
});
