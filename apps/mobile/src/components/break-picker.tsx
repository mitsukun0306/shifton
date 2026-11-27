import { isBreakLegal, legalBreakMinutes } from "@shifton/core";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const ACCENT = "#0284c7";
const WARN = "#dc2626";

/**
 * 休憩時間をボタンで選ぶ。勤務時間に応じた法定の最低休憩には「最低」の印を付け、
 * それより短い休憩を選んだときは注意を出す。
 */
export function BreakPicker({
  value,
  onChange,
  startTime,
  endTime,
  choices,
  showHint = true,
}: {
  value: number;
  onChange: (minutes: number) => void;
  /** 勤務の開始・終了（法定の最低休憩の判定に使う） */
  startTime: string;
  endTime: string;
  /** ボタンに並べる分数（設定） */
  choices: readonly number[];
  showHint?: boolean;
}) {
  const theme = useTheme();
  const options = choices.includes(value) ? choices : [...choices, value].sort((a, b) => a - b);
  const legalMinutes = legalBreakMinutes(startTime, endTime);
  const tooShort = !isBreakLegal(startTime, endTime, value);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">休憩</ThemedText>
      <View style={styles.chips}>
        {options.map((m) => {
          const active = m === value;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(m)}
              style={[
                styles.chip,
                { borderColor: active ? ACCENT : theme.backgroundSelected },
                active && { backgroundColor: ACCENT },
              ]}
            >
              <ThemedText type="small" style={active ? styles.activeText : undefined}>
                {m === 0 ? "なし" : `${m}分`}
                {m === legalMinutes && m > 0 ? " 最低" : ""}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {showHint && (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={tooShort ? styles.warn : undefined}
        >
          {legalMinutes === 0
            ? "6時間以下の勤務は休憩の決まりはありません"
            : tooShort
              ? `⚠ 法律で決められた最低限の休憩（${legalMinutes}分）より短くなっています`
              : `この勤務時間では、法律で最低${legalMinutes}分の休憩が必要です（労働基準法第34条）`}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  activeText: { color: "#fff", fontWeight: 700 },
  warn: { color: WARN },
});
