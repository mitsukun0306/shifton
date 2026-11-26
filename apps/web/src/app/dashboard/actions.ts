"use server";

import {
  createShifts,
  createWorkplace,
  deleteShift,
  shiftInputSchema,
  workplaceInputSchema,
} from "@shifton/api";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean };

/** Server Action は外部から直接呼べるため、毎回ログインを確認する */
async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

function errorMessage(prefix: string, e: unknown) {
  return `${prefix}: ${e instanceof Error ? e.message : String(e)}`;
}

export async function createWorkplaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = workplaceInputSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    hourlyWage: formData.get("hourlyWage") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await createWorkplace(supabase, parsed.data);
  } catch (e) {
    return { error: errorMessage("勤務先を登録できませんでした", e) };
  }
  refresh();
  return { ok: true };
}

/** カレンダーで選んだ日に、同じ時間帯のシフトをまとめて登録する */
export async function addShiftsAction(
  inputs: Array<{
    workplaceId: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    note?: string;
  }>,
): Promise<ImportState> {
  const { supabase } = await requireUser();
  if (inputs.length === 0) return { error: "日付を選んでください" };
  for (const input of inputs) {
    const parsed = shiftInputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  }
  try {
    const created = await createShifts(supabase, inputs, "manual");
    refresh();
    return { count: created.length };
  } catch (e) {
    return { error: errorMessage("シフトを登録できませんでした", e) };
  }
}

/** シフトを1件削除する（カレンダーから呼ぶ） */
export async function removeShiftAction(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await deleteShift(supabase, id);
  refresh();
}

export type ImportState = { error?: string; count?: number };

/** 読み取ったシフトをまとめて登録する */
export async function importShiftsAction(
  workplaceId: string,
  shifts: Array<{
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    note?: string;
  }>,
): Promise<ImportState> {
  const { supabase } = await requireUser();
  const inputs = shifts.map((s) => ({ ...s, workplaceId }));
  const invalid = inputs.findIndex((s) => !shiftInputSchema.safeParse(s).success);
  if (invalid >= 0) {
    return { error: `${invalid + 1}件目のシフトの入力内容を確認してください` };
  }
  try {
    const created = await createShifts(supabase, inputs, "image");
    refresh();
    return { count: created.length };
  } catch (e) {
    return { error: errorMessage("シフトを登録できませんでした", e) };
  }
}
