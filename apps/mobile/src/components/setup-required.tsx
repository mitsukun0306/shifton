import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

/** Supabase の接続情報が未設定のときに表示する案内 */
export function SetupRequired() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <ThemedText type="subtitle">Supabase の設定が必要です</ThemedText>
        <ThemedText>
          apps/mobile/.env に EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          を設定して、アプリを再起動してください。
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          手順: docs/supabase-setup.md
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", padding: Spacing.four, gap: Spacing.three },
});
