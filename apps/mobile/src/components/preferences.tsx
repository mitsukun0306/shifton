import {
  type BreakRule,
  breakForRules,
  defaultSettings,
  describeBreakRules,
  isBreakLegal,
  isLegalBreakRules,
  legalBreakRules,
} from "@shifton/core";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ErrorText, PrimaryButton } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/lib/settings-context";

const ACCENT = "#0284c7";
const OPTION_CHOICES = [0, 10, 15, 20, 30, 45, 60, 75, 90, 120];
const COUNT_CHOICES = [2, 3, 4, 6, 8];

function formatSpan(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}時間${m ? `${m}分` : ""}`;
}

function formatHm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** 設定の1行。タップすると編集用のポップアップを開く */
function SettingRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <ThemedText>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

/** －／＋で数を増減するボタン */
function Stepper({
  value,
  format,
  onChange,
  step,
  min,
  max,
}: {
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  const theme = useTheme();
  const button = (label: string, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "－" ? "減らす" : "増やす"}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={[
        styles.stepButton,
        { backgroundColor: theme.backgroundSelected },
        disabled && styles.dimmed,
      ]}
    >
      <ThemedText style={styles.stepLabel}>{label}</ThemedText>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button("－", value - step, value - step < min)}
      <ThemedText style={styles.stepValue}>{format(value)}</ThemedText>
      {button("＋", value + step, value + step > max)}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? ACCENT : theme.backgroundSelected },
        active && { backgroundColor: ACCENT },
      ]}
    >
      <ThemedText type="small" style={active ? styles.activeText : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 休憩・時間帯の候補などの設定（この端末に保存） */
export function Preferences() {
  const [settings, save] = useSettings();
  const [editing, setEditing] = useState<"rules" | "options" | "count">();
  const [draftRules, setDraftRules] = useState<BreakRule[]>([]);

  function openRules() {
    setDraftRules([...settings.breakRules]);
    setEditing("rules");
  }

  function updateRule(i: number, patch: Partial<BreakRule>) {
    setDraftRules(draftRules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  // 6〜13時間の勤務を15分刻みで試して、法律の最低限を下回る場合があるか調べる
  const draftBelowLegal = Array.from({ length: 29 }, (_, i) => 6 * 60 + i * 15).some((span) => {
    const end = formatHm(span);
    return !isBreakLegal("00:00", end, breakForRules("00:00", end, draftRules));
  });
  const close = () => setEditing(undefined);

  return (
    <>
      <ThemedView type="backgroundElement" style={styles.group}>
        <SettingRow
          label="休憩の自動入力"
          value={`${describeBreakRules(settings.breakRules)}${isLegalBreakRules(settings.breakRules) ? "（法定の最低時間）" : ""}`}
          onPress={openRules}
        />
        <SettingRow
          label="休憩ボタンの候補"
          value={settings.breakOptions.map((m) => (m === 0 ? "なし" : `${m}分`)).join("・")}
          onPress={() => setEditing("options")}
        />
        <SettingRow
          label="時間帯の候補の数"
          value={`${settings.presetCount}個（よく使う順）`}
          onPress={() => setEditing("count")}
        />
      </ThemedView>

      <Sheet open={editing === "rules"} onClose={close} title="休憩の自動入力">
        <ThemedText type="small" themeColor="textSecondary">
          シフトの時間を選んだとき、勤務時間に応じて休憩を自動で入れます。入れたあとも変更できます。
        </ThemedText>
        {draftRules.length === 0 && <ThemedText>休憩を自動で入れません。</ThemedText>}
        {draftRules.map((rule, i) => (
          <ThemedView
            // biome-ignore lint/suspicious/noArrayIndexKey: 編集中は並び替えない
            key={i}
            type="backgroundElement"
            style={styles.ruleCard}
          >
            <View style={styles.ruleRow}>
              <ThemedText type="small" style={styles.ruleLabel}>
                勤務が
              </ThemedText>
              <Stepper
                value={rule.overMinutes}
                format={formatSpan}
                onChange={(overMinutes) => updateRule(i, { overMinutes })}
                step={30}
                min={30}
                max={12 * 60}
              />
              <ThemedText type="small">を超えたら</ThemedText>
            </View>
            <View style={styles.ruleRow}>
              <ThemedText type="small" style={styles.ruleLabel}>
                休憩
              </ThemedText>
              <Stepper
                value={rule.breakMinutes}
                format={(m) => `${m}分`}
                onChange={(breakMinutes) => updateRule(i, { breakMinutes })}
                step={15}
                min={0}
                max={180}
              />
              <Pressable
                onPress={() => setDraftRules(draftRules.filter((_, j) => j !== i))}
                hitSlop={8}
                accessibilityLabel="このルールを削除"
              >
                <ThemedText type="small" themeColor="textSecondary">
                  削除
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ))}
        <View style={styles.links}>
          {draftRules.length < 5 && (
            <Pressable
              onPress={() =>
                setDraftRules([...draftRules, { overMinutes: 4 * 60, breakMinutes: 30 }])
              }
              hitSlop={8}
            >
              <ThemedText type="small" style={styles.link}>
                ＋ ルールを追加
              </ThemedText>
            </Pressable>
          )}
          <Pressable onPress={() => setDraftRules([...legalBreakRules])} hitSlop={8}>
            <ThemedText type="small" style={styles.link}>
              法定の最低時間に戻す
            </ThemedText>
          </Pressable>
        </View>
        {draftBelowLegal && (
          <ErrorText>
            ⚠ 法律（労働基準法第34条）で決められた最低限の休憩より短くなる勤務時間があります
          </ErrorText>
        )}
        <PrimaryButton
          title="保存する"
          onPress={() => {
            save({
              ...settings,
              breakRules: [...draftRules].sort((a, b) => a.overMinutes - b.overMinutes),
            });
            close();
          }}
        />
      </Sheet>

      <Sheet open={editing === "options"} onClose={close} title="休憩ボタンの候補">
        <ThemedText type="small" themeColor="textSecondary">
          休憩を選ぶときに並べるボタンを選んでください。
        </ThemedText>
        <View style={styles.chips}>
          {OPTION_CHOICES.map((m) => {
            const active = settings.breakOptions.includes(m);
            return (
              <Chip
                key={m}
                label={m === 0 ? "なし" : `${m}分`}
                active={active}
                onPress={() => {
                  const next = active
                    ? settings.breakOptions.filter((x) => x !== m)
                    : [...settings.breakOptions, m].sort((a, b) => a - b);
                  if (next.length > 0) save({ ...settings, breakOptions: next });
                }}
              />
            );
          })}
        </View>
        <Pressable
          onPress={() => save({ ...settings, breakOptions: defaultSettings.breakOptions })}
          hitSlop={8}
        >
          <ThemedText type="small" style={styles.link}>
            最初の状態に戻す
          </ThemedText>
        </Pressable>
        <PrimaryButton title="閉じる" onPress={close} />
      </Sheet>

      <Sheet open={editing === "count"} onClose={close} title="時間帯の候補の数">
        <ThemedText type="small" themeColor="textSecondary">
          カレンダーで日付を選んだときに出す、よく使う時間帯のボタンの数です。
        </ThemedText>
        <View style={styles.chips}>
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={`${n}個`}
              active={settings.presetCount === n}
              onPress={() => {
                save({ ...settings, presetCount: n });
                close();
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { borderRadius: Spacing.three, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.6 },
  ruleCard: { borderRadius: Spacing.two, padding: Spacing.two, gap: Spacing.two },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  ruleLabel: { width: 40 },
  stepper: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 18, fontWeight: 700 },
  stepValue: { minWidth: 88, textAlign: "center", fontVariant: ["tabular-nums"] },
  dimmed: { opacity: 0.4 },
  links: { flexDirection: "row", gap: Spacing.four, flexWrap: "wrap" },
  link: { color: ACCENT },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  activeText: { color: "#fff", fontWeight: 700 },
});
