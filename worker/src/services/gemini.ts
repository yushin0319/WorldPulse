import { VALID_CATEGORIES } from "../types";
import type { RssArticle, GeminiSelectedArticle, PreviousArticle } from "../types";

// カテゴリの O(1) 判定用 Set（モジュールレベルで一度だけ生成）
const VALID_CATEGORIES_SET = new Set<string>(VALID_CATEGORIES);

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Geminiに送る記事数の上限（トークン効率のため）
const MAX_ARTICLES_FOR_PROMPT = 100;

// プロンプトインジェクション対策: title/snippetのサニタイズ
export function sanitizeForPrompt(text: string): string {
  return text
    // 改行を空白に正規化
    .replace(/[\r\n]+/g, " ")
    // プロンプト制御キーワードを除去（大文字小文字無視）
    .replace(/\b(RULES|OUTPUT|ARTICLES|PREVIOUSLY COVERED):/gi, "")
    // 区切り線を除去
    .replace(/---+/g, "")
    // 先頭のインデックス偽装を除去（"[0] "、"[99] " 等）
    .replace(/^\[\d+\]\s*/, "")
    .trim();
}

// Geminiに送るプロンプトを構築
export function buildPrompt(
  articles: RssArticle[],
  previousArticles?: PreviousArticle[]
): string {
  const limited = articles.slice(0, MAX_ARTICLES_FOR_PROMPT);
  const articleList = limited
    .map(
      (a, i) =>
        `[${i}] ${a.source} | ${sanitizeForPrompt(a.title)} | ${sanitizeForPrompt(a.snippet)}`
    )
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
- country_code must be a real ISO 3166-1 alpha-2 code of the country where the event took place. Never use "WW" or invented codes. For scientific discoveries, use the country where the research was conducted or the discovery was made
- title_ja must be concise Japanese (max 20 characters)
- summary_ja must be informative Japanese summary (max 200 characters). Country names are already displayed separately in the UI, so avoid repeating them in the summary unless essential for context
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

// Geminiレスポンスをパース（indexバリデーション + 型・範囲チェック付き）
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

    return parsed
      .filter((item: unknown): item is Record<string, unknown> => {
        if (typeof item !== "object" || item === null) return false;
        const obj = item as Record<string, unknown>;
        return (
          // index: 整数かつ有効範囲
          Number.isInteger(obj.index) &&
          (obj.index as number) >= 0 &&
          (obj.index as number) < articleCount &&
          // country_code: ISO 3166-1 alpha-2（大文字2文字のみ）
          typeof obj.country_code === "string" &&
          /^[A-Z]{2}$/.test(obj.country_code) &&
          // lat: number かつ -90〜90
          typeof obj.lat === "number" &&
          (obj.lat as number) >= -90 &&
          (obj.lat as number) <= 90 &&
          // lng: number かつ -180〜180
          typeof obj.lng === "number" &&
          (obj.lng as number) >= -180 &&
          (obj.lng as number) <= 180 &&
          // title_ja, summary_ja, category: string
          typeof obj.title_ja === "string" &&
          typeof obj.summary_ja === "string" &&
          typeof obj.category === "string"
        );
      })
      .map((item): GeminiSelectedArticle => ({
        index: item.index as number,
        country_code: item.country_code as string,
        lat: item.lat as number,
        lng: item.lng as number,
        title_ja: item.title_ja as string,
        summary_ja: item.summary_ja as string,
        // categoryを正規化（未知の値はgeneralに）
        category: VALID_CATEGORIES_SET.has(item.category as string)
          ? (item.category as string)
          : "general",
      }))
      .slice(0, 10);
  } catch {
    console.error("Failed to parse Gemini response:", text.slice(0, 200));
    return [];
  }
}

// Gemini API 単発呼出（タイムアウト付き）
async function callGeminiApi(
  prompt: string,
  apiKey: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

// Gemini API呼出（60秒タイムアウト + 1回リトライ）
export async function selectTopNews(
  articles: RssArticle[],
  apiKey: string,
  previousArticles?: PreviousArticle[]
): Promise<GeminiSelectedArticle[]> {
  const limited = articles.slice(0, MAX_ARTICLES_FOR_PROMPT);
  const prompt = buildPrompt(limited, previousArticles);

  // 1回目: 180秒タイムアウト
  try {
    const text = await callGeminiApi(prompt, apiKey, 180_000);
    const results = parseGeminiResponse(text, limited.length);
    if (results.length > 0) return results;
    console.warn("Gemini returned empty results, retrying...");
  } catch (e) {
    console.warn("Gemini API 1st attempt failed:", e instanceof Error ? e.message : e);
  }

  // 2回目（リトライ）: 180秒タイムアウト
  try {
    const text = await callGeminiApi(prompt, apiKey, 180_000);
    return parseGeminiResponse(text, limited.length);
  } catch (e) {
    console.error("Gemini API 2nd attempt failed:", e instanceof Error ? e.message : e);
    throw e;
  }
}
