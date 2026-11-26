import { describe, expect, it } from "vitest";
import { formatDuration, fromMinutes, spanMinutes, toMinutes } from "./time";

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
