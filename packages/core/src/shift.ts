import type { Member, Shift } from "./schemas";
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

/** 同じメンバーに重複して割り当てられているシフトの組を返す */
export function findConflicts(shifts: readonly Shift[]): Array<[Shift, Shift]> {
  const conflicts: Array<[Shift, Shift]> = [];
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const a = shifts[i];
      const b = shifts[j];
      if (a && b && a.memberId === b.memberId && isOverlapping(a, b)) {
        conflicts.push([a, b]);
      }
    }
  }
  return conflicts;
}

export interface MemberSummary {
  memberId: string;
  shiftCount: number;
  workingMinutes: number;
  /** 時給未設定の場合は null */
  estimatedPay: number | null;
}

/** メンバーごとの勤務回数・実働時間・概算給与を集計する */
export function summarizeByMember(
  shifts: readonly Shift[],
  members: readonly Member[],
): MemberSummary[] {
  return members.map((member) => {
    const own = shifts.filter((s) => s.memberId === member.id);
    const minutes = own.reduce((sum, s) => sum + workingMinutes(s), 0);
    return {
      memberId: member.id,
      shiftCount: own.length,
      workingMinutes: minutes,
      estimatedPay:
        member.hourlyWage === null ? null : Math.round((member.hourlyWage * minutes) / 60),
    };
  });
}
