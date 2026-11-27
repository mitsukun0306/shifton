/**
 * Supabase のテーブル定義に対応する型。
 * supabase/migrations と手動で揃えている。Supabase CLI を導入したら
 * `supabase gen types typescript` で自動生成したものに置き換える。
 */

export type ShiftSourceEnum = "manual" | "image" | "file" | "import";

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type WorkplaceRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  hourly_wage: number | null;
  created_at: string;
};

export type ShiftRow = {
  id: string;
  user_id: string;
  workplace_id: string;
  date: string;
  /** Postgres の time 型は "HH:mm:ss" で返る */
  start_time: string;
  end_time: string;
  break_minutes: number;
  note: string | null;
  source: ShiftSourceEnum;
  created_at: string;
  updated_at: string;
};

export type UserSettingsRow = {
  user_id: string;
  /** packages/core の AppSettings を JSON で保存する */
  settings: unknown;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      workplaces: Table<WorkplaceRow, "name">;
      shifts: Table<ShiftRow, "workplace_id" | "date" | "start_time" | "end_time">;
      user_settings: Table<UserSettingsRow, "user_id">;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: { shift_source: ShiftSourceEnum };
    CompositeTypes: Record<never, never>;
  };
};
