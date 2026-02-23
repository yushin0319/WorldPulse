import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DateNavigator from "../DateNavigator";

describe("DateNavigator", () => {
  const dates = ["2026-02-23", "2026-02-22", "2026-02-21"];

  it("currentDateがnullの場合は何も表示しない", () => {
    const { container } = render(
      <DateNavigator
        currentDate={null}
        availableDates={dates}
        onDateChange={() => {}}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("現在の日付を表示する", () => {
    render(
      <DateNavigator
        currentDate="2026-02-23"
        availableDates={dates}
        onDateChange={() => {}}
      />
    );
    expect(screen.getByTestId("date-navigator")).toBeInTheDocument();
    // フル表示（lg用）
    expect(screen.getByText("2026-02-23")).toBeInTheDocument();
  });

  it("前の日ボタンで古い日付に移動する", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateNavigator
        currentDate="2026-02-23"
        availableDates={dates}
        onDateChange={onChange}
      />
    );

    await user.click(screen.getByLabelText("前の日"));
    expect(onChange).toHaveBeenCalledWith("2026-02-22");
  });

  it("次の日ボタンで新しい日付に移動する", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateNavigator
        currentDate="2026-02-22"
        availableDates={dates}
        onDateChange={onChange}
      />
    );

    await user.click(screen.getByLabelText("次の日"));
    expect(onChange).toHaveBeenCalledWith("2026-02-23");
  });

  it("最古の日付では前の日ボタンが無効化される", () => {
    render(
      <DateNavigator
        currentDate="2026-02-21"
        availableDates={dates}
        onDateChange={() => {}}
      />
    );
    expect(screen.getByLabelText("前の日")).toBeDisabled();
  });

  it("最新の日付では次の日ボタンが無効化される", () => {
    render(
      <DateNavigator
        currentDate="2026-02-23"
        availableDates={dates}
        onDateChange={() => {}}
      />
    );
    expect(screen.getByLabelText("次の日")).toBeDisabled();
  });

  it("今日でない場合は今日ボタンを表示する", () => {
    render(
      <DateNavigator
        currentDate="2026-02-22"
        availableDates={dates}
        onDateChange={() => {}}
      />
    );
    expect(screen.getByText("今日")).toBeInTheDocument();
  });

  it("今日の場合は今日ボタンを表示しない", () => {
    render(
      <DateNavigator
        currentDate="2026-02-23"
        availableDates={dates}
        onDateChange={() => {}}
      />
    );
    expect(screen.queryByText("今日")).not.toBeInTheDocument();
  });

  it("今日ボタンクリックで最新日付に移動する", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateNavigator
        currentDate="2026-02-21"
        availableDates={dates}
        onDateChange={onChange}
      />
    );

    await user.click(screen.getByText("今日"));
    expect(onChange).toHaveBeenCalledWith("2026-02-23");
  });
});
