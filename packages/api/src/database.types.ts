/**
 * Supabase のテーブル定義に対応する型。
 * supabase/migrations と手動で揃えている。Supabase CLI を導入したら
 * `supabase gen types typescript` で自動生成したものに置き換える。
 */

export type MemberRoleEnum = "owner" | "manager" | "staff";
export type ShiftStatusEnum = "draft" | "published";
export type AvailabilityEnum = "preferred" | "available" | "unavailable";

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type StoreRow = {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
};

export type MemberRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  display_name: string;
  role: MemberRoleEnum;
  hourly_wage: number | null;
  created_at: string;
};

export type ShiftRow = {
  id: string;
  store_id: string;
  member_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: ShiftStatusEnum;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ShiftRequestRow = {
  id: string;
  store_id: string;
  member_id: string;
  date: string;
  availability: AvailabilityEnum;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      stores: Table<StoreRow, "name">;
      members: Table<MemberRow, "store_id" | "display_name">;
      shifts: Table<ShiftRow, "store_id" | "member_id" | "date" | "start_time" | "end_time">;
      shift_requests: Table<ShiftRequestRow, "store_id" | "member_id" | "date" | "availability">;
    };
    Views: Record<never, never>;
    Functions: {
      create_store: {
        Args: { store_name: string; owner_name: string };
        Returns: string;
      };
      is_store_member: { Args: { target_store: string }; Returns: boolean };
      is_store_manager: { Args: { target_store: string }; Returns: boolean };
    };
    Enums: {
      member_role: MemberRoleEnum;
      shift_status: ShiftStatusEnum;
      availability: AvailabilityEnum;
    };
    CompositeTypes: Record<never, never>;
  };
};
