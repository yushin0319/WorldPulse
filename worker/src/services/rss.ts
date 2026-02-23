import { XMLParser } from "fast-xml-parser";
import type { RssArticle } from "../types";

// RSSフィード一覧
const RSS_FEEDS = [
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
  },
  {
    source: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    source: "NHK World",
    url: "https://www3.nhk.or.jp/rss/news/cat0.xml",
  },
  { source: "CNN", url: "http://rss.cnn.com/rss/edition_world.rss" },
  {
    source: "DW",
    url: "https://rss.dw.com/xml/rss-en-world",
  },
];

// HTMLタグ除去
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// スニペット切り出し（最大200文字）
export function truncateSnippet(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

// タイトル類似度による重複排除（簡易: 先頭30文字一致）
export function deduplicateArticles(articles: RssArticle[]): RssArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.title.slice(0, 30).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 単一フィードの取得+パース
export async function fetchFeed(
  feedUrl: string,
  source: string
): Promise<RssArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "WorldPulse/1.0" },
    });
    if (!res.ok) {
      console.warn(`Feed fetch failed: ${source} (${res.status})`);
      return [];
    }
    const xml = await res.text();
    return parseFeed(xml, source);
  } catch (e) {
    console.warn(`Feed error: ${source}`, e);
    return [];
  }
}

// XMLパース
export function parseFeed(xml: string, source: string): RssArticle[] {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      isArray: (tagName) =>
        tagName === "item" || tagName === "entry",
    });
    const parsed = parser.parse(xml);

    // RSS 2.0 形式
    const items =
      parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];

    if (!Array.isArray(items)) return [];

  return items.map((item: Record<string, unknown>) => {
    const title = stripHtml(String(item.title ?? ""));
    const description = stripHtml(
      String(item.description ?? item.summary ?? item.content ?? "")
    );
    const link =
      typeof item.link === "string"
        ? item.link
        : typeof item.link === "object" &&
            item.link !== null &&
            "@_href" in (item.link as Record<string, unknown>)
          ? String((item.link as Record<string, string>)["@_href"])
          : "";

    return {
      title,
      snippet: truncateSnippet(description),
      url: link,
      source,
      publishedAt: String(item.pubDate ?? item.published ?? item.updated ?? ""),
    };
  });
  } catch {
    console.warn(`Failed to parse feed from ${source}`);
    return [];
  }
}

// 全フィード取得 + 重複排除
export async function fetchAndProcessNews(): Promise<RssArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.source))
  );

  const allArticles: RssArticle[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    }
  }

  return deduplicateArticles(allArticles);
}
