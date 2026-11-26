import { isoDateSchema, type Shift, timeOfDaySchema } from "@shifton/core";
import { z } from "zod";
import type { ShiftonClient } from "./client";
import type { ShiftRow } from "./database.types";

export const shiftInputSchema = z.object({
  workplaceId: z.string().min(1, "勤務先を選んでください"),
  date: isoDateSchema,
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  breakMinutes: z.coerce
    .number()
    .int("休憩は分単位の整数で入力してください")
    .min(0)
    .max(24 * 60)
    .default(0),
  note: z.string().trim().max(500).optional(),
});
export type ShiftInput = z.input<typeof shiftInputSchema>;

export function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    workplaceId: row.workplace_id,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    breakMinutes: row.break_minutes,
    note: row.note ?? undefined,
    source: row.source,
  };
}

/** 指定期間（両端を含む）の自分のシフトを日付・時刻順に取得する */
export async function fetchShifts(
  client: ShiftonClient,
  range: { from: string; to: string },
): Promise<Shift[]> {
  const { data, error } = await client
    .from("shifts")
    .select("*")
    .gte("date", range.from)
    .lte("date", range.to)
    .order("date")
    .order("start_time");
  if (error) throw error;
  return data.map(toShift);
}

/** シフトを登録する */
export async function createShift(client: ShiftonClient, input: ShiftInput): Promise<Shift> {
  const s = shiftInputSchema.parse(input);
  const { data, error } = await client
    .from("shifts")
    .insert({
      workplace_id: s.workplaceId,
      date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      break_minutes: s.breakMinutes,
      note: s.note || null,
    })
    .select()
    .single();
  if (error) throw error;
  return toShift(data);
}

/** シフトを削除する */
export async function deleteShift(client: ShiftonClient, id: string): Promise<void> {
  const { error } = await client.from("shifts").delete().eq("id", id);
  if (error) throw error;
}
