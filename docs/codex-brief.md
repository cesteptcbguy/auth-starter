# Codex Brief — KĀʻEO Item Bank App Suite

## Stack

- Next.js App Router (TypeScript), Node 20, pnpm 9
- UI: Tailwind + shadcn/ui + sonner (use `<Toaster />` already in layout)
- Data/Auth: Supabase (RLS on)

## Runbook

- `pnpm dev` (localhost:3000)
- ENV: see `.env.example` (real secrets **not** committed)
- API inventory (MVP):
  - `GET /api/health`
- Pages:
  - `/sign-in`, `/dashboard` (protected)

## DB notes

- User profile is auto-provisioned on first sign-in (row keyed by `auth_user_id`).

## Coding guardrails

- Use shadcn/ui components; **don’t** use the deprecated toast (use `sonner`).
- Follow scripts: `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Keep `/api/*` return shape stable (`{ ok, ... }`).
- Add tests if feasible; at minimum include request/response examples in PR.

## Near-term tasks (Phase 1)

- Auth polish: reset flow & UI states
- Admin shell
