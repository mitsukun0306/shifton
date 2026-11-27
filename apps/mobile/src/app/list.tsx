import { deleteShift } from "@shifton/api";
import {
  findConflicts,
  formatDateJa,
  formatDuration,
  todayIn,
  workingMinutes,
} from "@shifton/core";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorText } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { UPCOMING_DAYS, useShiftData } from "@/lib/use-shift-data";

export default function ListScreen() {
  const { workplaces, shifts, error, reload } = useShiftData();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function remove(id: string) {
    await deleteShift(supabase, id);
    await reload();
  }

  const today = todayIn();
  const workplaceById = new Map((workplaces ?? []).map((wp) => [wp.id, wp]));
  const conflictIds = new Set(findConflicts(shifts).flatMap(([a, b]) => [a.id, b.id]));
  const dates = [...new Set(shifts.map((s) => s.date))];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ErrorText>{error}</ErrorText>
          {workplaces === null && !error && <ActivityIndicator />}

          {workplaces?.length === 0 && (
            <ThemedText themeColor="textSecondary">
              まずは「設定」タブで勤務先を登録してください。
            </ThemedText>
          )}

          {workplaces && workplaces.length > 0 && (
            <>
              <ThemedText type="subtitle">これからのシフト</ThemedText>
              {conflictIds.size > 0 && (
                <ErrorText>時間が重なっているシフトがあります。勤務先に確認しましょう。</ErrorText>
              )}
              {shifts.length === 0 && (
                <ThemedText themeColor="textSecondary">
                  今後{UPCOMING_DAYS}
                  日間のシフトはまだありません。「カレンダー」タブから追加できます。
                </ThemedText>
              )}
              {dates.map((date) => (
                <ThemedView key={date} style={styles.section}>
                  <ThemedText type="smallBold">
                    {date === today ? "今日 " : ""}
                    {formatDateJa(date)}
                  </ThemedText>
                  {shifts
                    .filter((s) => s.date === date)
                    .map((s) => {
                      const wp = workplaceById.get(s.workplaceId);
                      return (
                        <ThemedView
                          key={s.id}
                          type="backgroundElement"
                          style={[styles.card, { borderLeftColor: wp?.color ?? "#94a3b8" }]}
                        >
                          <ThemedView type="backgroundElement" style={styles.cardBody}>
                            <ThemedText>
                              {s.startTime}〜{s.endTime}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {wp?.name}・実働 {formatDuration(workingMinutes(s))}
                              {s.note ? `・${s.note}` : ""}
                            </ThemedText>
                            {conflictIds.has(s.id) && (
                              <ErrorText>⚠ 他のシフトと重なっています</ErrorText>
                            )}
                          </ThemedView>
                          <Pressable
                            accessibilityLabel="このシフトを削除"
                            onPress={() => remove(s.id)}
                          >
                            <ThemedText type="small" themeColor="textSecondary">
                              削除
                            </ThemedText>
                          </Pressable>
                        </ThemedView>
                      );
                    })}
                </ThemedView>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    // Web ではタブバーが画面上部に重なるため、その分を空ける
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  section: { gap: Spacing.two },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    gap: Spacing.two,
  },
  cardBody: { flex: 1, gap: Spacing.one },
});
