import type { Shift } from "./schemas";
import { isOverlapping } from "./shift";
import { addDays } from "./time";

/** "YYYY-MM" 形式の月 */
export type YearMonth = string;

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string;
  /** 表示中の月に含まれる日か（前後の月のはみ出し分は false） */
  inMonth: boolean;
  /** 0=日曜 〜 6=土曜 */
  weekday: number;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "YYYY-MM" として正しいか */
export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/** 日付（YYYY-MM-DD）の月を返す */
export function monthOf(date: string): YearMonth {
  return date.slice(0, 7);
}

/** 月に n か月足す（マイナスで前の月） */
export function addMonths(month: YearMonth, n: number): YearMonth {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const mon = (total % 12) + 1;
  return `${year}-${String(mon).padStart(2, "0")}`;
}

/** "2026-12" → "2026年12月" */
export function formatMonthJa(month: YearMonth): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}

/**
 * 月のカレンダー（週ごとの日付の並び）を作る。週は日曜始まり。
 * 前後の月の日も含めて、常に7日×週数のマス目になる。
 */
export function monthGrid(month: YearMonth): CalendarDay[][] {
  const first = `${month}-01`;
  const firstWeekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  let cursor = addDays(first, -firstWeekday);
  const weeks: CalendarDay[][] = [];
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: cursor, inMonth: monthOf(cursor) === month, weekday: i });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  } while (monthOf(cursor) === month);
  return weeks;
}

/** カレンダーに表示される最初と最後の日（シフトの取得範囲に使う） */
export function gridRange(month: YearMonth): { from: string; to: string } {
  const weeks = monthGrid(month);
  const from = weeks[0]?.[0]?.date ?? `${month}-01`;
  const to = weeks.at(-1)?.at(-1)?.date ?? `${month}-28`;
  return { from, to };
}

/** カレンダーのマス用の短い時刻表記。"10:00" → "10"、"09:30" → "9:30" */
export function formatShortTime(time: string): string {
  const [h, m] = time.split(":");
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
}

/** シフトを日付ごとにまとめる */
export function groupByDate<T extends Pick<Shift, "date">>(shifts: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const s of shifts) {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  }
  return map;
}

/** ワンタップで入れられるシフトの時間帯 */
export interface ShiftPreset {
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

/** 勤務先にまだシフトがないときの時間帯の候補 */
export const defaultShiftPresets: readonly ShiftPreset[] = [
  { startTime: "09:00", endTime: "14:00", breakMinutes: 0 },
  { startTime: "10:00", endTime: "15:00", breakMinutes: 0 },
  { startTime: "17:00", endTime: "22:00", breakMinutes: 0 },
];

/**
 * 勤務先の過去のシフトから、よく入る時間帯を多い順に返す。
 * 足りない分は defaultShiftPresets で埋める。
 */
export function suggestPresets(
  shifts: readonly Pick<Shift, "workplaceId" | "startTime" | "endTime" | "breakMinutes">[],
  workplaceId: string,
  limit = 4,
): ShiftPreset[] {
  const counts = new Map<string, { preset: ShiftPreset; count: number }>();
  for (const s of shifts) {
    if (s.workplaceId !== workplaceId) continue;
    const key = `${s.startTime}-${s.endTime}-${s.breakMinutes}`;
    const entry = counts.get(key);
    if (entry) entry.count++;
    else
      counts.set(key, {
        preset: { startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes },
        count: 1,
      });
  }
  const frequent = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.preset.startTime.localeCompare(b.preset.startTime))
    .map((e) => e.preset);

  const result = frequent.slice(0, limit);
  for (const d of defaultShiftPresets) {
    if (result.length >= limit) break;
    const dup = result.some((p) => p.startTime === d.startTime && p.endTime === d.endTime);
    if (!dup) result.push(d);
  }
  return result;
}

/** これから入れようとしているシフトと時間が重なる、既存のシフトを返す */
export function overlappingShifts<T extends Pick<Shift, "date" | "startTime" | "endTime">>(
  candidate: Pick<Shift, "date" | "startTime" | "endTime">,
  existing: readonly T[],
): T[] {
  return existing.filter((s) => isOverlapping(candidate, s));
}
