import {
  formatDuration,
  sampleMembers,
  sampleShifts,
  sampleStore,
  workingMinutes,
} from "@shifton/core";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

const memberName = new Map(sampleMembers.map((m) => [m.id, m.displayName]));

export default function ShiftsScreen() {
  const dates = [...new Set(sampleShifts.map((s) => s.date))].sort();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            しふとん！
          </ThemedText>
          <ThemedText type="subtitle">{sampleStore.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ※ 現在はサンプルデータを表示しています
          </ThemedText>

          {dates.map((date) => (
            <ThemedView key={date} style={styles.day}>
              <ThemedText type="smallBold">{date}</ThemedText>
              {sampleShifts
                .filter((s) => s.date === date)
                .map((s) => (
                  <ThemedView key={s.id} type="backgroundElement" style={styles.card}>
                    <ThemedText>{memberName.get(s.memberId)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {s.startTime}〜{s.endTime}（実働 {formatDuration(workingMinutes(s))}）
                      {s.status === "draft" ? "・下書き" : ""}
                    </ThemedText>
                  </ThemedView>
                ))}
            </ThemedView>
          ))}
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
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  day: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
