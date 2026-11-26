import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@shifton/api";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

/** Supabase の接続情報。apps/mobile/.env に設定する（docs/supabase-setup.md 参照） */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = supabaseUrl !== "" && supabaseKey !== "";

export const supabase = createClient<Database>(
  // 未設定でもアプリ自体は起動できるよう、仮の URL を入れておく
  isSupabaseConfigured ? supabaseUrl : "http://localhost",
  isSupabaseConfigured ? supabaseKey : "not-configured",
  {
    auth: {
      // ネイティブではログイン状態を端末に保存する（Web はブラウザの localStorage を使う）
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// アプリが前面にあるときだけトークンを自動更新する
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
