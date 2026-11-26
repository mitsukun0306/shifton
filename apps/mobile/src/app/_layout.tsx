import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { ActivityIndicator, useColorScheme, View } from "react-native";

import AppTabs from "@/components/app-tabs";
import { LoginScreen } from "@/components/login-screen";
import { SetupRequired } from "@/components/setup-required";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ThemeProvider>
  );
}

/** ログイン状態に応じて、ログイン画面かアプリ本体を表示する */
function Gate() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) return <SetupRequired />;
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return session ? <AppTabs /> : <LoginScreen />;
}
