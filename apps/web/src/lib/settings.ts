import { fetchSettings, type ShiftonClient } from "@shifton/api";
import { type AppSettings, defaultSettings } from "@shifton/core";

/**
 * アカウントの設定を読み込む。設定用のテーブルがまだ作られていないなどで読めないときは、
 * 画面が止まらないよう既定値を使い、理由を error で返す。
 */
export async function fetchSettingsOrDefault(
  client: ShiftonClient,
): Promise<{ settings: AppSettings; error?: string }> {
  try {
    return { settings: await fetchSettings(client) };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : String((e as { message?: string }).message ?? e);
    return { settings: defaultSettings, error: message };
  }
}
