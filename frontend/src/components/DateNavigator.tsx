interface DateNavigatorProps {
  currentDate: string | null;
  availableDates: string[];
  onDateChange: (date: string) => void;
}

function formatDate(dateStr: string, compact: boolean): string {
  const d = new Date(dateStr + "T00:00:00");
  if (compact) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DateNavigator({
  currentDate,
  availableDates,
  onDateChange,
}: DateNavigatorProps) {
  if (!currentDate) return null;

  const currentIndex = availableDates.indexOf(currentDate);
  // currentDateがavailableDatesにない場合は安全にフォールバック
  const hasPrev = currentIndex >= 0 && currentIndex < availableDates.length - 1;
  const hasNext = currentIndex > 0;
  const isToday = currentIndex === 0 || currentDate === availableDates[0];

  const goPrev = () => {
    if (hasPrev) onDateChange(availableDates[currentIndex + 1]);
  };

  const goNext = () => {
    if (hasNext) onDateChange(availableDates[currentIndex - 1]);
  };

  const goToday = () => {
    if (availableDates.length > 0) onDateChange(availableDates[0]);
  };

  return (
    <div
      className="flex items-center justify-center gap-3 bg-[#111827] px-4 py-2"
      data-testid="date-navigator"
    >
      <button
        onClick={goPrev}
        disabled={!hasPrev}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400 hover:text-gray-200 disabled:opacity-30"
        aria-label="前の日"
      >
        ←
      </button>
      <span className="hidden text-sm font-medium text-gray-200 lg:inline">
        {formatDate(currentDate, false)}
      </span>
      <span className="text-sm font-medium text-gray-200 lg:hidden">
        {formatDate(currentDate, true)}
      </span>
      {isToday ? (
        <span className="rounded bg-green-700 px-2 py-0.5 text-xs text-green-100">
          今日
        </span>
      ) : (
        <button
          onClick={goToday}
          className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-500"
        >
          ↩今日
        </button>
      )}
      <button
        onClick={goNext}
        disabled={!hasNext}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400 hover:text-gray-200 disabled:opacity-30"
        aria-label="次の日"
      >
        →
      </button>
    </div>
  );
}
