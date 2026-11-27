-- しふとん！ ユーザーごとの設定
-- 休憩の自動入力ルールなどを保存し、同じアカウントならどの端末でも同じ設定を使えるようにする。
-- 中身は packages/core/src/settings.ts の AppSettings（JSON）。

create table user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 行レベルセキュリティ：自分の設定だけを読み書きできる
alter table user_settings enable row level security;

create policy "own settings" on user_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger user_settings_set_updated_at before update on user_settings
  for each row execute function set_updated_at();
