import { useQuery } from "@tanstack/react-query";
import {
  getAvailableDates,
  getNewsByCountry,
  getNewsByDate,
  getTodayNews,
} from "../services/api";

// クエリキー定数
export const newsKeys = {
  all: ["news"] as const,
  today: () => [...newsKeys.all, "today"] as const,
  date: (date: string) => [...newsKeys.all, "date", date] as const,
  dates: () => [...newsKeys.all, "dates"] as const,
  country: (code: string) => [...newsKeys.all, "country", code] as const,
};

export function useTodayNews() {
  return useQuery({
    queryKey: newsKeys.today(),
    queryFn: getTodayNews,
  });
}

export function useNewsByDate(date: string | null) {
  return useQuery({
    queryKey: newsKeys.date(date ?? ""),
    queryFn: () => getNewsByDate(date as string),
    enabled: !!date,
  });
}

export function useAvailableDates() {
  return useQuery({
    queryKey: newsKeys.dates(),
    queryFn: getAvailableDates,
  });
}

export function useCountryNews(code: string | null) {
  return useQuery({
    queryKey: newsKeys.country(code ?? ""),
    queryFn: () => getNewsByCountry(code as string),
    enabled: !!code,
  });
}
