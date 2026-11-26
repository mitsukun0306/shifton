import { z } from "zod";

/** "HH:mm" 形式の時刻（00:00〜23:59） */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻は HH:mm 形式で入力してください");

/** "YYYY-MM-DD" 形式の日付 */
export const isoDateSchema = z.iso.date("日付は YYYY-MM-DD 形式で入力してください");

/** 表示色 "#RRGGBB" */
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "色の形式が正しくありません");

/** 勤務先（バイト先）。掛け持ちに対応するため複数登録できる */
export const workplaceSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "勤務先の名前を入力してください").max(100),
  color: colorSchema.default("#0284c7"),
  /** 時給（円）。未設定なら給与の概算をしない */
  hourlyWage: z.number().int().nonnegative().nullable(),
});

/** シフトをどうやって登録したか */
export const shiftSourceSchema = z.enum(["manual", "image", "file", "import"]);

/** 自分のシフト */
export const shiftSchema = z.object({
  id: z.string(),
  workplaceId: z.string(),
  date: isoDateSchema,
  startTime: timeOfDaySchema,
  /** 開始時刻以前の場合は日をまたぐ勤務（例: 22:00〜05:00） */
  endTime: timeOfDaySchema,
  breakMinutes: z.number().int().nonnegative().default(0),
  note: z.string().optional(),
  source: shiftSourceSchema.default("manual"),
});

export type Workplace = z.infer<typeof workplaceSchema>;
export type ShiftSource = z.infer<typeof shiftSourceSchema>;
export type Shift = z.infer<typeof shiftSchema>;

/** 勤務先の色の候補 */
export const workplaceColors = [
  "#0284c7",
  "#16a34a",
  "#ea580c",
  "#db2777",
  "#7c3aed",
  "#ca8a04",
] as const;
