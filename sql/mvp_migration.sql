-- =========================================
-- BoldBuilder schema (idempotent-safe)
-- =========================================

-- Extensions needed by indexes/types
create extension if not exists pg_trgm;
create extension if not exists ltree;

-- === lookup tables ===
create table if not exists public.disciplines (
  id bigserial primary key,
  key text unique not null,
  label text not null
);

create table if not exists public.grade_bands (
  id bigserial primary key,
  key text unique not null,
  label text not null,
  min_grade int not null,
  max_grade int not null
);

create table if not exists public.languages (
  id bigserial primary key,
  iso_code text unique not null,
  name text not null
);

create table if not exists public.licenses (
  id bigserial primary key,
  key text unique not null,
  name text not null,
  url text
);

create table if not exists public.resource_types (
  id bigserial primary key,
  key text unique not null,
  label text not null
);

create table if not exists public.genres (
  id bigserial primary key,
  key text unique not null,
  label text not null
);

-- === orgs & users (app-level; Supabase Auth handles auth users) ===
create table if not exists public.organizations (
  id bigserial primary key,
  name text not null,
  created_at timestamptz default now()
);

-- enum: public.app_role (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('customer','developer','admin');
  END IF;
END$$;

-- ensure labels exist even if the type already existed
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

create table if not exists public.user_profiles (
  id uuid primary key,
  auth_user_id uuid unique not null, -- maps to auth.users.id
  email text not null,
  org_id bigint references public.organizations(id),
  role public.app_role not null default 'customer',
  created_at timestamptz default now()
);

-- === assets & metadata ===

-- enum: public.asset_status (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'asset_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.asset_status AS ENUM ('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED');
  END IF;
END$$;

-- ensure labels exist (case-sensitive)
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'ARCHIVED';

create table if not exists public.assets (
  id bigserial primary key,
  slug text generated always as (concat('a_', id)) stored,
  status public.asset_status not null default 'DRAFT',
  title text not null,
  description text not null,          -- short preview teaser
  discipline text not null,
  subdisciplines text[] not null,
  grade_bands text[] not null,
  language text not null,
  license_key text not null,
  media_type text not null check (media_type in ('TEXT','IMAGE','TEXT_IMAGE')),
  resource_types text[] default '{}',
  genres text[] default '{}',
  tags text[] default '{}',
  custom_attributes jsonb default '{}'::jsonb,
  content_doc jsonb,                  -- JSON blocks (editor)
  thumbnail_url text,
  word_count int default 0,
  featured boolean default false,
  featured_rank int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- collections
create table if not exists public.collections (
  id bigserial primary key,
  owner_user_id uuid not null,
  name text not null,
  is_private boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.collection_items (
  id bigserial primary key,
  collection_id bigint not null references public.collections(id) on delete cascade,
  asset_id bigint not null references public.assets(id) on delete cascade,
  position int not null default 0,
  unique (collection_id, asset_id)
);

-- customer uploads (files in storage)
create table if not exists public.user_uploads (
  id bigserial primary key,
  owner_user_id uuid not null,
  file_path text not null,        -- storage path
  mime_type text,
  bytes bigint,
  title text,
  tags text[],
  subject text,
  notes text,
  created_at timestamptz default now()
);

-- === standards model ===
create table if not exists public.standards_frameworks (
  id bigserial primary key,
  key text unique not null,
  name text not null,
  jurisdiction text,
  subject text,
  version text
);

create table if not exists public.standards_nodes (
  id bigserial primary key,
  framework_id bigint not null references public.standards_frameworks(id) on delete cascade,
  node_uid text unique not null,        -- stable uid (e.g., CCSS.ELA-Literacy.RL.3.1)
  code text not null,                   -- short code
  statement text not null,
  grade_band_key text,
  parent_id bigint references public.standards_nodes(id) on delete cascade,
  path ltree,                           -- hierarchical path
  order_index int default 0
);

create table if not exists public.asset_standards (
  asset_id bigint not null references public.assets(id) on delete cascade,
  node_id bigint not null references public.standards_nodes(id) on delete cascade,
  alignment_strength int,
  notes text,
  primary key (asset_id, node_id)
);

-- === indexes per PRD ===
create index if not exists idx_assets_trgm_title on public.assets using gin (title gin_trgm_ops);
create index if not exists idx_assets_trgm_desc on public.assets using gin (description gin_trgm_ops);
create index if not exists idx_assets_tags on public.assets using gin (tags);
create index if not exists idx_assets_resource_types on public.assets using gin (resource_types);
create index if not exists idx_assets_genres on public.assets using gin (genres);
create index if not exists idx_assets_grade_bands on public.assets using gin (grade_bands);
create index if not exists idx_assets_custom on public.assets using gin (custom_attributes jsonb_path_ops);
create index if not exists idx_nodes_framework_path on public.standards_nodes (framework_id, path);

-- === RLS enablement (we’ll add policies below) ===
alter table if exists public.assets enable row level security;
alter table if exists public.collections enable row level security;
alter table if exists public.collection_items enable row level security;
alter table if exists public.user_uploads enable row level security;
alter table if exists public.user_profiles enable row level security;

-- Minimal helper: map auth.uid() -> user_profiles row
create or replace view public.current_user_profile as
  select * from public.user_profiles where auth_user_id = auth.uid();

-- Ensure legacy installs have the latest user_profiles shape
alter table if exists public.user_profiles alter column id drop default;
alter table if exists public.user_profiles add column if not exists email text;
update public.user_profiles up
set email = coalesce(up.email, au.email)
from auth.users au
where au.id = up.auth_user_id;
alter table if exists public.user_profiles alter column email set not null;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.role = 'admin'
  );
$$;

-- Drop old policies (safe if missing), then re-create
drop policy if exists "Select own profile" on public.user_profiles;
drop policy if exists "Update own profile" on public.user_profiles;
drop policy if exists "Insert own profile" on public.user_profiles;

create policy "Select own profile" on public.user_profiles
for select
using (auth.uid() = id or public.is_admin());

create policy "Update own profile" on public.user_profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "Insert own profile" on public.user_profiles
for insert
with check (auth.uid() = id and auth.uid() = auth_user_id);
