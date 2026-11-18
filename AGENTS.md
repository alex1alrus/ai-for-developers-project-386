# AGENTS.md

Call booking service (Cal.com-like): one owner, guests book free slots. Scenario, booking rules and limits: `README.md`.

## Commands

Tools and tasks live in `mise.toml` (Node, hk, pitchfork pinned there).

- `mise install` — install tools, npm deps and git hooks (postinstall runs `mise run setup`).
- `mise run dev` — start daemons: API on `127.0.0.1:3000`, Vite on `127.0.0.1:5173` (proxies `/api`). `mise daemons status|logs|stop` to manage.
- `mise run lint` — oxlint.
- `mise run typecheck` — `tsc -b` for web and server.
- `mise run test` — Vitest. Single test: `npx vitest run server/app.test.ts -t "<name>"`.
- `mise run check` — lint, typecheck, test and build; the same command runs in the pre-commit hook (hk) and GitHub Actions.
- `mise run build` — production build of the frontend into `dist/`.

## Structure

- `src/` — React + Mantine frontend (Vite).
- `server/` — Fastify API, run by Node directly (type stripping, no build step). `app.ts` builds the app, `index.ts` listens on `PORT`.
- `server/*.test.ts` — Vitest tests via `app.inject`.

## Rules

- Commits follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`.
- Server code must use erasable TypeScript only (no enums, namespaces, parameter properties) and import local files with the `.ts` extension.
- `mise run check` must pass before commit.
