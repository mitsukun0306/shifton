import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSettings, saveSettings } from "@shifton/api";
import { type AppSettings, defaultSettings, parseSettings } from "@shifton/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { useAuth } from "./auth-context";
import { supabase } from "./supabase";

/** 起動直後にすぐ使えるよう、最後に読み込んだ設定を端末にも控えておく */
const CACHE_KEY = "shifton:settings";

type SettingsState = {
  settings: AppSettings;
  save: (next: AppSettings) => void;
  /** 読み込み・保存に失敗したときの理由 */
  error?: string;
};

const SettingsContext = createContext<SettingsState>({
  settings: defaultSettings,
  save: () => {},
});

function errorText(e: unknown) {
  return e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
}

/**
 * 設定はアカウント（Supabase）に保存し、同じアカウントならどの端末でも同じ設定になる。
 * アプリを開くたび・前面に戻るたびに最新の設定を読み込み直す。
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [error, setError] = useState<string>();
  const saving = useRef(false);

  const load = useCallback(async () => {
    if (!userId || saving.current) return;
    try {
      const remote = await fetchSettings(supabase);
      setSettings(remote);
      setError(undefined);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote)).catch(() => {});
    } catch (e) {
      setError(errorText(e));
    }
  }, [userId]);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => raw && setSettings(parseSettings(JSON.parse(raw))))
      .catch(() => {})
      .finally(load);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => sub.remove();
  }, [load]);

  const save = useCallback((next: AppSettings) => {
    setSettings(next);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
    saving.current = true;
    saveSettings(supabase, next)
      .then(() => setError(undefined))
      .catch((e) => setError(errorText(e)))
      .finally(() => {
        saving.current = false;
      });
  }, []);

  return <SettingsContext value={{ settings, save, error }}>{children}</SettingsContext>;
}

/** アプリの設定を読み書きする（どの画面で変えても全画面に反映される） */
export function useSettings(): [AppSettings, (next: AppSettings) => void, string | undefined] {
  const { settings, save, error } = useContext(SettingsContext);
  return [settings, save, error];
}
