import { fetchShifts, fetchWorkplaces } from "@shifton/api";
import {
  addDays,
  gridRange,
  type Shift,
  todayIn,
  type Workplace,
  type YearMonth,
} from "@shifton/core";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { supabase } from "./supabase";

/** よく入る時間帯を提案するために、何日前までのシフトを見るか */
const PRESET_LOOKBACK_DAYS = 90;

/**
 * カレンダーに表示する月のシフトと、時間帯の提案に使う最近のシフトを読み込む。
 * 画面を開くたび・月を切り替えるたびに最新化する。
 */
export function useMonthShifts(month: YearMonth) {
  const [workplaces, setWorkplaces] = useState<Workplace[] | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    try {
      setError(undefined);
      const today = todayIn();
      const range = gridRange(month);
      const lookbackFrom = addDays(today, -PRESET_LOOKBACK_DAYS);
      const [wps, list] = await Promise.all([
        fetchWorkplaces(supabase),
        fetchShifts(supabase, {
          from: [lookbackFrom, range.from].sort()[0] ?? range.from,
          to: [today, range.to].sort()[1] ?? range.to,
        }),
      ]);
      setWorkplaces(wps);
      setShifts(list.filter((s) => s.date >= range.from && s.date <= range.to));
      setRecentShifts(list.filter((s) => s.date >= lookbackFrom && s.date <= today));
    } catch (e) {
      setError(`読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { workplaces, shifts, recentShifts, error, reload };
}
