import { fetchMyStores, type MyStore } from "@shifton/api";
import { formatDuration, sampleMembers, sampleShifts, workingMinutes } from "@shifton/core";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateStoreForm } from "@/components/create-store-form";
import { ErrorText } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const roleLabel = { owner: "オーナー", manager: "店長", staff: "スタッフ" } as const;
const memberName = new Map(sampleMembers.map((m) => [m.id, m.displayName]));

export default function HomeScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [stores, setStores] = useState<MyStore[] | null>(null);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(undefined);
      setStores(await fetchMyStores(supabase, userId));
    } catch (e) {
      setError(`店舗の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ThemedView style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {session?.user.email}
            </ThemedText>
            <Pressable onPress={() => supabase.auth.signOut()}>
              <ThemedText type="small" themeColor="textSecondary">
                ログアウト
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ErrorText>{error}</ErrorText>
          {stores === null && !error && <ActivityIndicator />}
          {stores?.length === 0 && <CreateStoreForm onCreated={load} />}
          {stores && stores.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">所属している店舗</ThemedText>
              {stores.map((store) => (
                <ThemedView key={store.id} type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{store.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {store.displayName}（{roleLabel[store.role]}）
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">シフト表のサンプル</ThemedText>
            {sampleShifts.map((s) => (
              <ThemedView key={s.id} type="backgroundElement" style={styles.card}>
                <ThemedText>
                  {s.date} {memberName.get(s.memberId)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.startTime}〜{s.endTime}（実働 {formatDuration(workingMinutes(s))}）
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    // Web ではタブバーが画面上部に重なるため、その分を空ける
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: { flexDirection: "row", justifyContent: "space-between" },
  section: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
