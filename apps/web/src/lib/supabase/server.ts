import "server-only";
import type { Database } from "@shifton/api";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";

/** サーバーコンポーネント・Server Action・Route Handler 用の Supabase クライアント */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // サーバーコンポーネントからは Cookie を書き込めない。
          // セッションの更新は proxy.ts が行うので無視してよい。
        }
      },
    },
  });
}

/** ログイン中のユーザーを取得する（未ログインなら null） */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}
