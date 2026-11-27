import AsyncStorage from "@react-native-async-storage/async-storage";
import { type AppSettings, defaultSettings, parseSettings } from "@shifton/core";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

/** 設定はこの端末に保存する */
const KEY = "shifton:settings";

const SettingsContext = createContext<[AppSettings, (next: AppSettings) => void]>([
  defaultSettings,
  () => {},
]);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSettings(parseSettings(JSON.parse(raw))))
      .catch(() => {});
  }, []);

  const save = useCallback((next: AppSettings) => {
    setSettings(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return <SettingsContext value={[settings, save]}>{children}</SettingsContext>;
}

/** アプリの設定を読み書きする（どの画面で変えても全画面に反映される） */
export function useSettings() {
  return useContext(SettingsContext);
}
