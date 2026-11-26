const MINUTES_PER_DAY = 24 * 60;

/** "HH:mm" を 0:00 からの経過分に変換する */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`不正な時刻です: ${time}`);
  }
  return h * 60 + m;
}

/** 0:00 からの経過分を "HH:mm" に変換する（24時間を超える値は翌日扱いで丸める） */
export function fromMinutes(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 開始〜終了の分数を返す。終了が開始以前なら日をまたぐ勤務として扱う。
 * 例: 22:00〜05:00 → 420分
 */
export function spanMinutes(startTime: string, endTime: string): number {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return end > start ? end - start : end + MINUTES_PER_DAY - start;
}

/** 分数を「7時間30分」のような日本語表記にする */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 指定タイムゾーンでの今日の日付（YYYY-MM-DD） */
export function todayIn(timeZone = "Asia/Tokyo", now = new Date()): string {
  // sv-SE ロケールは YYYY-MM-DD 形式で出力される
  return now.toLocaleDateString("sv-SE", { timeZone });
}

/** YYYY-MM-DD に日数を足す */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-12-01" → "12月1日(火)" */
export function formatDateJa(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${WEEKDAYS[d.getUTCDay()]})`;
}
