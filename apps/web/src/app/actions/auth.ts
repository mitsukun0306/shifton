"use server";

import { credentialsSchema, translateAuthError } from "@shifton/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** email はエラー時にフォームへ入力内容を残すために返す */
export type FormState = { error?: string; message?: string; email?: string };

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

const notConfigured: FormState = {
  error: "Supabase が未設定です。docs/supabase-setup.md の手順で接続情報を設定してください",
};

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return notConfigured;
  const email = String(formData.get("email") ?? "");
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message), email };

  redirect("/dashboard");
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return notConfigured;
  const email = String(formData.get("email") ?? "");
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: translateAuthError(error.message), email };

  // メール確認が無効な設定ならそのままログイン済みになる
  if (data.session) redirect("/dashboard");
  return {
    message: "確認メールを送信しました。メール内のリンクを開くと登録が完了します。",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
