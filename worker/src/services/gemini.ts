import type { RssArticle, GeminiSelectedArticle, PreviousArticle } from "../types";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Geminiに送る記事数の上限（トークン効率のため）
const MAX_ARTICLES_FOR_PROMPT = 100;

// Geminiに送るプロンプトを構築
export function buildPrompt(
  articles: RssArticle[],
  previousArticles?: PreviousArticle[]
): string {
  const limited = articles.slice(0, MAX_ARTICLES_FOR_PROMPT);
  const articleList = limited
    .map((a, i) => `[${i}] ${a.source} | ${a.title} | ${a.snippet}`)
    .join("\n");

  // 過去記事の重複回避セクション
  let dedupSection = "";
  if (previousArticles && previousArticles.length > 0) {
    const prevList = previousArticles
      .map((p) => `- [${p.fetchDate}] ${p.originalTitle} (${p.titleJa})`)
      .join("\n");
    const dayCount = new Set(previousArticles.map((p) => p.fetchDate)).size;
    dedupSection = `
PREVIOUSLY COVERED (past ${dayCount} day(s)):
Do NOT select articles on these topics UNLESS there is a significant new development (e.g., major escalation, resolution, new casualties, policy reversal).
${prevList}

`;
  }

  return `You are a world news editor. Select the top 10 most globally significant stories from the articles below.

RULES:
- Select exactly 10 articles (or fewer if less than 10 available)
- Prefer geographic diversity (different countries/regions)
- Prefer category diversity (politics, economy, conflict, science, disaster, health, environment, tech, culture, general)
- Avoid topics already covered in previous days unless there is a significant new development
- For each selected article, provide accurate latitude/longitude of the event location
- title_ja must be concise Japanese (max 20 characters)
- summary_ja must be informative Japanese summary (max 200 characters)
- Return a JSON array only, no markdown formatting
${dedupSection}INPUT FORMAT: [index] SOURCE | title | snippet

OUTPUT: JSON array of objects with these fields:
- index: number (article index from input)
- country_code: string (ISO 3166-1 alpha-2)
- lat: number (latitude)
- lng: number (longitude)
- title_ja: string (Japanese title, max 20 chars)
- summary_ja: string (Japanese summary, max 200 chars)
- category: string (one of: politics, economy, conflict, science, disaster, health, environment, tech, culture, general)

ARTICLES:
${articleList}`;
}

// Geminiレスポンスをパース（indexバリデーション付き）
export function parseGeminiResponse(
  text: string,
  articleCount: number
): GeminiSelectedArticle[] {
  // マークダウンコードブロックを除去（大文字・他形式も対応）
  const cleaned = text
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    const VALID_CATEGORIES = new Set([
      "politics", "economy", "conflict", "science", "disaster",
      "health", "environment", "tech", "culture", "general",
    ]);

    return parsed
      .filter(
        (item: unknown): item is GeminiSelectedArticle =>
          typeof item === "object" &&
          item !== null &&
          "index" in item &&
          "country_code" in item &&
          "lat" in item &&
          "lng" in item &&
          "title_ja" in item &&
          "summary_ja" in item &&
          "category" in item &&
          // indexの型・範囲チェック
          Number.isInteger((item as GeminiSelectedArticle).index) &&
          (item as GeminiSelectedArticle).index >= 0 &&
          (item as GeminiSelectedArticle).index < articleCount
      )
      .map((item) => ({
        ...item,
        // categoryを正規化
        category: VALID_CATEGORIES.has(item.category) ? item.category : "general",
      }))
      .slice(0, 10);
  } catch {
    console.error("Failed to parse Gemini response:", text.slice(0, 200));
    return [];
  }
}

// Gemini API呼出（エラー時は例外をスロー）
export async function selectTopNews(
  articles: RssArticle[],
  apiKey: string,
  previousArticles?: PreviousArticle[]
): Promise<GeminiSelectedArticle[]> {
  const limited = articles.slice(0, MAX_ARTICLES_FOR_PROMPT);
  const prompt = buildPrompt(limited, previousArticles);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return parseGeminiResponse(text, limited.length);
}
