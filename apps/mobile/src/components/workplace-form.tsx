import { createWorkplace, workplaceInputSchema } from "@shifton/api";
import { workplaceColors } from "@shifton/core";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

export function WorkplaceForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [color, setColor] = useState<string>(workplaceColors[0]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(undefined);
    const parsed = workplaceInputSchema.safeParse({ name, hourlyWage, color });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setLoading(true);
    try {
      await createWorkplace(supabase, parsed.data);
      setName("");
      setHourlyWage("");
      onCreated();
    } catch (e) {
      setError(`勤務先を登録できませんでした: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.form}>
      <TextField
        label="勤務先の名前"
        value={name}
        onChangeText={setName}
        placeholder="例: カフェしふとん"
      />
      <TextField
        label="時給（円・任意）"
        value={hourlyWage}
        onChangeText={setHourlyWage}
        keyboardType="number-pad"
        placeholder="例: 1200"
      />
      <ThemedText type="smallBold">色</ThemedText>
      <View style={styles.colors}>
        {workplaceColors.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ checked: c === color }}
            accessibilityLabel={c}
            onPress={() => setColor(c)}
            style={[styles.swatch, { backgroundColor: c }, c === color && styles.selected]}
          />
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="勤務先を登録する" onPress={submit} loading={loading} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  colors: { flexDirection: "row", gap: Spacing.two },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  selected: { borderWidth: 3, borderColor: "#0f172a" },
});
