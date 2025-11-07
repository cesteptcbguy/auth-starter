# Setup

1. Create a new Supabase project.
2. Copy .env.example to .env and set:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - (optional) SUPABASE_SERVICE_ROLE_KEY for migrations/seeding only
3. Apply migrations:
   - Use Supabase CLI or run SQL files from supabase/migrations in order.
4. Dev:
   pnpm install
   pnpm dev
5. Screenshot mode:
   pnpm run screenshot  # runs with SCREENSHOT_MODE=1 to bypass auth in middleware
