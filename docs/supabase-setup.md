# Supabase のセットアップ手順（はじめての方向け）

しふとん！は、ユーザー登録・ログインとデータの保存に [Supabase](https://supabase.com) を使います。
Supabase は「データベース（PostgreSQL）」と「ログイン機能」をまとめて提供してくれるサービスで、
小規模なら無料プランで始められます。

所要時間はおよそ15分です。

> Supabase の画面は頻繁に改善されるため、ボタンの名前や位置が少し違うことがあります。
> 見つからないときは、似た名前のメニューを探してください。

---

## 1. アカウントを作る

1. https://supabase.com を開き、右上の **Start your project**（または **Sign up**）を押します。
2. **Continue with GitHub** を選ぶと、GitHub アカウントでそのまま登録できます。
3. 最初に「Organization（組織）」の作成を求められたら、名前は自分の名前などで構いません。プランは **Free** を選びます。

## 2. プロジェクトを作る

1. ダッシュボードで **New project** を押します。
2. 次のように入力します。
   | 項目              | 入力する内容                                                                                                                         |
   | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
   | Project name      | `shifton`（なんでもOK）                                                                                                              |
   | Database Password | **Generate a password** で自動生成し、パスワード管理アプリなどに保存しておきます（あとでほぼ使いませんが、なくすと再設定が必要です） |
   | Region            | **Northeast Asia (Tokyo)**（日本から速く使えます）                                                                                   |
3. **Create new project** を押し、準備が終わるまで1〜2分待ちます。

## 3. データベースにテーブルを作る

アプリで使うテーブル（店舗・メンバー・シフト・希望シフト）を作ります。

1. 左のメニューから **SQL Editor** を開きます。
2. **New query**（または「+」）で空のエディタを開きます。
3. このリポジトリの次のファイルの中身を**すべてコピーして貼り付け**、右下の **Run** を押します。
   - `supabase/migrations/20261126000000_init.sql`
4. 「Success. No rows returned」と表示されれば成功です。
5. もう一度 **New query** を開き、次のファイルも同じように実行します。
   - `supabase/migrations/20261126010000_create_store.sql`
6. 左メニューの **Table Editor** を開き、`stores`・`members`・`shifts`・`shift_requests` の4つのテーブルがあれば完了です。

> 実行の順番が大事です。必ず日付の古いファイルから実行してください。
> 途中でエラーになったときは、エラーメッセージをそのまま Claude に貼ってもらえれば対処します。

## 4. 接続情報（URL とキー）を確認する

アプリから Supabase に接続するための情報を2つ取得します。

1. 左下の歯車アイコン **Project Settings** を開きます。
2. **API Keys** を開き、**Publishable key**（`sb_publishable_` で始まる文字列）をコピーします。
3. **Data API**（または画面上部の **Connect** ボタン）を開き、**Project URL**（`https://xxxx.supabase.co`）をコピーします。

> **Secret key（`sb_secret_` で始まるもの）は絶対にアプリに入れないでください。**
> データベースを無制限に操作できる鍵です。アプリに入れるのは Publishable key だけです。
> Publishable key は公開されても問題ないように作られており、データの守りは
> データベース側のルール（行レベルセキュリティ）で行っています。

## 5. ログインの設定をする

### 開発中はメール確認をオフにする（おすすめ）

初期設定では、新規登録すると確認メールが届き、リンクを押すまでログインできません。
無料プランはメール送信数が1時間に数通までに制限されているため、開発中はオフにしておくと楽です。

1. 左メニューの **Authentication** を開きます。
2. **Sign In / Providers**（または **Providers**）を開き、**Email** を選びます。
3. **Confirm email** をオフにして保存します。

> 本番公開の前には、必ずオンに戻します。

### 戻り先の URL を登録する（メール確認をオンにする場合）

1. **Authentication** の **URL Configuration** を開きます。
2. **Site URL** に `http://localhost:3000` を入れます。
3. **Redirect URLs** に `http://localhost:3000/auth/callback` を追加します。

本番の URL が決まったら、同じようにそちらも追加します。

## 6. アプリに接続情報を設定する

手順4でコピーした2つの値を、設定ファイルに書き込みます。
これらのファイルは `.gitignore` 済みなので、GitHub にはアップロードされません。

### ブラウザ版

`apps/web/.env.example` をコピーして `apps/web/.env.local` を作り、値を書き換えます。

```bash
cp apps/web/.env.example apps/web/.env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://（あなたのプロジェクト）.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_（あなたのキー）
```

### スマホ版

`apps/mobile/.env.example` をコピーして `apps/mobile/.env` を作り、同じ値を入れます。

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

> 設定ファイルを変えたら、起動中のアプリを一度止めて（Ctrl + C）起動し直してください。

## 7. 動かしてみる

### ブラウザ版

```bash
pnpm dev:web
```

1. http://localhost:3000 を開き、**無料で始める** から新規登録します。
2. 店舗作成フォームが表示されたら、店舗名と名前を入れて **店舗を作成する** を押します。
3. Supabase の **Table Editor** で `stores` と `members` にデータが入っていれば成功です。

### スマホ版

```bash
pnpm dev:mobile
```

1. スマホに **Expo Go** アプリ（App Store / Google Play）を入れます。
2. ターミナルに表示された QR コードを読み取ります（iPhone はカメラアプリで読み取り）。
3. ブラウザ版で作ったアカウントでログインすると、同じ店舗が表示されます。

> パソコンとスマホは同じ Wi-Fi につないでください。

---

## うまくいかないとき

| 症状                                                  | 確認すること                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 「Supabase が未設定です」と出る                       | 設定ファイルの名前（`.env.local` / `.env`）と場所、変数名のつづりを確認し、アプリを再起動           |
| 「メールアドレスの確認が完了していません」            | 手順5でメール確認をオフにするか、届いたメールのリンクを開く                                         |
| 確認メールが届かない                                  | 無料プランの送信制限（1時間に数通）の可能性。メール確認をオフにするのが手軽                         |
| 店舗作成で `function create_store ... does not exist` | 手順3の2つ目の SQL が実行されていない                                                               |
| 店舗作成で `permission denied`                        | SQL の実行順が逆になっている可能性。Claude に相談してください                                       |
| 「サーバーに接続できませんでした」                    | Project URL が正しいか、プロジェクトが一時停止（無料プランは1週間使わないと停止）していないかを確認 |

## 今後について

- テーブルの変更は `supabase/migrations/` に SQL ファイルとして追加していきます。
- 慣れてきたら [Supabase CLI](https://supabase.com/docs/guides/local-development) を導入すると、
  SQL の適用や型定義（`packages/api/src/database.types.ts`）の自動生成をコマンドで行えるようになります。
