# しふとん！

アルバイトをしている人が、バイト先から届いたシフトを取り込んで、自分の予定をまとめて管理するためのアプリです。
掛け持ちしていても、勤務先ごとの時間・給与の目安や、シフトの重なりをすぐに確認できます。
ブラウザ版（Web）とスマホネイティブ版（iOS / Android）を、ひとつのリポジトリで開発します。

> 現在できること: ログイン、勤務先の登録、**写真・スクショからのシフト読み取り（AI）**、シフトの手入力・一覧・削除、重なりの検出、勤務時間と給与の目安。
> PDF・Excel からの読み取りや外部サービス連携はこれから実装します。

## 構成

pnpm workspaces + Turborepo によるモノレポです。

```
shifton/
├── apps/
│   ├── web/        # ブラウザ版（Next.js / Tailwind CSS）
│   └── mobile/     # スマホ版（Expo / React Native / Expo Router）
├── packages/
│   ├── core/       # Web・モバイル共通のドメインモデルとシフト計算ロジック
│   └── api/        # Web・モバイル共通の Supabase データアクセス
├── supabase/
│   └── migrations/ # データベーススキーマ
└── docs/           # 設計ドキュメント
```

| 領域           | 技術                                                 |
| -------------- | ---------------------------------------------------- |
| Web            | Next.js 16（App Router）, React 19, Tailwind CSS 4   |
| モバイル       | Expo SDK 58, React Native, Expo Router               |
| 共通ロジック   | TypeScript, Zod（入力検証・型定義）                  |
| 読み取り（AI） | Claude API（画像認識・構造化出力）                   |
| バックエンド   | Supabase（PostgreSQL / 認証 / 行レベルセキュリティ） |
| ビルド管理     | pnpm, Turborepo                                      |
| Lint / Format  | Biome                                                |
| テスト         | Vitest                                               |
| CI             | GitHub Actions                                       |

技術選定の理由や今後の方針は [docs/architecture.md](docs/architecture.md) を参照してください。

## はじめかた

必要なもの: Node.js 22 以上、pnpm 10（`corepack enable` で有効化できます）

```bash
pnpm install
```

ログインやシフトの保存を使うには Supabase の設定が必要です。
**はじめての方は [docs/supabase-setup.md](docs/supabase-setup.md) の手順に沿って設定してください。**
（未設定でもアプリは起動し、`/demo` でサンプルのシフト表を見られます）
写真・スクショからの読み取りを使う場合は、続けて [docs/shift-reader-setup.md](docs/shift-reader-setup.md) の設定も行ってください。

スマホ実機で動かしながら確認する方法は [docs/mobile-device-testing.md](docs/mobile-device-testing.md) を参照してください。

```bash
# ブラウザ版を起動（http://localhost:3000）
pnpm dev:web

# スマホ版を起動（Expo Go アプリで QR コードを読み取ります）
pnpm dev:mobile
```

## よく使うコマンド

| コマンド         | 内容                             |
| ---------------- | -------------------------------- |
| `pnpm dev`       | すべてのアプリを開発モードで起動 |
| `pnpm build`     | ビルド                           |
| `pnpm typecheck` | 型チェック                       |
| `pnpm test`      | テスト実行                       |
| `pnpm lint`      | Lint とフォーマットの確認        |
| `pnpm check`     | Lint・フォーマットの自動修正     |

## 開発ルール

- 業務ロジック（シフト時間の計算、重なりチェック、給与概算など）は `packages/core` に置き、Web とモバイルで共有します。
- 画面固有のコードだけを各アプリに書きます。
- モバイルに依存パッケージを追加するときは `pnpm --filter @shifton/mobile exec expo install <package>` を使い、SDK と互換性のあるバージョンを入れます。
- プルリクエストでは CI（Lint・型チェック・テスト・ビルド）が通ることを確認してください。
