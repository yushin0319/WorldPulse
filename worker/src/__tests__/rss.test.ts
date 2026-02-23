import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  stripHtml,
  truncateSnippet,
  deduplicateArticles,
  parseFeed,
  fetchFeed,
  fetchAndProcessNews,
} from "../services/rss";
import type { RssArticle } from "../types";

describe("stripHtml", () => {
  it("HTMLタグを除去する", () => {
    expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("HTMLエンティティをデコードする", () => {
    expect(stripHtml("AT&amp;T &lt;test&gt;")).toBe("AT&T <test>");
  });

  it("連続する空白を1つにまとめる", () => {
    expect(stripHtml("Hello   World\n\tFoo")).toBe("Hello World Foo");
  });

  it("空文字列を処理できる", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("truncateSnippet", () => {
  it("制限以下のテキストはそのまま返す", () => {
    expect(truncateSnippet("short text", 200)).toBe("short text");
  });

  it("制限を超えるテキストは切り詰めて...を付ける", () => {
    const long = "a".repeat(250);
    const result = truncateSnippet(long, 200);
    expect(result).toHaveLength(203); // 200 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("デフォルトの制限は200文字", () => {
    const exact = "a".repeat(200);
    expect(truncateSnippet(exact)).toBe(exact);
    expect(truncateSnippet(exact + "b")).toHaveLength(203);
  });
});

describe("deduplicateArticles", () => {
  it("タイトル先頭30文字が同じ記事を重複排除する", () => {
    const articles: RssArticle[] = [
      {
        title: "Breaking: Major earthquake hits Japan region today",
        snippet: "A",
        url: "http://a.com",
        source: "BBC",
        publishedAt: null,
      },
      {
        title: "Breaking: Major earthquake hits Japan region now",
        snippet: "B",
        url: "http://b.com",
        source: "CNN",
        publishedAt: null,
      },
      {
        title: "Different news about economy",
        snippet: "C",
        url: "http://c.com",
        source: "Reuters",
        publishedAt: null,
      },
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("BBC");
    expect(result[1].source).toBe("Reuters");
  });

  it("空配列を処理できる", () => {
    expect(deduplicateArticles([])).toHaveLength(0);
  });
});

describe("parseFeed", () => {
  it("RSS 2.0形式をパースできる", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Test Feed</title>
        <item>
          <title>Article One</title>
          <description>Description of article one</description>
          <link>http://example.com/1</link>
          <pubDate>Mon, 23 Feb 2026 00:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Article Two</title>
          <description>&lt;p&gt;HTML description&lt;/p&gt;</description>
          <link>http://example.com/2</link>
        </item>
      </channel>
    </rss>`;

    const articles = parseFeed(xml, "TestSource");
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("Article One");
    expect(articles[0].snippet).toBe("Description of article one");
    expect(articles[0].url).toBe("http://example.com/1");
    expect(articles[0].source).toBe("TestSource");
    expect(articles[1].snippet).toBe("HTML description");
  });

  it("空のフィードは空配列を返す", () => {
    const xml = `<?xml version="1.0"?><rss><channel></channel></rss>`;
    expect(parseFeed(xml, "Test")).toHaveLength(0);
  });

  it("不正なXMLは空配列を返す", () => {
    expect(parseFeed("not xml", "Test")).toHaveLength(0);
  });

  it("タイトルやdescriptionがないitemはデフォルト値で処理する", () => {
    const xml = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item>
          <link>http://example.com/nodata</link>
        </item>
      </channel>
    </rss>`;
    const articles = parseFeed(xml, "Test");
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("");
    expect(articles[0].snippet).toBe("");
  });
});

describe("fetchFeed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("HTTPエラー時は空配列を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );
    const result = await fetchFeed("https://example.com/feed.xml", "Test");
    expect(result).toHaveLength(0);
  });

  it("ネットワークエラー（fetch throw）時は空配列を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );
    const result = await fetchFeed("https://example.com/feed.xml", "Test");
    expect(result).toHaveLength(0);
  });

  it("AbortError（タイムアウト）時は空配列を返す", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(abortError)
    );
    const result = await fetchFeed("https://example.com/feed.xml", "Test");
    expect(result).toHaveLength(0);
  });
});

describe("fetchAndProcessNews", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("全フィードが失敗した場合は空配列を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );
    const result = await fetchAndProcessNews();
    expect(result).toHaveLength(0);
  });
});
