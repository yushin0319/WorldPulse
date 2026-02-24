import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewsPanel from "../NewsPanel";
import type { NewsArticle } from "../../types/api";

const mockArticle = (overrides: Partial<NewsArticle> = {}): NewsArticle => ({
  id: "1",
  rank: 1,
  sourceName: "BBC",
  sourceUrl: "https://bbc.com/1",
  originalTitle: "Test Article",
  titleJa: "テスト記事",
  summaryJa: "テスト要約文です",
  countryCode: "JP",
  latitude: 35.68,
  longitude: 139.65,
  category: "general",
  publishedAt: null,
  ...overrides,
});

describe("NewsPanel", () => {
  it("記事がない場合に空状態を表示する", () => {
    render(
      <NewsPanel
        articles={[]}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByTestId("news-panel-empty")).toBeInTheDocument();
    expect(screen.getByText("ニュースがありません")).toBeInTheDocument();
  });

  it("記事一覧をランク・ソース・タイトル付きで表示する", () => {
    const articles = [
      mockArticle({ id: "1", rank: 1, sourceName: "BBC", titleJa: "記事1" }),
      mockArticle({ id: "2", rank: 2, sourceName: "Reuters", titleJa: "記事2" }),
    ];
    render(
      <NewsPanel
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByTestId("news-panel")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("BBC")).toBeInTheDocument();
    expect(screen.getByText("Reuters")).toBeInTheDocument();
    expect(screen.getByText("記事1")).toBeInTheDocument();
    expect(screen.getByText("記事2")).toBeInTheDocument();
  });

  it("記事クリックでonSelectArticleが呼ばれる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const articles = [mockArticle({ id: "abc" })];

    render(
      <NewsPanel
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={onSelect}
      />
    );

    await user.click(screen.getByTestId("news-card-abc"));
    expect(onSelect).toHaveBeenCalledWith("abc");
  });

  it("選択中の記事は要約を表示する", () => {
    const articles = [
      mockArticle({ id: "1", summaryJa: "この記事の要約です" }),
    ];
    render(
      <NewsPanel
        articles={articles}
        selectedArticleId="1"
        onSelectArticle={() => {}}
      />
    );
    expect(screen.getByText("この記事の要約です")).toBeInTheDocument();
  });

  it("未選択の記事は要約を表示しない", () => {
    const articles = [
      mockArticle({ id: "1", summaryJa: "この記事の要約です" }),
    ];
    render(
      <NewsPanel
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    expect(screen.queryByText("この記事の要約です")).not.toBeInTheDocument();
  });

  it("選択中の記事をクリックするとnullで選択解除する", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const articles = [mockArticle({ id: "1" })];

    render(
      <NewsPanel
        articles={articles}
        selectedArticleId="1"
        onSelectArticle={onSelect}
      />
    );

    await user.click(screen.getByTestId("news-card-1"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("選択中の記事にsourceUrlリンクが表示される", () => {
    const articles = [
      mockArticle({ id: "1", sourceUrl: "https://bbc.com/article" }),
    ];
    render(
      <NewsPanel
        articles={articles}
        selectedArticleId="1"
        onSelectArticle={() => {}}
      />
    );
    const link = screen.getByRole("link", { name: "元記事を読む →" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://bbc.com/article");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("sourceUrlが空の場合に元記事リンクが表示されない", () => {
    const articles = [
      mockArticle({ id: "1", sourceUrl: "" }),
    ];
    render(
      <NewsPanel
        articles={articles}
        selectedArticleId="1"
        onSelectArticle={() => {}}
      />
    );
    expect(screen.queryByRole("link", { name: "元記事を読む →" })).not.toBeInTheDocument();
  });

  it("カテゴリに応じた色の丸を表示する", () => {
    const articles = [mockArticle({ id: "1", category: "politics" })];
    const { container } = render(
      <NewsPanel
        articles={articles}
        selectedArticleId={null}
        onSelectArticle={() => {}}
      />
    );
    // politics = bg-red-500
    const dot = container.querySelector(".bg-red-500");
    expect(dot).toBeInTheDocument();
  });
});
