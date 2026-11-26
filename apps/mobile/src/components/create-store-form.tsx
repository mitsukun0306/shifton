import { createStore, createStoreInputSchema } from "@shifton/api";
import { useState } from "react";

import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

export function CreateStoreForm({ onCreated }: { onCreated: () => void }) {
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(undefined);
    const parsed = createStoreInputSchema.safeParse({ storeName, ownerName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setLoading(true);
    try {
      await createStore(supabase, parsed.data);
      onCreated();
    } catch (e) {
      setError(`店舗を作成できませんでした: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView
      type="backgroundElement"
      style={{ padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three }}
    >
      <ThemedText type="smallBold">店舗を作成</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        シフトを管理する店舗を登録しましょう。あなたはこの店舗のオーナーになります。
      </ThemedText>
      <TextField
        label="店舗名"
        value={storeName}
        onChangeText={setStoreName}
        placeholder="例: カフェしふとん 渋谷店"
      />
      <TextField
        label="あなたの名前"
        value={ownerName}
        onChangeText={setOwnerName}
        placeholder="例: 佐藤"
      />
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="店舗を作成する" onPress={submit} loading={loading} />
    </ThemedView>
  );
}
