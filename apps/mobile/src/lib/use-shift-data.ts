import { fetchShifts, fetchWorkplaces } from "@shifton/api";
import { addDays, type Shift, todayIn, type Workplace } from "@shifton/core";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { supabase } from "./supabase";

/** 一覧に表示する期間（今日から何日先まで） */
export const UPCOMING_DAYS = 30;

/** 勤務先と今後のシフトを読み込む。画面を開くたびに最新化する */
export function useShiftData() {
  const [workplaces, setWorkplaces] = useState<Workplace[] | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    try {
      setError(undefined);
      const today = todayIn();
      const [wps, list] = await Promise.all([
        fetchWorkplaces(supabase),
        fetchShifts(supabase, { from: today, to: addDays(today, UPCOMING_DAYS) }),
      ]);
      setWorkplaces(wps);
      setShifts(list);
    } catch (e) {
      setError(`読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { workplaces, shifts, error, reload };
}
