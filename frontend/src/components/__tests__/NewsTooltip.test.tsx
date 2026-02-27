import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewsTooltip from "../NewsTooltip";
import type { NewsArticle } from "../../types/api";

const mockArticle: NewsArticle = {
  id: "1",
  rank: 3,
  sourceName: "Reuters",
  sourceUrl: "https://reuters.com/article/1",
  originalTitle: "Test Article",
  titleJa: "テストタイトル",
  summaryJa: "これはテスト要約です。重要なニュースの概要を200文字以内で表示します。",
  countryCode: "US",
  latitude: 38.9,
  longitude: -77.0,
  category: "politics",
  publishedAt: "2026-02-23T10:00:00Z",
};

describe("NewsTooltip", () => {
  it("記事のランク・ソース・タイトル・要約を表示する", () => {
    render(<NewsTooltip article={mockArticle} onClose={() => {}} />);

    expect(screen.getByTestId("news-tooltip")).toBeInTheDocument();
    expect(screen.getByText(/^#3/)).toBeInTheDocument();
    expect(screen.getByText(/Reuters/)).toBeInTheDocument();
    expect(screen.getByText("テストタイトル")).toBeInTheDocument();
    expect(
      screen.getByText(/これはテスト要約です/)
    ).toBeInTheDocument();
  });

  it("閉じるボタンでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NewsTooltip article={mockArticle} onClose={onClose} />);

    await user.click(screen.getByLabelText("閉じる"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("元記事へのリンクが正しいURLで表示される", () => {
    render(<NewsTooltip article={mockArticle} onClose={() => {}} />);

    const link = screen.getByText("元記事を読む →");
    expect(link).toHaveAttribute("href", "https://reuters.com/article/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("role=dialogとaria-labelが設定されている", () => {
    render(<NewsTooltip article={mockArticle} onClose={() => {}} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label", mockArticle.titleJa);
  });

  it("国名を表示する", () => {
    render(<NewsTooltip article={mockArticle} onClose={() => {}} />);
    expect(screen.getByText("アメリカ")).toBeInTheDocument();
  });

  it("国旗画像を表示する", () => {
    render(<NewsTooltip article={mockArticle} onClose={() => {}} />);
    const flag = screen.getByAltText("アメリカ");
    expect(flag).toBeInTheDocument();
    expect(flag).toHaveAttribute(
      "src",
      expect.stringContaining("/us.")
    );
  });

  it("EscキーでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NewsTooltip article={mockArticle} onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
