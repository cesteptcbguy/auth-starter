# Christopher Estep Auth Starter

[![CI](https://github.com/cesteptcbguy/boldbuilder/actions/workflows/ci.yml/badge.svg)](https://github.com/cesteptcbguy/boldbuilder/actions/workflows/ci.yml)

A minimal Supabase + Next.js starter that ships only the auth flows we need:

- `/` &mdash; marketing splash with links into the app
- `/sign-in` &mdash; email/password with redirect support
- `/reset-password` &mdash; request + update password flows
- `/dashboard` &mdash; mock “future modules” screen for authenticated users
- `/dashboard/signout` &mdash; server route that clears Supabase cookies

## Run locally

1. Install deps: `pnpm install`
2. Copy the env template: `cp .env.example .env` (fill Supabase keys)
3. Start dev server: `pnpm dev` (http://localhost:3000)
