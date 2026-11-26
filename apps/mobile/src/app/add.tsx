import { createShifts, deleteShift, shiftInputSchema } from "@shifton/api";
import {
  addDays,
  addMonths,
  findConflicts,
  formatDateJa,
  formatDuration,
  formatMonthJa,
  formatShortTime,
  groupByDate,
  monthGrid,
  monthOf,
  overlappingShifts,
  type ShiftPreset,
  suggestPresets,
  todayIn,
  workingMinutes,
} from "@shifton/core";
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WorkplaceForm } from "@/components/workplace-form";
import { BottomTabInset, MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { useMonthShifts } from "@/lib/use-month-shifts";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const SUNDAY_COLOR = "#ef4444";
const SATURDAY_COLOR = "#0284c7";
const ACCENT = "#0284c7";

function weekdayColor(weekday: number) {
  if (weekday === 0) return SUNDAY_COLOR;
  if (weekday === 6) return SATURDAY_COLOR;
  return undefined;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const today = todayIn();
  const [month, setMonth] = useState(monthOf(today));
  const { workplaces, shifts, recentShifts, error, reload } = useMonthShifts(month);

  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<string[]>([today]);
  const [workplaceId, setWorkplaceId] = useState<string>();
  const [showCustom, setShowCustom] = useState(false);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string }>();
  const [busy, setBusy] = useState(false);

  const weeks = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => groupByDate(shifts), [shifts]);
  const workplaceById = useMemo(
    () => new Map((workplaces ?? []).map((wp) => [wp.id, wp])),
    [workplaces],
  );
  const conflictIds = useMemo(
    () => new Set(findConflicts(shifts).flatMap(([a, b]) => [a.id, b.id])),
    [shifts],
  );
  const selectedWorkplaceId = workplaceId ?? workplaces?.[0]?.id ?? "";
  const workplace = workplaceById.get(selectedWorkplaceId);
  const presets = useMemo(
    () => suggestPresets(recentShifts, selectedWorkplaceId),
    [recentShifts, selectedWorkplaceId],
  );

  function changeMonth(next: string) {
    setMonth(next);
    setSelected([today.startsWith(next) ? today : `${next}-01`]);
    setMessage(undefined);
  }

  function onDayPress(date: string) {
    setMessage(undefined);
    if (!multi) {
      setSelected([date]);
      return;
    }
    setSelected((cur) =>
      cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date].sort(),
    );
  }

  function toggleMulti() {
    setMulti((m) => !m);
    setSelected((cur) => cur.slice(0, 1));
    setMessage(undefined);
  }

  /** 選択中の日のうち、この時間帯を入れると他のシフトと重なる日 */
  function conflictDays(preset: Pick<ShiftPreset, "startTime" | "endTime">) {
    return selected.filter(
      (date) =>
        overlappingShifts({ date, ...preset }, [
          ...(byDate.get(date) ?? []),
          // 前日の夜勤が日をまたいで入り込むケースも見る
          ...(byDate.get(addDays(date, -1)) ?? []),
        ]).length > 0,
    );
  }

  async function add(preset: ShiftPreset) {
    if (selected.length === 0) {
      setMessage({ kind: "error", text: "カレンダーで日付を選んでください" });
      return;
    }
    const inputs = selected.map((date) => ({
      workplaceId: selectedWorkplaceId,
      date,
      ...preset,
      note: note.trim() || undefined,
    }));
    for (const input of inputs) {
      const parsed = shiftInputSchema.safeParse(input);
      if (!parsed.success) {
        setMessage({
          kind: "error",
          text: parsed.error.issues[0]?.message ?? "入力を確認してください",
        });
        return;
      }
    }
    const overlaps = conflictDays(preset);
    setBusy(true);
    try {
      const created = await createShifts(supabase, inputs, "manual");
      setNote("");
      const warn =
        overlaps.length > 0
          ? `（⚠ ${overlaps.map((d) => formatDateJa(d)).join("、")} は他のシフトと重なっています）`
          : "";
      setMessage({
        kind: overlaps.length > 0 ? "error" : "info",
        text: `${workplace?.name ?? ""}のシフトを${created.length}件追加しました${warn}`,
      });
      if (multi) setSelected([]);
      await reload();
    } catch (e) {
      setMessage({
        kind: "error",
        text: `シフトを登録できませんでした: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteShift(supabase, id);
      await reload();
    } catch (e) {
      setMessage({
        kind: "error",
        text: `削除できませんでした: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const singleDay = !multi && selected.length === 1 ? selected[0] : undefined;
  const dayShifts = singleDay ? (byDate.get(singleDay) ?? []) : [];
  const custom = { startTime, endTime, breakMinutes: Number(breakMinutes) || 0 };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ErrorText>{error}</ErrorText>
          {workplaces === null && !error && <ActivityIndicator />}

          {workplaces?.length === 0 && (
            <ThemedText themeColor="textSecondary">
              先に下のフォームで勤務先を登録してください。
            </ThemedText>
          )}

          {workplaces && workplaces.length > 0 && (
            <>
              {/* 月の切り替え */}
              <View style={styles.monthRow}>
                <Pressable
                  accessibilityLabel="前の月"
                  hitSlop={12}
                  onPress={() => changeMonth(addMonths(month, -1))}
                >
                  <ThemedText type="subtitle" themeColor="textSecondary">
                    ‹
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => changeMonth(monthOf(today))}
                  accessibilityHint="今月に戻る"
                >
                  <ThemedText style={styles.monthTitle}>{formatMonthJa(month)}</ThemedText>
                  {!today.startsWith(month) && (
                    <ThemedText type="small" style={styles.link}>
                      今月へ
                    </ThemedText>
                  )}
                </Pressable>
                <Pressable
                  accessibilityLabel="次の月"
                  hitSlop={12}
                  onPress={() => changeMonth(addMonths(month, 1))}
                >
                  <ThemedText type="subtitle" themeColor="textSecondary">
                    ›
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.modeRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  {multi ? "シフトを入れる日をタップして選択" : "日付をタップしてシフトを追加"}
                </ThemedText>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: multi }}
                  onPress={toggleMulti}
                  style={[
                    styles.modeButton,
                    { borderColor: multi ? ACCENT : theme.backgroundSelected },
                    multi && { backgroundColor: ACCENT },
                  ]}
                >
                  <ThemedText type="small" style={multi ? styles.whiteBold : undefined}>
                    {multi ? "✓ まとめて選択中" : "まとめて選択"}
                  </ThemedText>
                </Pressable>
              </View>

              {/* カレンダー本体 */}
              <View style={[styles.calendar, { borderColor: theme.backgroundSelected }]}>
                <View style={styles.week}>
                  {WEEKDAY_LABELS.map((label, i) => (
                    <View key={label} style={styles.weekdayCell}>
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        style={weekdayColor(i) ? { color: weekdayColor(i) } : undefined}
                      >
                        {label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                {weeks.map((week) => (
                  <View key={week[0]?.date} style={styles.week}>
                    {week.map((day) => {
                      const list = byDate.get(day.date) ?? [];
                      const isSelected = selected.includes(day.date);
                      const isToday = day.date === today;
                      const hasConflict = list.some((s) => conflictIds.has(s.id));
                      return (
                        <Pressable
                          key={day.date}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`${formatDateJa(day.date)}、シフト${list.length}件`}
                          onPress={() => onDayPress(day.date)}
                          style={[
                            styles.dayCell,
                            { borderColor: theme.backgroundElement },
                            !day.inMonth && { backgroundColor: theme.backgroundElement },
                            isSelected && styles.daySelected,
                          ]}
                        >
                          <View style={styles.dayHead}>
                            <View style={[styles.dayNumber, isToday && styles.todayNumber]}>
                              <ThemedText
                                style={[
                                  styles.dayNumberText,
                                  !day.inMonth && { color: theme.textSecondary },
                                  day.inMonth && weekdayColor(day.weekday)
                                    ? { color: weekdayColor(day.weekday) }
                                    : undefined,
                                  isToday && styles.whiteBold,
                                ]}
                              >
                                {Number(day.date.slice(8))}
                              </ThemedText>
                            </View>
                            {hasConflict && <ThemedText style={styles.warnMark}>⚠</ThemedText>}
                          </View>
                          {list.slice(0, 3).map((s) => (
                            <View
                              key={s.id}
                              style={[
                                styles.pill,
                                {
                                  backgroundColor:
                                    workplaceById.get(s.workplaceId)?.color ?? "#94a3b8",
                                },
                              ]}
                            >
                              <ThemedText numberOfLines={1} style={styles.pillText}>
                                {formatShortTime(s.startTime)}
                              </ThemedText>
                            </View>
                          ))}
                          {list.length > 3 && (
                            <ThemedText style={styles.more} themeColor="textSecondary">
                              +{list.length - 3}
                            </ThemedText>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* 選んだ日のシフトと、素早い追加 */}
              <ThemedView type="backgroundElement" style={styles.panel}>
                <ThemedText type="smallBold" style={styles.panelTitle}>
                  {singleDay
                    ? `${singleDay === today ? "今日 " : ""}${formatDateJa(singleDay)}`
                    : selected.length > 0
                      ? `${selected.length}日分を選択中`
                      : "日付を選んでください"}
                </ThemedText>
                {multi && selected.length > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {selected.map((d) => formatDateJa(d)).join("、")}
                  </ThemedText>
                )}

                {dayShifts.map((s) => {
                  const wp = workplaceById.get(s.workplaceId);
                  return (
                    <ThemedView
                      key={s.id}
                      style={[styles.card, { borderLeftColor: wp?.color ?? "#94a3b8" }]}
                    >
                      <View style={styles.flex}>
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
                      </View>
                      <Pressable
                        accessibilityLabel="このシフトを削除"
                        disabled={busy}
                        hitSlop={8}
                        onPress={() => remove(s.id)}
                      >
                        <ThemedText type="small" themeColor="textSecondary">
                          削除
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  );
                })}

                <ThemedText type="smallBold">勤務先</ThemedText>
                <View style={styles.chips}>
                  {workplaces.map((wp) => {
                    const active = wp.id === selectedWorkplaceId;
                    return (
                      <Pressable
                        key={wp.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setWorkplaceId(wp.id)}
                        style={[
                          styles.chip,
                          { borderColor: wp.color },
                          active && { backgroundColor: wp.color },
                        ]}
                      >
                        <ThemedText type="small" style={active ? styles.whiteBold : undefined}>
                          {wp.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <ThemedText type="smallBold">時間帯をタップで追加</ThemedText>
                <View style={styles.presets}>
                  {presets.map((p) => {
                    const overlaps = conflictDays(p);
                    const disabled = busy || selected.length === 0;
                    return (
                      <Pressable
                        key={`${p.startTime}-${p.endTime}-${p.breakMinutes}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.startTime}から${p.endTime}で追加`}
                        disabled={disabled}
                        onPress={() => add(p)}
                        style={({ pressed }) => [
                          styles.preset,
                          {
                            borderColor: workplace?.color ?? ACCENT,
                            backgroundColor: theme.background,
                          },
                          (pressed || disabled) && styles.dimmed,
                        ]}
                      >
                        <ThemedText style={styles.presetTime}>
                          {p.startTime}〜{p.endTime}
                        </ThemedText>
                        <ThemedText style={styles.presetSub} themeColor="textSecondary">
                          {p.breakMinutes > 0 ? `休憩${p.breakMinutes}分` : "休憩なし"}
                        </ThemedText>
                        {overlaps.length > 0 && (
                          <ThemedText style={styles.presetWarn}>
                            ⚠ {selected.length > 1 ? `${overlaps.length}日で重なる` : "重なりあり"}
                          </ThemedText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable onPress={() => setShowCustom((v) => !v)} hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {showCustom ? "▼" : "▶"} 時間を指定して追加
                  </ThemedText>
                </Pressable>
                {showCustom && (
                  <View style={styles.customForm}>
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
                      <View style={styles.flex}>
                        <TextField
                          label="休憩（分）"
                          value={breakMinutes}
                          onChangeText={setBreakMinutes}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                    <TextField label="メモ（任意）" value={note} onChangeText={setNote} />
                    {/^\d{2}:\d{2}$/.test(startTime) &&
                      /^\d{2}:\d{2}$/.test(endTime) &&
                      conflictDays(custom).length > 0 && (
                        <ErrorText>⚠ この時間は他のシフトと重なります</ErrorText>
                      )}
                    <PrimaryButton
                      title="この時間で追加"
                      onPress={() => add(custom)}
                      loading={busy}
                    />
                  </View>
                )}

                {message &&
                  (message.kind === "error" ? (
                    <ErrorText>{message.text}</ErrorText>
                  ) : (
                    <ThemedText type="small" style={styles.info}>
                      {message.text}
                    </ThemedText>
                  ))}
              </ThemedView>
            </>
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
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  flex: { flex: 1 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: { fontSize: 20, fontWeight: 700, textAlign: "center" },
  link: { color: ACCENT, textAlign: "center" },
  modeRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  modeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  calendar: { borderWidth: 1, borderRadius: Spacing.two, overflow: "hidden" },
  week: { flexDirection: "row" },
  weekdayCell: { flex: 1, alignItems: "center", paddingVertical: Spacing.one },
  dayCell: {
    flex: 1,
    minHeight: 72,
    padding: 2,
    gap: 2,
    borderTopWidth: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  daySelected: { borderWidth: 2, borderColor: ACCENT, backgroundColor: "rgba(2,132,199,0.12)" },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  todayNumber: { backgroundColor: ACCENT },
  dayNumberText: { fontSize: 12, lineHeight: 16 },
  warnMark: { color: "#dc2626", fontSize: 10, lineHeight: 14 },
  pill: { borderRadius: 3, paddingHorizontal: 2 },
  pillText: { color: "#fff", fontSize: 10, lineHeight: 14, fontWeight: 700 },
  more: { fontSize: 10, lineHeight: 12 },
  panel: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  panelTitle: { fontSize: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderLeftWidth: 4,
    gap: Spacing.two,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  whiteBold: { color: "#fff", fontWeight: 700 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  preset: {
    flexBasis: "47%",
    flexGrow: 1,
    alignItems: "center",
    borderWidth: 2,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  presetTime: { fontSize: 16, fontWeight: 700 },
  presetSub: { fontSize: 12, lineHeight: 16 },
  presetWarn: { fontSize: 12, lineHeight: 16, color: "#dc2626" },
  dimmed: { opacity: 0.5 },
  customForm: { gap: Spacing.three },
  row: { flexDirection: "row", gap: Spacing.two },
  info: { color: ACCENT },
  spaced: { marginTop: Spacing.four },
});
