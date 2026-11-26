-- しふとん！ 初期スキーマ（案）
-- packages/core/src/schemas.ts のドメインモデルと対応させる。

create type member_role as enum ('owner', 'manager', 'staff');
create type shift_status as enum ('draft', 'published');
create type availability as enum ('preferred', 'available', 'unavailable');

-- 店舗・事業所
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now()
);

-- 店舗のメンバー（auth.users と紐づく。招待中は user_id が null）
create table members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  role member_role not null default 'staff',
  hourly_wage integer check (hourly_wage >= 0),
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

-- シフト（end_time < start_time の場合は日またぎ）
create table shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  status shift_status not null default 'draft',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shifts_store_date_idx on shifts (store_id, date);

-- 希望シフト
create table shift_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  date date not null,
  availability availability not null,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now(),
  unique (member_id, date)
);

-- 行レベルセキュリティ：同じ店舗のメンバーだけが参照できる
alter table stores enable row level security;
alter table members enable row level security;
alter table shifts enable row level security;
alter table shift_requests enable row level security;

create function is_store_member(target_store uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from members where store_id = target_store and user_id = auth.uid()
    );
  $$;

create function is_store_manager(target_store uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from members
      where store_id = target_store and user_id = auth.uid() and role in ('owner', 'manager')
    );
  $$;

create policy "members can read store" on stores for select using (is_store_member(id));
create policy "members can read members" on members for select using (is_store_member(store_id));
create policy "managers manage members" on members for all using (is_store_manager(store_id));

-- スタッフは公開済みシフトのみ閲覧、店長は下書きを含めて編集
create policy "staff read published shifts" on shifts for select
  using (is_store_member(store_id) and (status = 'published' or is_store_manager(store_id)));
create policy "managers manage shifts" on shifts for all using (is_store_manager(store_id));

-- 希望シフトは本人が提出・編集し、店長は閲覧できる
create policy "own requests" on shift_requests for all
  using (member_id in (select id from members where user_id = auth.uid()));
create policy "managers read requests" on shift_requests for select
  using (is_store_manager(store_id));
