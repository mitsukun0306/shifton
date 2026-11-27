import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatMonthJa,
  formatShortTime,
  gridRange,
  groupByDate,
  isYearMonth,
  legalBreakMinutes,
  monthGrid,
  overlappingShifts,
  suggestPresets,
} from "./calendar";

describe("calendar", () => {
  it("月を足し引きできる（年をまたぐ）", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 14)).toBe("2028-01");
  });

  it("月の形式を判定する", () => {
    expect(isYearMonth("2026-12")).toBe(true);
    expect(isYearMonth("2026-13")).toBe(false);
    expect(isYearMonth(undefined)).toBe(false);
    expect(formatMonthJa("2026-12")).toBe("2026年12月");
  });

  it("日曜始まりのマス目を作る", () => {
    // 2026年12月1日は火曜日
    const weeks = monthGrid("2026-12");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.[0]).toEqual({ date: "2026-11-29", inMonth: false, weekday: 0 });
    expect(weeks[0]?.[2]).toEqual({ date: "2026-12-01", inMonth: true, weekday: 2 });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(gridRange("2026-12")).toEqual({ from: "2026-11-29", to: "2027-01-02" });
  });

  it("1日が日曜の月は前の月の日を含まない", () => {
    // 2026年11月1日は日曜日
    expect(monthGrid("2026-11")[0]?.[0]?.date).toBe("2026-11-01");
  });

  it("マス用に時刻を短く表記する", () => {
    expect(formatShortTime("10:00")).toBe("10");
    expect(formatShortTime("09:30")).toBe("9:30");
    expect(formatShortTime("00:00")).toBe("0");
  });

  it("日付ごとにまとめる", () => {
    const map = groupByDate([
      { date: "2026-12-01" },
      { date: "2026-12-02" },
      { date: "2026-12-01" },
    ]);
    expect(map.get("2026-12-01")).toHaveLength(2);
  });

  it("使った回数が多い時間帯の順に提案する（履歴があれば履歴のみ）", () => {
    const s = (startTime: string, endTime: string, workplaceId = "a") => ({
      workplaceId,
      startTime,
      endTime,
      breakMinutes: 0,
    });
    const presets = suggestPresets(
      [s("11:00", "16:00"), s("18:00", "22:00"), s("18:00", "22:00"), s("08:00", "12:00", "b")],
      "a",
    );
    expect(presets).toEqual([
      { startTime: "18:00", endTime: "22:00", breakMinutes: 0, count: 2 },
      { startTime: "11:00", endTime: "16:00", breakMinutes: 0, count: 1 },
    ]);
  });

  it("履歴がない勤務先には既定の時間帯（法定休憩つき）を出す", () => {
    const presets = suggestPresets([], "a");
    expect(presets[0]).toEqual({ startTime: "09:00", endTime: "14:00", breakMinutes: 0 });
    expect(presets.find((p) => p.endTime === "18:00")?.breakMinutes).toBe(60);
  });

  it("労働基準法の最低休憩時間を計算する", () => {
    expect(legalBreakMinutes("10:00", "16:00")).toBe(0); // ちょうど6時間
    expect(legalBreakMinutes("10:00", "16:30")).toBe(45);
    expect(legalBreakMinutes("09:00", "17:45")).toBe(45); // 45分休めば労働8時間
    expect(legalBreakMinutes("09:00", "17:46")).toBe(60);
    expect(legalBreakMinutes("09:00", "18:00")).toBe(60);
    expect(legalBreakMinutes("22:00", "07:00")).toBe(60); // 日またぎ
    expect(legalBreakMinutes("", "07:00")).toBe(0); // 入力途中
  });

  it("入れようとしているシフトと重なる既存シフトを返す", () => {
    const existing = [
      { id: "1", date: "2026-12-01", startTime: "10:00", endTime: "15:00" },
      { id: "2", date: "2026-12-01", startTime: "18:00", endTime: "22:00" },
    ];
    const hits = overlappingShifts(
      { date: "2026-12-01", startTime: "14:00", endTime: "17:00" },
      existing,
    );
    expect(hits.map((h) => h.id)).toEqual(["1"]);
  });
});
