import { type AppSettings, appSettingsSchema, defaultSettings, parseSettings } from "@shifton/core";
import type { ShiftonClient } from "./client";

/** 自分の設定を読み込む。まだ保存していなければ既定値 */
export async function fetchSettings(client: ShiftonClient): Promise<AppSettings> {
  const { data, error } = await client.from("user_settings").select("settings").maybeSingle();
  if (error) throw error;
  return data ? parseSettings(data.settings) : defaultSettings;
}

/** 自分の設定を保存する（どの端末からでも同じ設定になる） */
export async function saveSettings(client: ShiftonClient, settings: AppSettings): Promise<void> {
  const valid = appSettingsSchema.parse(settings);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("ログインしていません");
  const { error } = await client
    .from("user_settings")
    .upsert({ user_id: user.id, settings: valid }, { onConflict: "user_id" });
  if (error) throw error;
}
