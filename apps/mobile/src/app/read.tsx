import AsyncStorage from "@react-native-async-storage/async-storage";
import { createShifts } from "@shifton/api";
import { formatDateJa, legalBreakMinutes, type ShiftCandidate } from "@shifton/core";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreakPicker } from "@/components/break-picker";
import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Sheet } from "@/components/sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing, WebTabBarInset } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { isShiftReaderConfigured, readShiftImage } from "@/lib/shift-reader";
import { supabase } from "@/lib/supabase";
import { useShiftData } from "@/lib/use-shift-data";

type Row = ShiftCandidate & { include: boolean };
type Asset = { uri: string; width: number; height: number };

const NAME_KEY = "shifton:nameOnSheet";

export default function ReadScreen() {
  const { session } = useAuth();
  const { workplaces } = useShiftData();
  const [asset, setAsset] = useState<Asset>();
  const [nameOnSheet, setNameOnSheet] = useState("");
  const [workplaceId, setWorkplaceId] = useState<string>();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 編集ポップアップで開いている行の番号 */
  const [editing, setEditing] = useState<number>();

  const selectedWorkplaceId = workplaceId ?? workplaces?.[0]?.id;

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY)
      .then((v) => v && setNameOnSheet(v))
      .catch(() => {});
  }, []);

  async function pick(source: "camera" | "library") {
    setError(undefined);
    setMessage(undefined);
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("カメラの使用が許可されていません。設定アプリから許可してください");
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const picked = result.canceled ? undefined : result.assets[0];
    if (picked) {
      setAsset({ uri: picked.uri, width: picked.width, height: picked.height });
      setRows(null);
    }
  }

  async function read() {
    if (!asset || !session) return;
    setError(undefined);
    setMessage(undefined);
    setReading(true);
    try {
      await AsyncStorage.setItem(NAME_KEY, nameOnSheet).catch(() => {});
      const result = await readShiftImage({
        asset,
        nameOnSheet,
        accessToken: session.access_token,
      });
      setWarnings(result.warnings);
      setRows(
        result.candidates.map((c) => ({
          ...c,
          include: true,
          // シフト表に休憩が書かれていなくても、法律で必要な最低限の休憩は入れておく
          breakMinutes: Math.max(c.breakMinutes, legalBreakMinutes(c.startTime, c.endTime)),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, ...patch } : r)) ?? null);
  }

  /** 開始・終了を変えたら、休憩を法定の最低時間に合わせ直す（あとから変更可） */
  function updateTime(index: number, patch: Partial<Pick<Row, "startTime" | "endTime">>) {
    setRows(
      (prev) =>
        prev?.map((r, i) => {
          if (i !== index) return r;
          const next = { ...r, ...patch };
          return { ...next, breakMinutes: legalBreakMinutes(next.startTime, next.endTime) };
        }) ?? null,
    );
  }

  async function save() {
    if (!rows || !selectedWorkplaceId) return;
    setSaving(true);
    setError(undefined);
    try {
      const selected = rows.filter((r) => r.include);
      const created = await createShifts(
        supabase,
        selected.map((r) => ({
          workplaceId: selectedWorkplaceId,
          date: r.date.trim(),
          startTime: r.startTime.trim(),
          endTime: r.endTime.trim(),
          breakMinutes: r.breakMinutes,
          note: r.note,
        })),
        "image",
      );
      setMessage(`${created.length}件のシフトを登録しました。「カレンダー」タブで確認できます`);
      setRows(null);
      setAsset(undefined);
    } catch (e) {
      // 入力の検証エラー（zod）も含めて表示する
      const issues = (e as { issues?: Array<{ message: string }> }).issues;
      setError(issues?.[0]?.message ?? (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = rows?.filter((r) => r.include).length ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">シフト表を読み取る</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            紙のシフト表の写真や、シフトアプリ・LINE
            のスクショから、あなたのシフトを読み取ります。登録前に確認・修正できます。
          </ThemedText>

          {rows ? null : !isShiftReaderConfigured ? (
            <ErrorText>
              読み取り機能が未設定です。apps/mobile/.env に EXPO_PUBLIC_API_BASE_URL
              を設定してください（docs/shift-reader-setup.md 参照）
            </ErrorText>
          ) : workplaces?.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              先に「勤務先」タブで勤務先を登録してください。
            </ThemedText>
          ) : (
            <>
              <View style={styles.row}>
                {Platform.OS !== "web" && (
                  <View style={styles.flex}>
                    <PrimaryButton title="写真を撮る" onPress={() => pick("camera")} />
                  </View>
                )}
                <View style={styles.flex}>
                  <PrimaryButton title="画像を選ぶ" onPress={() => pick("library")} />
                </View>
              </View>

              {asset && (
                <Image source={{ uri: asset.uri }} style={styles.preview} contentFit="contain" />
              )}

              <TextField
                label="シフト表でのあなたの名前（複数人の表のとき）"
                value={nameOnSheet}
                onChangeText={setNameOnSheet}
                placeholder="例: 佐藤"
              />
              <ThemedText type="smallBold">どの勤務先のシフトですか</ThemedText>
              <View style={styles.chips}>
                {(workplaces ?? []).map((wp) => (
                  <Pressable
                    key={wp.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: wp.id === selectedWorkplaceId }}
                    onPress={() => setWorkplaceId(wp.id)}
                    style={[
                      styles.chip,
                      { borderColor: wp.color },
                      wp.id === selectedWorkplaceId && { backgroundColor: wp.color },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={wp.id === selectedWorkplaceId ? styles.chipTextSelected : undefined}
                    >
                      {wp.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {asset && (
                <PrimaryButton
                  title={reading ? "読み取り中…（数十秒かかることがあります）" : "読み取る"}
                  onPress={read}
                  loading={reading}
                />
              )}
            </>
          )}

          <ErrorText>{error}</ErrorText>
          {message && <ThemedText>{message}</ThemedText>}

          {rows && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">読み取り結果の確認</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                画像と見比べて、違うところは直してください。
              </ThemedText>
              {warnings.map((w) => (
                <ThemedText key={w} type="small" style={styles.warning}>
                  ⚠ {w}
                </ThemedText>
              ))}
              {rows.length === 0 && (
                <ThemedText themeColor="textSecondary">
                  登録できるシフトは見つかりませんでした。
                </ThemedText>
              )}
              {rows.map((r, i) => (
                <ThemedView
                  // biome-ignore lint/suspicious/noArrayIndexKey: 行は編集中に並び替えない
                  key={i}
                  type="backgroundElement"
                  style={[
                    styles.card,
                    r.uncertain && styles.uncertain,
                    !r.include && styles.dimmed,
                  ]}
                >
                  <Pressable
                    style={styles.flex}
                    accessibilityRole="button"
                    accessibilityHint="タップして直す"
                    onPress={() => setEditing(i)}
                  >
                    <ThemedText type="smallBold">
                      {r.uncertain ? "⚠要確認 " : ""}
                      {formatDateJa(r.date)}
                    </ThemedText>
                    <ThemedText>
                      {r.startTime}〜{r.endTime}
                      <ThemedText type="small" themeColor="textSecondary">
                        {"  "}
                        {r.breakMinutes > 0 ? `休憩${r.breakMinutes}分` : "休憩なし"}
                      </ThemedText>
                    </ThemedText>
                    <ThemedText type="small" style={styles.editLink}>
                      ✎ タップして直す
                    </ThemedText>
                  </Pressable>
                  <Switch
                    value={r.include}
                    onValueChange={(include) => update(i, { include })}
                    accessibilityLabel="このシフトを登録する"
                  />
                </ThemedView>
              ))}
              {rows.length > 0 && (
                <PrimaryButton
                  title={`${selectedCount}件のシフトを登録する`}
                  onPress={save}
                  loading={saving}
                />
              )}
              <Pressable
                onPress={() => {
                  setRows(null);
                  setWarnings([]);
                }}
                hitSlop={8}
              >
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  別の画像で読み取り直す
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>

      {rows && editing !== undefined && rows[editing] && (
        <Sheet open onClose={() => setEditing(undefined)} title={`${editing + 1}件目を直す`}>
          <PickerField
            label="日付"
            mode="date"
            value={rows[editing].date}
            onChange={(date) => update(editing, { date })}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <PickerField
                label="開始"
                mode="time"
                value={rows[editing].startTime}
                onChange={(startTime) => updateTime(editing, { startTime })}
              />
            </View>
            <View style={styles.flex}>
              <PickerField
                label="終了"
                mode="time"
                value={rows[editing].endTime}
                onChange={(endTime) => updateTime(editing, { endTime })}
              />
            </View>
          </View>
          <BreakPicker
            value={rows[editing].breakMinutes}
            onChange={(breakMinutes) => update(editing, { breakMinutes })}
            legalMinutes={legalBreakMinutes(rows[editing].startTime, rows[editing].endTime)}
          />
          {rows[editing].note && (
            <ThemedText type="small" themeColor="textSecondary">
              メモ: {rows[editing].note}
            </ThemedText>
          )}
          <PrimaryButton title="OK" onPress={() => setEditing(undefined)} />
        </Sheet>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? WebTabBarInset : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: { flexDirection: "row", gap: Spacing.two },
  flex: { flex: 1 },
  preview: { width: "100%", height: 160, borderRadius: Spacing.two },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  chipTextSelected: { color: "#fff", fontWeight: 700 },
  section: { gap: Spacing.three, marginTop: Spacing.three },
  warning: { color: "#b45309" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  dimmed: { opacity: 0.5 },
  editLink: { color: "#0284c7" },
  center: { textAlign: "center" },
  uncertain: { borderWidth: 2, borderColor: "#f59e0b" },
});
