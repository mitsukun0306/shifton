# しふとん！

アルバイトのシフト作成・共有・希望提出をまとめて行える、シフト管理アプリです。
ブラウザ版（Web）とスマホネイティブ版（iOS / Android）を、ひとつのリポジトリで開発します。

> 現在は開発基盤のみの段階です。画面はサンプルデータで動作しています。

## 構成

pnpm workspaces + Turborepo によるモノレポです。

```
shifton/
├── apps/
│   ├── web/        # ブラウザ版（Next.js / Tailwind CSS）
│   └── mobile/     # スマホ版（Expo / React Native / Expo Router）
├── packages/
│   └── core/       # Web・モバイル共通のドメインモデルとシフト計算ロジック
├── supabase/
│   └── migrations/ # データベーススキーマ（案）
└── docs/           # 設計ドキュメント
```

| 領域                 | 技術                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Web                  | Next.js 16（App Router）, React 19, Tailwind CSS 4                  |
| モバイル             | Expo SDK 58, React Native, Expo Router                              |
| 共通ロジック         | TypeScript, Zod（入力検証・型定義）                                 |
| バックエンド（予定） | Supabase（PostgreSQL / 認証 / リアルタイム / 行レベルセキュリティ） |
| ビルド管理           | pnpm, Turborepo                                                     |
| Lint / Format        | Biome                                                               |
| テスト               | Vitest                                                              |
| CI                   | GitHub Actions                                                      |

技術選定の理由や今後の方針は [docs/architecture.md](docs/architecture.md) を参照してください。

## はじめかた

必要なもの: Node.js 22 以上、pnpm 10（`corepack enable` で有効化できます）

```bash
pnpm install

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

- 業務ロジック（シフト時間の計算、重複チェック、給与概算など）は `packages/core` に置き、Web とモバイルで共有します。
- 画面固有のコードだけを各アプリに書きます。
- モバイルに依存パッケージを追加するときは `pnpm --filter @shifton/mobile exec expo install <package>` を使い、SDK と互換性のあるバージョンを入れます。
- プルリクエストでは CI（Lint・型チェック・テスト・ビルド）が通ることを確認してください。
