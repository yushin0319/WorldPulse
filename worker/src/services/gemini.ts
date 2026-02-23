import type { RssArticle, GeminiSelectedArticle } from "../types";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Geminiに送るプロンプトを構築
export function buildPrompt(articles: RssArticle[]): string {
  const articleList = articles
    .map((a, i) => `[${i}] ${a.source} | ${a.title} | ${a.snippet}`)
    .join("\n");

  return `You are a world news editor. Select the top 10 most globally significant stories from the articles below.

RULES:
- Select exactly 10 articles (or fewer if less than 10 available)
- Prefer geographic diversity (different countries/regions)
- Prefer category diversity (politics, economy, conflict, science, disaster, health, environment, tech, culture, general)
- For each selected article, provide accurate latitude/longitude of the event location
- title_ja must be concise Japanese (max 20 characters)
- summary_ja must be informative Japanese summary (max 200 characters)
- Return a JSON array only, no markdown formatting

INPUT FORMAT: [index] SOURCE | title | snippet

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

// Geminiレスポンスをパース
export function parseGeminiResponse(text: string): GeminiSelectedArticle[] {
  // マークダウンコードブロックを除去
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

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
          "category" in item
      )
      .slice(0, 10);
  } catch {
    console.error("Failed to parse Gemini response:", text.slice(0, 200));
    return [];
  }
}

// Gemini API呼出
export async function selectTopNews(
  articles: RssArticle[],
  apiKey: string
): Promise<GeminiSelectedArticle[]> {
  const prompt = buildPrompt(articles);

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
    console.error(`Gemini API error (${response.status}):`, errorText);
    return [];
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return parseGeminiResponse(text);
}
