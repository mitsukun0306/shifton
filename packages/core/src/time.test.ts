import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateJa,
  formatDuration,
  fromMinutes,
  spanMinutes,
  todayIn,
  toMinutes,
} from "./time";

describe("time", () => {
  it("HH:mm と分を相互変換できる", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(fromMinutes(570)).toBe("09:30");
    expect(fromMinutes(24 * 60 + 15)).toBe("00:15");
  });

  it("日をまたぐ勤務の長さを計算できる", () => {
    expect(spanMinutes("09:00", "18:00")).toBe(540);
    expect(spanMinutes("22:00", "05:00")).toBe(420);
  });

  it("時間を日本語で表記できる", () => {
    expect(formatDuration(45)).toBe("45分");
    expect(formatDuration(120)).toBe("2時間");
    expect(formatDuration(450)).toBe("7時間30分");
  });
});

describe("date", () => {
  it("日本時間の今日を求める", () => {
    // UTC 2026-11-30 16:00 は日本時間 12/1 1:00
    expect(todayIn("Asia/Tokyo", new Date("2026-11-30T16:00:00Z"))).toBe("2026-12-01");
  });

  it("日付を加算する（月またぎ）", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-01", -1)).toBe("2026-11-30");
  });

  it("日本語の日付表記にする", () => {
    expect(formatDateJa("2026-12-01")).toBe("12月1日(火)");
  });
});
