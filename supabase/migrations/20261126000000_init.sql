-- しふとん！ 初期スキーマ
-- アルバイト本人が、自分の勤務先と自分のシフトを管理するための個人向けデータ。
-- packages/core/src/schemas.ts のドメインモデルと対応させる。

-- シフトをどうやって登録したか
create type shift_source as enum ('manual', 'image', 'file', 'import');

-- 勤務先（バイト先）。掛け持ちに対応するため1人が複数持てる
create table workplaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  -- 表示色（#RRGGBB）
  color text not null default '#0284c7' check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- 時給（円）。未設定なら給与の概算をしない
  hourly_wage integer check (hourly_wage >= 0),
  created_at timestamptz not null default now()
);
create index workplaces_user_idx on workplaces (user_id);

-- 自分のシフト（end_time <= start_time の場合は日またぎ）
create table shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workplace_id uuid not null references workplaces (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  note text,
  source shift_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shifts_user_date_idx on shifts (user_id, date);

-- 行レベルセキュリティ：自分のデータだけを読み書きできる
alter table workplaces enable row level security;
alter table shifts enable row level security;

create policy "own workplaces" on workplaces for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own shifts" on shifts for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- 他人の勤務先にシフトを紐づけられないようにする
    and exists (select 1 from workplaces w where w.id = workplace_id and w.user_id = auth.uid())
  );

-- 更新日時を自動で記録する
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shifts_set_updated_at before update on shifts
  for each row execute function set_updated_at();
