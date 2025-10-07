# AGENTS.md

Purpose  
This document defines what automated agents (e.g., Codex) may and may not change in this repo, plus the required build/test flows.

## Golden rules
1) Do not regress auth, profile provisioning, or CI that landed in Epic #10.  
2) Prefer additive edits over replacements. If a file is listed as “frozen,” apply changes on top of it, not by swapping in an older copy.  
3) All SQL must be idempotent. Never create types/tables/policies without IF NOT EXISTS (or guard blocks).  
4) Screenshot workflow must work without manual env exports.  
5) Keep PRs mergeable and green. If you touch CI or package.json, you must run the full pipeline locally first.

## Frozen files & areas (do not overwrite)
These are the source of truth. Only make minimal/appended changes that don’t alter their established behavior.

- src/lib/profile.ts  
  - Contract: id === auth_user_id for user_profiles; selects use explicit column list.  
- src/app/dashboard/page.tsx  
  - Contract: read profile; if missing, upsert; render.  
  - Must respect screenshot mode.  
- middleware.ts  
  - Must bypass Supabase auth checks when SCREENSHOT_MODE=1 or NEXT_PUBLIC_SCREENSHOT_MODE=1.  
- sql/mvp_migration.sql  
  - All objects created idempotently; RLS policies for user_profiles; trigger enforces id=auth_user_id.  
- .github/workflows/ci.yml  
  - Uses Corepack+pnpm, installs Playwright with `pnpm dlx playwright install --with-deps`, builds with fonts disabled, runs screenshot.  
- package.json (specific scripts)  
  - start: `next start -p 3000`  
  - screenshot:  
    - \"screenshot:cli\": \"playwright screenshot --wait-for-timeout=1500 http://localhost:3000/dashboard public/desktop.png\"  
    - \"screenshot\": \"cross-env SCREENSHOT_MODE=1 NEXT_PUBLIC_SCREENSHOT_MODE=1 start-server-and-test start http://localhost:3000 \"pnpm screenshot:cli\"\"  

If a change is needed in a frozen file, explain why in the PR description and keep behavior identical unless explicitly requested.

## Safe areas for polish
- src/app/sign-in/* (UI states, copy, accessibility, loading/disabled states).  
- src/app/layout.tsx and src/app/fonts.ts (style polish only; do not reintroduce Google Fonts network dependency—local fonts only).  
- CSS and component-level styling.  
- Non-auth pages and components.

## Database rules
- Enums: create with a guarded DO $$ block; add labels with `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.  
- Tables: `create table if not exists public.<name> (...)`.  
- RLS: enable with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and create policies only if missing.  
- Never drop objects that might exist in another environment without a guard.  
- Keep `public.is_admin()` (session-based) intact; adding a parameterized variant is okay:
  ```sql
  create or replace function public.is_admin(uid uuid) returns boolean ...
  ```

## Auth/profile rules
- On first login, upsert user_profiles with `{ id: user.id, auth_user_id: user.id, email }` and then read back.  
- Policies must allow:
  - INSERT: `with check (auth.uid() = auth_user_id)`  
  - SELECT/UPDATE: `using/with check (auth.uid() = id OR auth.uid() = auth_user_id OR public.is_admin())`  
- Keep trigger to enforce `id = auth_user_id`.

## Screenshot workflow rules
- Must work headlessly and bypass auth via env flags set by the script (no manual export).  
- Output is `public/desktop.png`.  
- Do not change the URL under capture: `http://localhost:3000/dashboard`.

## CI rules (GitHub Actions)
- Node 20, Corepack with pnpm 9.15.9.  
- Install deps: `pnpm install --frozen-lockfile`.  
- Install Playwright browsers: `pnpm dlx playwright install --with-deps`.  
- Steps (in order): typecheck → lint → build (with `NEXT_DISABLE_FONT_DOWNLOADS=1`) → screenshot → upload artifact.  
- Provide harmless public envs for build/screenshot:
  - `NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co'`  
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY='test_anon_key'`

## PR acceptance checklist (agents must ensure all are true)
- [ ] No changes to frozen file behavior (or explicit justification provided).  
- [ ] `pnpm typecheck` passes locally.  
- [ ] `pnpm lint` passes locally.  
- [ ] `NEXT_DISABLE_FONT_DOWNLOADS=1 pnpm build` passes locally.  
- [ ] `pnpm run screenshot` generates `public/desktop.png`.  
- [ ] GitHub CI green; screenshot artifact attached.  
- [ ] For SQL changes: idempotent and re-runnable on an existing schema.  
- [ ] For auth/profile: first-login provisioning still works; dashboard renders.

## “Ask first” list (open a discussion instead of changing)
- Replacing the screenshot target page or file path.  
- Introducing new environment variables required at build time.  
- Switching font strategy away from local files.  
- Changing RLS semantics or policy names.

## Quick commands agents may use

Compare branches:
```bash
git fetch origin
git diff --name-status origin/<base>...origin/<feature>
git log --oneline origin/<base>..origin/<feature>
```

Keep current CI during rebase conflicts:
```bash
git checkout --ours .github/workflows/ci.yml
git add .github/workflows/ci.yml
git rebase --continue
```

Playwright on CI:
```bash
pnpm dlx playwright install --with-deps
```

Local CI mirror:
```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate
pnpm install
pnpm typecheck
pnpm lint
NEXT_DISABLE_FONT_DOWNLOADS=1 pnpm build
pnpm run screenshot
```
