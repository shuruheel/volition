## Next.js 16 Upgrade Notes

- Upgraded to Next.js 16.0.0 and React 19.2.0.
- Removed `eslint` config from `next.config.mjs` (no longer supported).
- Updated `vaul` to `^1.1.2` for React 19 compatibility.
- TypeScript set to `react-jsx` runtime; `.next/dev/types` added to `tsconfig.json` include.

### Commands
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`

### Verification
- `pnpm build` succeeds.
- Start dev server and test routes at `http://localhost:3000`.

