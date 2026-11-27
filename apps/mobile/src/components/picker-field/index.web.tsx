import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { PickerFieldProps } from "./utils";

/** Web：ブラウザ標準の時刻・日付の選択 UI を使う */
export function PickerField({ label, mode, value, onChange }: PickerFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <input
        type={mode}
        step={mode === "time" ? 300 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{
          border: "none",
          borderRadius: Spacing.two,
          padding: "12px 16px",
          fontSize: 16,
          color: theme.text,
          backgroundColor: theme.backgroundElement,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
});
