import DateTimePicker from "@expo/ui/community/datetime-picker";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fromDate, type PickerFieldProps, toDate } from "./utils";

/** iOS：時刻・日付をタップすると、標準の選択画面が開く */
export function PickerField({ label, mode, value, onChange }: PickerFieldProps) {
  const scheme = useColorScheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.picker}>
        <DateTimePicker
          mode={mode}
          display="compact"
          value={toDate(mode, value)}
          onValueChange={(_, date) => onChange(fromDate(mode, date))}
          locale="ja_JP"
          accentColor="#0284c7"
          themeVariant={scheme === "dark" ? "dark" : "light"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  picker: { alignItems: "flex-start" },
});
