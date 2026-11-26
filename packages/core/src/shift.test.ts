import { describe, expect, it } from "vitest";
import { sampleMembers, sampleShifts } from "./sample";
import { type Shift, shiftSchema } from "./schemas";
import { findConflicts, isOverlapping, summarizeByMember, workingMinutes } from "./shift";

const base: Shift = {
  id: "x",
  storeId: "store-1",
  memberId: "m-1",
  date: "2026-12-01",
  startTime: "09:00",
  endTime: "13:00",
  breakMinutes: 0,
  status: "draft",
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

  it("同一メンバーの重複のみを検出する", () => {
    const shifts: Shift[] = [
      base,
      { ...base, id: "y", startTime: "10:00", endTime: "11:00" },
      { ...base, id: "z", memberId: "m-2" },
    ];
    const conflicts = findConflicts(shifts);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.map((s) => s.id)).toEqual(["x", "y"]);
  });

  it("メンバーごとに集計する", () => {
    const [manager, haruka] = summarizeByMember(sampleShifts, sampleMembers);
    expect(manager?.estimatedPay).toBeNull();
    expect(haruka?.shiftCount).toBe(2);
    expect(haruka?.workingMinutes).toBe(300 + 465);
    expect(haruka?.estimatedPay).toBe(Math.round((1200 * 765) / 60));
  });

  it("不正な時刻を弾く", () => {
    expect(shiftSchema.safeParse({ ...base, startTime: "25:00" }).success).toBe(false);
  });
});
