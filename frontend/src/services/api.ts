import type {
  AvailableDates,
  CountryNewsResponse,
  DailyNews,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getTodayNews(): Promise<DailyNews> {
  return fetchJson<DailyNews>("/api/news/today");
}

export async function getNewsByDate(date: string): Promise<DailyNews> {
  return fetchJson<DailyNews>(`/api/news/${date}`);
}

export async function getAvailableDates(): Promise<AvailableDates> {
  return fetchJson<AvailableDates>("/api/news/dates");
}

export async function getNewsByCountry(
  code: string,
): Promise<CountryNewsResponse> {
  return fetchJson<CountryNewsResponse>(`/api/news/country/${code}`);
}
