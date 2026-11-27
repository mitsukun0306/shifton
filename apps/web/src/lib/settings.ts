"use client";

import { type AppSettings, defaultSettings, parseSettings } from "@shifton/core";
import { useCallback, useSyncExternalStore } from "react";

/** 設定はこのブラウザの localStorage に保存する */
const KEY = "shifton:settings";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: AppSettings = defaultSettings;

function read(): AppSettings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // プライベートブラウズなどで使えないときは既定値
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? parseSettings(JSON.parse(raw)) : defaultSettings;
    } catch {
      cached = defaultSettings;
    }
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 別のタブで変えたときも反映する
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** アプリの設定を読み書きする */
export function useSettings(): [AppSettings, (next: AppSettings) => void] {
  const settings = useSyncExternalStore(subscribe, read, () => defaultSettings);
  const save = useCallback((next: AppSettings) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても、この画面の間は反映する
      cachedRaw = JSON.stringify(next);
      cached = next;
    }
    for (const l of listeners) l();
  }, []);
  return [settings, save];
}
