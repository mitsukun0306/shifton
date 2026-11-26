import { z } from "zod";

/** "HH:mm" 形式の時刻（00:00〜23:59） */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻は HH:mm 形式で入力してください");

/** "YYYY-MM-DD" 形式の日付 */
export const isoDateSchema = z.iso.date();

/** 組織内での役割 */
export const memberRoleSchema = z.enum(["owner", "manager", "staff"]);

/** 店舗・事業所 */
export const storeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "店舗名を入力してください"),
  timezone: z.string().default("Asia/Tokyo"),
});

/** 店舗に所属するメンバー（アルバイト・店長など） */
export const memberSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  displayName: z.string().min(1, "名前を入力してください"),
  role: memberRoleSchema,
  /** 時給（円）。未設定の場合は人件費計算の対象外 */
  hourlyWage: z.number().int().nonnegative().nullable(),
});

/** シフトの状態 */
export const shiftStatusSchema = z.enum(["draft", "published"]);

/** 確定・作成中のシフト */
export const shiftSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  memberId: z.string(),
  date: isoDateSchema,
  startTime: timeOfDaySchema,
  /** 開始時刻より前の場合は日をまたぐ勤務（例: 22:00〜05:00） */
  endTime: timeOfDaySchema,
  breakMinutes: z.number().int().nonnegative().default(0),
  status: shiftStatusSchema.default("draft"),
  note: z.string().optional(),
});

/** 希望シフトの種別 */
export const availabilitySchema = z.enum(["preferred", "available", "unavailable"]);

/** スタッフが提出する希望シフト */
export const shiftRequestSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  memberId: z.string(),
  date: isoDateSchema,
  availability: availabilitySchema,
  startTime: timeOfDaySchema.optional(),
  endTime: timeOfDaySchema.optional(),
  note: z.string().optional(),
});

export type TimeOfDay = z.infer<typeof timeOfDaySchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type Store = z.infer<typeof storeSchema>;
export type Member = z.infer<typeof memberSchema>;
export type ShiftStatus = z.infer<typeof shiftStatusSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type ShiftRequest = z.infer<typeof shiftRequestSchema>;
