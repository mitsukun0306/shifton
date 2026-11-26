import {
  formatDuration,
  formatMonthJa,
  monthOf,
  summarizeByWorkplace,
  todayIn,
} from "@shifton/core";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorText, PrimaryButton } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WorkplaceForm } from "@/components/workplace-form";
import { BottomTabInset, MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useMonthShifts } from "@/lib/use-month-shifts";

/** 勤務先の一覧と今月の実績。勤務先の追加はポップアップで行う */
export default function WorkplacesScreen() {
  const { session } = useAuth();
  const month = monthOf(todayIn());
  const { workplaces, shifts, error, reload } = useMonthShifts(month);
  const [adding, setAdding] = useState(false);

  const summaries = new Map(
    summarizeByWorkplace(
      shifts.filter((s) => monthOf(s.date) === month),
      workplaces ?? [],
    ).map((sum) => [sum.workplaceId, sum]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle">勤務先</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatMonthJa(month)}の実績
            </ThemedText>
          </View>
          <ErrorText>{error}</ErrorText>
          {workplaces === null && !error && <ActivityIndicator />}
          {workplaces?.length === 0 && (
            <ThemedText themeColor="textSecondary">
              まだ勤務先がありません。下のボタンから登録しましょう。掛け持ちしている場合は複数登録できます。
            </ThemedText>
          )}

          {workplaces?.map((wp) => {
            const sum = summaries.get(wp.id);
            return (
              <ThemedView
                key={wp.id}
                type="backgroundElement"
                style={[styles.card, { borderLeftColor: wp.color }]}
              >
                <View style={styles.flex}>
                  <ThemedText>{wp.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {wp.hourlyWage !== null
                      ? `時給 ¥${wp.hourlyWage.toLocaleString()}`
                      : "時給未設定"}
                  </ThemedText>
                </View>
                <View style={styles.stats}>
                  <ThemedText type="small">
                    {sum?.shiftCount ?? 0}回・{formatDuration(sum?.workingMinutes ?? 0)}
                  </ThemedText>
                  {sum?.estimatedPay != null && (
                    <ThemedText type="small" themeColor="textSecondary">
                      約¥{sum.estimatedPay.toLocaleString()}
                    </ThemedText>
                  )}
                </View>
              </ThemedView>
            );
          })}

          <PrimaryButton title="＋ 勤務先を追加" onPress={() => setAdding(true)} />

          <View style={styles.account}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              {session?.user.email}
            </ThemedText>
            <Pressable onPress={() => supabase.auth.signOut()} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                ログアウト
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Sheet open={adding} onClose={() => setAdding(false)} title="勤務先を追加">
        <WorkplaceForm
          onCreated={() => {
            setAdding(false);
            reload();
          }}
        />
      </Sheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  flex: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    gap: Spacing.two,
  },
  stats: { alignItems: "flex-end" },
  account: { flexDirection: "row", alignItems: "center", marginTop: Spacing.four },
});
