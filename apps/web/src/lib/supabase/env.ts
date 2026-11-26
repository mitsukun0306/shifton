/** Supabase の接続情報。apps/web/.env.local に設定する（docs/supabase-setup.md 参照） */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = supabaseUrl !== "" && supabaseKey !== "";
