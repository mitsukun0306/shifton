import { createShift, shiftInputSchema } from "@shifton/api";
import { todayIn } from "@shifton/core";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WorkplaceForm } from "@/components/workplace-form";
import { BottomTabInset, MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useShiftData } from "@/lib/use-shift-data";

export default function AddScreen() {
  const { workplaces, reload } = useShiftData();
  const [workplaceId, setWorkplaceId] = useState<string>();
  const [date, setDate] = useState(todayIn());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  const selectedId = workplaceId ?? workplaces?.[0]?.id;

  async function submit() {
    setError(undefined);
    setMessage(undefined);
    const parsed = shiftInputSchema.safeParse({
      workplaceId: selectedId ?? "",
      date,
      startTime,
      endTime,
      breakMinutes: breakMinutes || 0,
      note: note || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setLoading(true);
    try {
      await createShift(supabase, parsed.data);
      setNote("");
      setMessage("シフトを登録しました");
    } catch (e) {
      setError(`シフトを登録できませんでした: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">シフトを追加</ThemedText>
          {workplaces?.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              先に下のフォームで勤務先を登録してください。
            </ThemedText>
          ) : (
            <ThemedView style={styles.form}>
              <ThemedText type="smallBold">勤務先</ThemedText>
              <View style={styles.chips}>
                {(workplaces ?? []).map((wp) => (
                  <Pressable
                    key={wp.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: wp.id === selectedId }}
                    onPress={() => setWorkplaceId(wp.id)}
                    style={[
                      styles.chip,
                      { borderColor: wp.color },
                      wp.id === selectedId && { backgroundColor: wp.color },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={wp.id === selectedId ? styles.chipTextSelected : undefined}
                    >
                      {wp.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <TextField label="日付（例: 2026-12-01）" value={date} onChangeText={setDate} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <TextField
                    label="開始"
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="10:00"
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="終了"
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="15:00"
                  />
                </View>
              </View>
              <TextField
                label="休憩（分）"
                value={breakMinutes}
                onChangeText={setBreakMinutes}
                keyboardType="number-pad"
              />
              <TextField label="メモ（任意）" value={note} onChangeText={setNote} />
              <ErrorText>{error}</ErrorText>
              {message && <ThemedText type="small">{message}</ThemedText>}
              <PrimaryButton title="シフトを追加" onPress={submit} loading={loading} />
            </ThemedView>
          )}

          <ThemedText type="subtitle" style={styles.spaced}>
            勤務先を追加
          </ThemedText>
          <WorkplaceForm onCreated={reload} />
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
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  form: { gap: Spacing.three },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  chipTextSelected: { color: "#fff", fontWeight: 700 },
  row: { flexDirection: "row", gap: Spacing.three },
  flex: { flex: 1 },
  spaced: { marginTop: Spacing.four },
});
