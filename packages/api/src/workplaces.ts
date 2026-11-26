import { colorSchema, type Workplace, workplaceColors } from "@shifton/core";
import { z } from "zod";
import type { ShiftonClient } from "./client";
import type { WorkplaceRow } from "./database.types";

export const workplaceInputSchema = z.object({
  name: z.string().trim().min(1, "勤務先の名前を入力してください").max(100),
  color: colorSchema.default(workplaceColors[0]),
  /** 空欄なら未設定 */
  hourlyWage: z
    .union([z.literal(""), z.coerce.number().int("時給は整数で入力してください").min(0)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});
export type WorkplaceInput = z.input<typeof workplaceInputSchema>;

export function toWorkplace(row: WorkplaceRow): Workplace {
  return { id: row.id, name: row.name, color: row.color, hourlyWage: row.hourly_wage };
}

/** 自分の勤務先一覧（登録順） */
export async function fetchWorkplaces(client: ShiftonClient): Promise<Workplace[]> {
  const { data, error } = await client.from("workplaces").select("*").order("created_at");
  if (error) throw error;
  return data.map(toWorkplace);
}

/** 勤務先を登録する */
export async function createWorkplace(
  client: ShiftonClient,
  input: WorkplaceInput,
): Promise<Workplace> {
  const { name, color, hourlyWage } = workplaceInputSchema.parse(input);
  const { data, error } = await client
    .from("workplaces")
    .insert({ name, color, hourly_wage: hourlyWage })
    .select()
    .single();
  if (error) throw error;
  return toWorkplace(data);
}
