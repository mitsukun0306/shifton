import { credentialsSchema, translateAuthError } from "@shifton/api";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorText, PrimaryButton, TextField } from "@/components/form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  async function submit() {
    setError(undefined);
    setMessage(undefined);
    const parsed = credentialsSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setLoading(true);
    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword(parsed.data)
      : await supabase.auth.signUp(parsed.data);
    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
    } else if (!isLogin && !data.session) {
      setMessage("確認メールを送信しました。メール内のリンクを開いてから、ログインしてください。");
      setMode("login");
    }
    // ログインに成功すると AuthProvider が検知して画面が切り替わる
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.form}
        >
          <ThemedText type="title">しふとん！</ThemedText>
          <ThemedText type="subtitle">{isLogin ? "ログイン" : "新規登録"}</ThemedText>
          <TextField
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField
            label="パスワード（8文字以上）"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          <ErrorText>{error}</ErrorText>
          {message && <ThemedText type="small">{message}</ThemedText>}
          <PrimaryButton
            title={isLogin ? "ログイン" : "登録する"}
            onPress={submit}
            loading={loading}
          />
          <Pressable onPress={() => setMode(isLogin ? "signup" : "login")}>
            <ThemedText type="linkPrimary" style={styles.switch}>
              {isLogin ? "アカウントをお持ちでない方は新規登録" : "登録済みの方はログイン"}
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, justifyContent: "center" },
  form: { padding: Spacing.four, gap: Spacing.three },
  switch: { textAlign: "center", marginTop: Spacing.two },
});
