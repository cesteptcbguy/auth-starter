# Contributing

## Branching

- feature branches: `feat/<area>-<short>` (e.g., `feat/catalog-facets`)
- bugfix: `fix/<area>-<short>`

## PR checklist

- references issue(s) & milestone
- `pnpm check` passes (typecheck+lint+build)
- include screenshots/GIF for UI
- document API I/O in the PR (examples)

## Code style

- TypeScript strict-ish; prefer explicit types on public functions
- UI: shadcn/ui + Tailwind; use `sonner` for toasts
- Keep env access via `process.env.*` in server or safe `NEXT_PUBLIC_*` on client
