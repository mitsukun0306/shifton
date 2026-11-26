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
  legalBreakMinutes,
  monthGrid,
  monthOf,
  overlappingShifts,
  type ShiftPreset,
  suggestPresets,
  summarizeByWorkplace,
  todayIn,
  workingMinutes,
} from "@shifton/core";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreakPicker } from "@/components/break-picker";
import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Sheet } from "@/components/sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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
  const [selected, setSelected] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "error" | "info"; text: string }>();
  const [workplaceId, setWorkplaceId] = useState<string>();
  const [showCustom, setShowCustom] = useState(false);
  /** 「時間を指定して追加」の内容。未編集のあいだは、選択中の勤務先で一番よく使う時間帯を出す */
  const [customDraft, setCustomDraft] = useState<ShiftPreset>();
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
    setSelected([]);
    setMessage(undefined);
  }

  function onDayPress(date: string) {
    setMessage(undefined);
    if (!multi) {
      setSelected([date]);
      setSheetOpen(true);
      return;
    }
    setSelected((cur) =>
      cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date].sort(),
    );
  }

  function toggleMulti() {
    setMulti((m) => !m);
    setSelected([]);
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
      startTime: preset.startTime,
      endTime: preset.endTime,
      breakMinutes: preset.breakMinutes,
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
      setMessage(undefined);
      setToast({
        kind: overlaps.length > 0 ? "error" : "info",
        text: `${workplace?.name ?? ""}のシフトを${created.length}件追加しました${warn}`,
      });
      setSheetOpen(false);
      setSelected([]);
      setMulti(false);
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

  function closeSheet() {
    setSheetOpen(false);
    setMessage(undefined);
    if (!multi) setSelected([]);
  }

  // 追加結果のお知らせは数秒で消す
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const monthTotal = useMemo(() => {
    const own = shifts.filter((s) => monthOf(s.date) === month);
    const sums = summarizeByWorkplace(own, workplaces ?? []);
    return {
      count: own.length,
      minutes: sums.reduce((t, x) => t + x.workingMinutes, 0),
      pay: sums.reduce((t, x) => t + (x.estimatedPay ?? 0), 0),
    };
  }, [shifts, workplaces, month]);

  const singleDay = !multi && selected.length === 1 ? selected[0] : undefined;
  const dayShifts = singleDay ? (byDate.get(singleDay) ?? []) : [];
  const custom: ShiftPreset = customDraft ??
    presets[0] ?? { startTime: "10:00", endTime: "15:00", breakMinutes: 0 };

  /** 開始・終了を変えたら、休憩を法定の最低時間に合わせ直す（あとから変更可） */
  function changeTime(patch: Partial<Pick<ShiftPreset, "startTime" | "endTime">>) {
    const next = { ...custom, ...patch };
    setCustomDraft({ ...next, breakMinutes: legalBreakMinutes(next.startTime, next.endTime) });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ErrorText>{error}</ErrorText>
          {workplaces === null && !error && <ActivityIndicator />}

          {workplaces?.length === 0 && (
            <ThemedText themeColor="textSecondary">
              先に「勤務先」タブで勤務先を登録してください。
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
                  <ThemedText style={styles.monthTotal} themeColor="textSecondary">
                    {monthTotal.count}回・{formatDuration(monthTotal.minutes)}
                    {monthTotal.pay > 0 ? `・約¥${monthTotal.pay.toLocaleString()}` : ""}
                  </ThemedText>
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
                  {multi ? "シフトを入れる日をタップして選択" : "日付をタップして確認・追加"}
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

              {/* まとめて選択中：選んだ日数と、時間を設定するボタン */}
              {multi && selected.length > 0 && (
                <View style={styles.selectBar}>
                  <ThemedText style={styles.selectBarText}>{selected.length}日を選択中</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSheetOpen(true)}
                    style={styles.selectBarButton}
                  >
                    <ThemedText style={styles.whiteBold}>時間を設定する</ThemedText>
                  </Pressable>
                </View>
              )}

              {toast && (
                <View
                  style={[styles.toast, toast.kind === "error" && styles.toastError]}
                  accessibilityLiveRegion="polite"
                >
                  <ThemedText type="small" style={styles.toastText}>
                    {toast.text}
                  </ThemedText>
                </View>
              )}

              {/* 選んだ日のシフトと、素早い追加（ポップアップ） */}
              <Sheet
                open={sheetOpen}
                onClose={closeSheet}
                title={
                  singleDay
                    ? `${singleDay === today ? "今日 " : ""}${formatDateJa(singleDay)}`
                    : `${selected.length}日分にまとめて追加`
                }
              >
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
                      type="backgroundElement"
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
                        onPress={() => {
                          setWorkplaceId(wp.id);
                          // 勤務先を変えたら、その勤務先で一番よく使う時間帯に戻す
                          setCustomDraft(undefined);
                        }}
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

                <ThemedText type="smallBold">
                  時間帯をタップで追加
                  <ThemedText type="small" themeColor="textSecondary">
                    {presets[0]?.count ? "（よく使う順）" : "（使うほど自分用に変わります）"}
                  </ThemedText>
                </ThemedText>
                <View style={styles.presets}>
                  {presets.map((p, i) => {
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
                        {i === 0 && p.count ? (
                          <ThemedText
                            style={[
                              styles.topBadge,
                              { backgroundColor: workplace?.color ?? ACCENT },
                            ]}
                          >
                            いちばん多い
                          </ThemedText>
                        ) : null}
                        <ThemedText style={styles.presetTime}>
                          {p.startTime}〜{p.endTime}
                        </ThemedText>
                        <ThemedText style={styles.presetSub} themeColor="textSecondary">
                          {p.breakMinutes > 0 ? `休憩${p.breakMinutes}分` : "休憩なし"}
                          {p.count ? `・${p.count}回` : ""}
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
                        <PickerField
                          label="開始"
                          mode="time"
                          value={custom.startTime}
                          onChange={(startTime) => changeTime({ startTime })}
                        />
                      </View>
                      <View style={styles.flex}>
                        <PickerField
                          label="終了"
                          mode="time"
                          value={custom.endTime}
                          onChange={(endTime) => changeTime({ endTime })}
                        />
                      </View>
                    </View>
                    <BreakPicker
                      value={custom.breakMinutes}
                      onChange={(breakMinutes) => setCustomDraft({ ...custom, breakMinutes })}
                      legalMinutes={legalBreakMinutes(custom.startTime, custom.endTime)}
                    />
                    <TextField label="メモ（任意）" value={note} onChangeText={setNote} />
                    {conflictDays(custom).length > 0 && (
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
              </Sheet>
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
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  flex: { flex: 1 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTotal: { fontSize: 12, lineHeight: 16, textAlign: "center" },
  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  selectBarText: { color: "#fff" },
  selectBarButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toast: { backgroundColor: "#0f172a", borderRadius: Spacing.three, padding: Spacing.three },
  toastError: { backgroundColor: "#b91c1c" },
  toastText: { color: "#fff" },
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
  presets: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two, paddingTop: Spacing.one },
  preset: {
    flexBasis: "47%",
    flexGrow: 1,
    alignItems: "center",
    borderWidth: 2,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  presetTime: { fontSize: 16, fontWeight: 700 },
  topBadge: {
    position: "absolute",
    top: -9,
    left: Spacing.two,
    paddingHorizontal: 6,
    borderRadius: 999,
    overflow: "hidden",
    color: "#fff",
    fontSize: 10,
    lineHeight: 16,
    fontWeight: 700,
  },
  presetSub: { fontSize: 12, lineHeight: 16 },
  presetWarn: { fontSize: 12, lineHeight: 16, color: "#dc2626" },
  dimmed: { opacity: 0.5 },
  customForm: { gap: Spacing.three },
  row: { flexDirection: "row", gap: Spacing.two },
  info: { color: ACCENT },
});
