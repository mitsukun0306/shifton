import type { Shift, Workplace } from "./schemas";
import { spanMinutes, toMinutes } from "./time";

type ShiftTime = Pick<Shift, "date" | "startTime" | "endTime">;

/** 休憩を除いた実働時間（分） */
export function workingMinutes(shift: Pick<Shift, "startTime" | "endTime" | "breakMinutes">) {
  return Math.max(0, spanMinutes(shift.startTime, shift.endTime) - shift.breakMinutes);
}

/** シフトを UTC 基準の絶対分（エポックからの分）の区間に変換する */
function toInterval(shift: ShiftTime): [number, number] {
  const dayStart = Date.parse(`${shift.date}T00:00:00Z`) / 60_000;
  const start = dayStart + toMinutes(shift.startTime);
  return [start, start + spanMinutes(shift.startTime, shift.endTime)];
}

/** 2つのシフトの時間帯が重なっているか（日またぎも考慮） */
export function isOverlapping(a: ShiftTime, b: ShiftTime): boolean {
  const [aStart, aEnd] = toInterval(a);
  const [bStart, bEnd] = toInterval(b);
  return aStart < bEnd && bStart < aEnd;
}

/** 時間が重なっているシフトの組を返す（掛け持ち先どうしのダブルブッキング検出） */
export function findConflicts<T extends ShiftTime>(shifts: readonly T[]): Array<[T, T]> {
  const conflicts: Array<[T, T]> = [];
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const a = shifts[i];
      const b = shifts[j];
      if (a && b && isOverlapping(a, b)) conflicts.push([a, b]);
    }
  }
  return conflicts;
}

/** 日付・開始時刻の順に並べる */
export function sortShifts<T extends ShiftTime>(shifts: readonly T[]): T[] {
  return [...shifts].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
}

export interface WorkplaceSummary {
  workplaceId: string;
  shiftCount: number;
  workingMinutes: number;
  /** 時給未設定の場合は null */
  estimatedPay: number | null;
}

/** 勤務先ごとの勤務回数・実働時間・概算給与を集計する */
export function summarizeByWorkplace(
  shifts: readonly Shift[],
  workplaces: readonly Workplace[],
): WorkplaceSummary[] {
  return workplaces.map((wp) => {
    const own = shifts.filter((s) => s.workplaceId === wp.id);
    const minutes = own.reduce((sum, s) => sum + workingMinutes(s), 0);
    return {
      workplaceId: wp.id,
      shiftCount: own.length,
      workingMinutes: minutes,
      estimatedPay: wp.hourlyWage === null ? null : Math.round((wp.hourlyWage * minutes) / 60),
    };
  });
}
