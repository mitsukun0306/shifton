import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fromDate, type PickerFieldProps, toDate } from "./utils";

/** Android：ボタンをタップすると、時計やカレンダーのダイアログで選べる */
export function PickerField({ label, mode, value, onChange }: PickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}を選ぶ（現在 ${value}）`}
        onPress={() => setOpen(true)}
        style={[styles.button, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText style={styles.value}>{value || "選択"}</ThemedText>
      </Pressable>
      {open && (
        <DateTimePicker
          mode={mode}
          presentation="dialog"
          is24Hour
          value={toDate(mode, value)}
          accentColor="#0284c7"
          positiveButton={{ label: "OK" }}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(fromDate(mode, date));
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  button: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  value: { fontSize: 16, fontVariant: ["tabular-nums"] },
});
