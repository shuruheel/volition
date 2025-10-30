# Repository Guidelines

## Project Structure & Module Organization
We use the Next.js `app/` router: feature routes like `app/dashboard`, `app/chat`, and `app/settings` hold layouts, loading states, and server actions, while `app/layout.tsx` wires global providers. Shared UI stays in `components/` (files remain `kebab-case.tsx`; exported components stay `PascalCase`) and reusable hooks in `hooks/`. Cross-cutting logic lives in `lib/`—`lib/ai/` for model orchestration, `lib/db.ts` for Neon, `lib/mock-data.ts` for offline fixtures. Keep database migrations in `db/migrations/`, static assets in `public/`, and Tailwind layering in `styles/`. Vendor notes and integration briefs belong under `docs/`, and `scripts/setup-db.ts` seeds local data when the remote DB is unavailable.

## Build, Test, and Development Commands
Run `pnpm install` after pulling to respect the lockfiles. `pnpm dev` starts the dev server on port 3000 with hot reload; use it for UI checks. `pnpm build` must succeed before review, and `pnpm start` serves the production bundle. `pnpm lint` applies the Next/TypeScript ESLint rules; add `--fix` when safe and review the diff before committing.

## Coding Style & Naming Conventions
Code is TypeScript-first with React 19 function components. Use 2-space indentation, trailing commas, and keep strict TypeScript options intact. Co-locate Tailwind classes with the component; promote shared tokens into `styles/` as needed. Name files `kebab-case.tsx` or `kebab-case.ts`, keep components `PascalCase`, helpers `camelCase`, and prefer brief leading comments for non-obvious flows. Server utilities belong in `lib/` or route-specific `app/**/actions.ts` files.

## Testing Guidelines
Automated tests are not yet wired into `package.json`; ship new logic with either lightweight unit tests (place `*.test.ts` beside the code and run via `pnpm test` once the script lands) or explicit manual steps in the PR. Always run `pnpm lint` and exercise affected routes in `pnpm dev`, with extra attention on dashboard metrics, the chat drawer, and agent management flows that rely on mock data.

## Commit & Pull Request Guidelines
Follow the conventional commit prefixes already in history (`feat:`, `chore(next):`, `refactor:`) and keep subject lines under 80 characters. Squash noisy work before opening the PR, link any tracked issue, and call out configuration or migration changes explicitly. Attach UI screenshots when behavior shifts, list reproducible steps, and flag follow-up tasks if something ships behind a TODO.

## Security & Configuration Tips
Copy `env.example` to `.env.local`, fill in Neon, Twilio, and OpenAI credentials, and never commit secrets. Document new variables in `env.example`, and expose them with `NEXT_PUBLIC_` only when the client strictly needs them.
