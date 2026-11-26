import type { Shift } from "./schemas";
import { isOverlapping } from "./shift";
import { addDays, spanMinutes } from "./time";

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

const TIME_PATTERN = /^\d{1,2}:\d{2}$/;
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
  /** 過去に使った回数（履歴から出した候補のみ） */
  count?: number;
}

/**
 * 労働基準法第34条（厚生労働省）で定められた最低限の休憩時間（分）。
 * 労働時間が6時間を超えると45分以上、8時間を超えると60分以上の休憩が必要。
 * 拘束時間（開始〜終了）から休憩を引いた労働時間で判定する。
 */
export function legalBreakMinutes(startTime: string, endTime: string): number {
  // 入力途中など時刻として読めないときは判定しない
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return 0;
  const span = spanMinutes(startTime, endTime);
  if (span <= 6 * 60) return 0;
  // 45分休んでも労働時間が8時間を超えるなら60分
  if (span - 45 <= 8 * 60) return 45;
  return 60;
}

function preset(startTime: string, endTime: string): ShiftPreset {
  return { startTime, endTime, breakMinutes: legalBreakMinutes(startTime, endTime) };
}

/** 勤務先にまだシフトの履歴がないときの時間帯の候補（休憩は法定の最低時間） */
export const defaultShiftPresets: readonly ShiftPreset[] = [
  preset("09:00", "14:00"),
  preset("10:00", "15:00"),
  preset("09:00", "18:00"),
  preset("17:00", "22:00"),
];

/**
 * 勤務先の過去のシフトから、使った回数が多い時間帯の順に返す（1番目が最もよく使う時間帯）。
 * 履歴がない勤務先だけ defaultShiftPresets を返す。
 */
export function suggestPresets(
  shifts: readonly Pick<Shift, "workplaceId" | "startTime" | "endTime" | "breakMinutes">[],
  workplaceId: string,
  limit = 4,
): ShiftPreset[] {
  const counts = new Map<string, Required<ShiftPreset>>();
  for (const s of shifts) {
    if (s.workplaceId !== workplaceId) continue;
    const key = `${s.startTime}-${s.endTime}-${s.breakMinutes}`;
    const entry = counts.get(key);
    if (entry) entry.count++;
    else
      counts.set(key, {
        startTime: s.startTime,
        endTime: s.endTime,
        breakMinutes: s.breakMinutes,
        count: 1,
      });
  }
  if (counts.size === 0) return defaultShiftPresets.slice(0, limit);
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.startTime.localeCompare(b.startTime))
    .slice(0, limit);
}

/** これから入れようとしているシフトと時間が重なる、既存のシフトを返す */
export function overlappingShifts<T extends Pick<Shift, "date" | "startTime" | "endTime">>(
  candidate: Pick<Shift, "date" | "startTime" | "endTime">,
  existing: readonly T[],
): T[] {
  return existing.filter((s) => isOverlapping(candidate, s));
}

/** 休憩時間を選ぶボタンの候補（分） */
export const breakMinuteOptions = [0, 15, 30, 45, 60, 90] as const;
