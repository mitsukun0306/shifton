-- 店舗作成用の関数
-- 店舗と「作成者をオーナーとするメンバー」を同時に作る。
-- 作成直後はまだメンバーではないため RLS で店舗を登録できない問題を、
-- security definer の関数でまとめて処理することで解決する。

create function create_store(store_name text, owner_name text)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  new_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です' using errcode = '28000';
  end if;
  if coalesce(trim(store_name), '') = '' or coalesce(trim(owner_name), '') = '' then
    raise exception '店舗名と名前を入力してください' using errcode = '22023';
  end if;

  insert into stores (name) values (trim(store_name)) returning id into new_store_id;
  insert into members (store_id, user_id, display_name, role)
    values (new_store_id, auth.uid(), trim(owner_name), 'owner');

  return new_store_id;
end;
$$;

revoke execute on function create_store(text, text) from public, anon;
grant execute on function create_store(text, text) to authenticated;

-- 店長・オーナーは店舗情報を更新できる
create policy "managers update store" on stores for update using (is_store_manager(id));
