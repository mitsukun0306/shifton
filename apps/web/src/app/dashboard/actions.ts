"use server";

import { createStore, createStoreInputSchema } from "@shifton/api";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export type CreateStoreState = { error?: string };

export async function createStoreAction(
  _prev: CreateStoreState,
  formData: FormData,
): Promise<CreateStoreState> {
  // Server Action は外部から直接呼べるため、ここでもログインを確認する
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const parsed = createStoreInputSchema.safeParse({
    storeName: formData.get("storeName"),
    ownerName: formData.get("ownerName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await createStore(current.supabase, parsed.data);
  } catch (e) {
    return { error: `店舗を作成できませんでした: ${e instanceof Error ? e.message : String(e)}` };
  }
  refresh();
  return {};
}
