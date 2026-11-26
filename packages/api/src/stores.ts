import type { MemberRole, Store } from "@shifton/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./database.types";

export type ShiftonClient = SupabaseClient<Database>;

/** 自分が所属している店舗と、その店舗での役割 */
export interface MyStore extends Store {
  memberId: string;
  role: MemberRole;
  displayName: string;
}

export const createStoreInputSchema = z.object({
  storeName: z.string().trim().min(1, "店舗名を入力してください").max(100),
  ownerName: z.string().trim().min(1, "あなたの名前を入力してください").max(50),
});
export type CreateStoreInput = z.infer<typeof createStoreInputSchema>;

/** ログイン中のユーザーが所属する店舗一覧を取得する */
export async function fetchMyStores(client: ShiftonClient, userId: string): Promise<MyStore[]> {
  const { data, error } = await client
    .from("members")
    .select("id, role, display_name, stores(id, name, timezone)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const store = row.stores as unknown as Database["public"]["Tables"]["stores"]["Row"] | null;
    if (!store) return [];
    return [
      {
        id: store.id,
        name: store.name,
        timezone: store.timezone,
        memberId: row.id,
        role: row.role,
        displayName: row.display_name,
      },
    ];
  });
}

/** 店舗を作成し、作成者をオーナーとして登録する。作成した店舗IDを返す */
export async function createStore(client: ShiftonClient, input: CreateStoreInput): Promise<string> {
  const { storeName, ownerName } = createStoreInputSchema.parse(input);
  const { data, error } = await client.rpc("create_store", {
    store_name: storeName,
    owner_name: ownerName,
  });
  if (error) throw error;
  return data;
}
