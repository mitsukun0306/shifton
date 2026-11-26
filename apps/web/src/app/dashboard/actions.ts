"use server";

import {
  createShift,
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

export async function createShiftAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = shiftInputSchema.safeParse({
    workplaceId: formData.get("workplaceId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    breakMinutes: formData.get("breakMinutes") || 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await createShift(supabase, parsed.data);
  } catch (e) {
    return { error: errorMessage("シフトを登録できませんでした", e) };
  }
  refresh();
  return { ok: true };
}

export async function deleteShiftAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteShift(supabase, id);
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
