/** 選択 UI の種類。time は "HH:mm"、date は "YYYY-MM-DD" の文字列でやり取りする */
export type PickerMode = "time" | "date";

export interface PickerFieldProps {
  label: string;
  mode: PickerMode;
  value: string;
  onChange: (value: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 文字列の値を、端末のタイムゾーンの Date に変換する */
export function toDate(mode: PickerMode, value: string): Date {
  const now = new Date();
  if (mode === "time") {
    const [h, m] = value.split(":").map(Number);
    const d = new Date(now);
    d.setHours(
      Number.isFinite(h) ? (h as number) : 10,
      Number.isFinite(m) ? (m as number) : 0,
      0,
      0,
    );
    return d;
  }
  const [y, mo, day] = value.split("-").map(Number);
  if (!y || !mo || !day) return now;
  return new Date(y, mo - 1, day);
}

/** 選ばれた Date を文字列の値に戻す */
export function fromDate(mode: PickerMode, date: Date): string {
  if (mode === "time") return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
