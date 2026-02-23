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

  it("availableDatesが空配列の場合、前後ボタンが無効化される", () => {
    render(
      <DateNavigator
        currentDate="2026-02-23"
        availableDates={[]}
        onDateChange={() => {}}
      />
    );
    expect(screen.getByLabelText("前の日")).toBeDisabled();
    expect(screen.getByLabelText("次の日")).toBeDisabled();
  });

  it("currentDateがavailableDatesに存在しない場合、前後ボタンが無効化される", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateNavigator
        currentDate="2026-01-01"
        availableDates={dates}
        onDateChange={onChange}
      />
    );
    // indexOf=-1 なので hasPrev=false, hasNext=false
    expect(screen.getByLabelText("前の日")).toBeDisabled();
    expect(screen.getByLabelText("次の日")).toBeDisabled();

    // 今日ボタンは表示される（currentDateが最新日でないので）
    expect(screen.getByText("今日")).toBeInTheDocument();
    await user.click(screen.getByText("今日"));
    expect(onChange).toHaveBeenCalledWith("2026-02-23");
  });

  it("availableDatesが1件のみの場合、前後ボタンが両方無効化される", () => {
    render(
      <DateNavigator
        currentDate="2026-02-23"
        availableDates={["2026-02-23"]}
        onDateChange={() => {}}
      />
    );
    expect(screen.getByLabelText("前の日")).toBeDisabled();
    expect(screen.getByLabelText("次の日")).toBeDisabled();
    // 今日なので今日ボタンは非表示
    expect(screen.queryByText("今日")).not.toBeInTheDocument();
  });
});
