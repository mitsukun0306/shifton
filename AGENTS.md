# AGENTS.md

- モノレポ（pnpm + Turborepo）。アプリは `apps/web`（Next.js）と `apps/mobile`（Expo）、共通ロジックは `packages/core`。
- 業務ロジックは `packages/core` に純粋関数として置き、テストを添える。
- 各アプリ固有の注意は `apps/web/AGENTS.md` と `apps/mobile/AGENTS.md` を参照。
- 作業後は `pnpm lint && pnpm typecheck && pnpm test` を実行する。
