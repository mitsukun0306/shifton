import { Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";

export default function RequestsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">希望シフトの提出</ThemedText>
        <ThemedText themeColor="textSecondary">
          ここに希望シフトの提出画面を実装します（準備中）。
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.four,
    gap: Spacing.three,
  },
});
