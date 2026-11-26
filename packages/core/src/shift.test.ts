import { describe, expect, it } from "vitest";
import { sampleShifts, sampleWorkplaces } from "./sample";
import { type Shift, shiftSchema } from "./schemas";
import {
  findConflicts,
  isOverlapping,
  sortShifts,
  summarizeByWorkplace,
  workingMinutes,
} from "./shift";

const base: Shift = {
  id: "x",
  workplaceId: "wp-1",
  date: "2026-12-01",
  startTime: "09:00",
  endTime: "13:00",
  breakMinutes: 0,
  source: "manual",
};

describe("shift", () => {
  it("休憩を除いた実働時間を計算する", () => {
    expect(workingMinutes({ startTime: "09:00", endTime: "18:00", breakMinutes: 60 })).toBe(480);
  });

  it("時間帯の重なりを判定する", () => {
    expect(isOverlapping(base, { ...base, startTime: "12:00", endTime: "15:00" })).toBe(true);
    expect(isOverlapping(base, { ...base, startTime: "13:00", endTime: "15:00" })).toBe(false);
  });

  it("日をまたぐシフトと翌日のシフトの重なりを判定する", () => {
    const night = { ...base, startTime: "22:00", endTime: "05:00" };
    const nextMorning = { ...base, date: "2026-12-02", startTime: "04:00", endTime: "08:00" };
    expect(isOverlapping(night, nextMorning)).toBe(true);
  });

  it("掛け持ち先どうしのダブルブッキングを検出する", () => {
    const conflicts = findConflicts(sampleShifts);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.map((s) => s.id)).toEqual(["s-3", "s-4"]);
  });

  it("日付・時刻順に並べる", () => {
    const sorted = sortShifts([
      { ...base, id: "b", date: "2026-12-02" },
      { ...base, id: "c", startTime: "15:00", endTime: "18:00" },
      { ...base, id: "a" },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["a", "c", "b"]);
  });

  it("勤務先ごとに集計する", () => {
    const [cafe, conbini] = summarizeByWorkplace(sampleShifts, sampleWorkplaces);
    expect(cafe?.shiftCount).toBe(2);
    expect(cafe?.workingMinutes).toBe(300 + 465);
    expect(cafe?.estimatedPay).toBe(Math.round((1200 * 765) / 60));
    expect(conbini?.workingMinutes).toBe(240 + 180);
  });

  it("不正な時刻を弾く", () => {
    expect(shiftSchema.safeParse({ ...base, startTime: "25:00" }).success).toBe(false);
  });
});
