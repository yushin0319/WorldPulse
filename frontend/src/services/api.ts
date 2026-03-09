import { hc } from "hono/client";
import type { AppType } from "../../../worker/src/index";
import type {
  AvailableDates,
  CountryNewsResponse,
  DailyNews,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

// Hono RPC クライアント（型安全なURL構築 + パラメータ）
const client = hc<AppType>(API_BASE);

export async function getTodayNews(): Promise<DailyNews> {
  const res = await client.api.news.today.$get();
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as DailyNews;
}

export async function getNewsByDate(date: string): Promise<DailyNews> {
  const res = await client.api.news[":date"].$get({ param: { date } });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as DailyNews;
}

export async function getAvailableDates(): Promise<AvailableDates> {
  const res = await client.api.news.dates.$get();
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as AvailableDates;
}

export async function getNewsByCountry(
  code: string,
): Promise<CountryNewsResponse> {
  const res = await client.api.news.country[":code"].$get({
    param: { code },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as CountryNewsResponse;
}
