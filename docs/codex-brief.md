# Codex Brief — BoldBuilder

## Stack
- Next.js App Router (TypeScript), Node 20, pnpm 9
- UI: Tailwind + shadcn/ui + sonner (use `<Toaster />` already in layout)
- Data/Auth: Supabase (RLS on)
- Payments: Stripe (test mode for now)

## Runbook
- `pnpm dev` (localhost:3000)
- ENV: see `.env.example` (real secrets **not** committed)
- API inventory (MVP):
  - `GET /api/health`
  - `GET /api/db-test`
  - `GET /api/assets` (filters: q, discipline, gradeBand, mediaType, resourceType, genre, sort=newest|featured|relevance, page, per)
  - Collections:
    - `GET/POST /api/collections`
    - `PATCH/DELETE /api/collections/:id`
    - `POST/DELETE /api/collections/:id/items`
- Pages:
  - `/sign-in`, `/dashboard` (protected)
  - `/catalog` (search & facets)
  - `/asset/[id]` (detail)
  - `/collections`, `/collections/[id]`

## DB notes
- RLS: anon/auth can read `assets` **only if** `status='PUBLISHED'`.
- User profile is auto-provisioned on first sign-in (row keyed by `auth_user_id`).
- Buckets: `catalog-images` (public), `thumbnails` (public), `catalog-docs` & `user-uploads` (private).
- Seeds: demo assets tagged `demo`.

## Coding guardrails
- Use shadcn/ui components; **don’t** use the deprecated toast (use `sonner`).
- Follow scripts: `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Keep `/api/*` return shape stable (`{ ok, ... }`).
- Add tests if feasible; at minimum include request/response examples in PR.

## Near-term tasks (Phase 1)
- Auth polish: reset flow & UI states
- Catalog: improve “relevance” ranking, empty/loading states
- Collections: reorder items; nicer UX
- Uploads: signed URL flow & DB record
- Stripe: checkout session (test)
- Admin shell
