import { hc } from "hono/client";
import type { AppType } from "../../../shared/api";
import type {
  AvailableDates,
  CountryNewsResponse,
  DailyNews,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

// Hono RPC クライアント（型安全なURL構築 + パラメータ）
const client = hc<AppType>(API_BASE);

// エラーハンドリング一元化
async function callApi<T>(apiCall: Promise<Response>): Promise<T> {
  const res = await apiCall;
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getTodayNews(): Promise<DailyNews> {
  return callApi<DailyNews>(client.api.news.today.$get());
}

export async function getNewsByDate(date: string): Promise<DailyNews> {
  return callApi<DailyNews>(client.api.news[":date"].$get({ param: { date } }));
}

export async function getAvailableDates(): Promise<AvailableDates> {
  return callApi<AvailableDates>(client.api.news.dates.$get());
}

export async function getNewsByCountry(
  code: string,
): Promise<CountryNewsResponse> {
  return callApi<CountryNewsResponse>(
    client.api.news.country[":code"].$get({ param: { code } }),
  );
}
