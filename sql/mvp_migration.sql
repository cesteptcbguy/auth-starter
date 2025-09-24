-- === lookup tables ===
create table if not exists disciplines (
  id bigserial primary key,
  key text unique not null,
  label text not null
);

create table if not exists grade_bands (
  id bigserial primary key,
  key text unique not null,
  label text not null,
  min_grade int not null,
  max_grade int not null
);

create table if not exists languages (
  id bigserial primary key,
  iso_code text unique not null,
  name text not null
);

create table if not exists licenses (
  id bigserial primary key,
  key text unique not null,
  name text not null,
  url text
);

create table if not exists resource_types (
  id bigserial primary key,
  key text unique not null,
  label text not null
);

create table if not exists genres (
  id bigserial primary key,
  key text unique not null,
  label text not null
);

-- === orgs & users (app-level; Supabase Auth handles auth users) ===
create table if not exists organizations (
  id bigserial primary key,
  name text not null,
  created_at timestamptz default now()
);

-- app user profile with role + org
create type app_role as enum ('customer','developer','admin');

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null, -- maps to auth.users.id
  org_id bigint references organizations(id),
  role app_role not null default 'customer',
  created_at timestamptz default now()
);

-- === assets & metadata ===
create type asset_status as enum ('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED');

create table if not exists assets (
  id bigserial primary key,
  slug text generated always as (concat('a_', id)) stored,
  status asset_status not null default 'DRAFT',
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
create table if not exists collections (
  id bigserial primary key,
  owner_user_id uuid not null,
  name text not null,
  is_private boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists collection_items (
  id bigserial primary key,
  collection_id bigint not null references collections(id) on delete cascade,
  asset_id bigint not null references assets(id) on delete cascade,
  position int not null default 0,
  unique (collection_id, asset_id)
);

-- customer uploads (files in storage)
create table if not exists user_uploads (
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
create table if not exists standards_frameworks (
  id bigserial primary key,
  key text unique not null,
  name text not null,
  jurisdiction text,
  subject text,
  version text
);

create table if not exists standards_nodes (
  id bigserial primary key,
  framework_id bigint not null references standards_frameworks(id) on delete cascade,
  node_uid text unique not null,        -- stable uid (e.g., CCSS.ELA-Literacy.RL.3.1)
  code text not null,                   -- short code
  statement text not null,
  grade_band_key text,
  parent_id bigint references standards_nodes(id) on delete cascade,
  path ltree,                           -- hierarchical path
  order_index int default 0
);

create table if not exists asset_standards (
  asset_id bigint not null references assets(id) on delete cascade,
  node_id bigint not null references standards_nodes(id) on delete cascade,
  alignment_strength int,
  notes text,
  primary key (asset_id, node_id)
);

-- === indexes per PRD ===
create index if not exists idx_assets_trgm_title on assets using gin (title gin_trgm_ops);
create index if not exists idx_assets_trgm_desc on assets using gin (description gin_trgm_ops);
create index if not exists idx_assets_tags on assets using gin (tags);
create index if not exists idx_assets_resource_types on assets using gin (resource_types);
create index if not exists idx_assets_genres on assets using gin (genres);
create index if not exists idx_assets_grade_bands on assets using gin (grade_bands);
create index if not exists idx_assets_custom on assets using gin (custom_attributes jsonb_path_ops);
create index if not exists idx_nodes_framework_path on standards_nodes (framework_id, path);

-- === RLS enablement (we’ll add policies below) ===
alter table assets enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;
alter table user_uploads enable row level security;
alter table user_profiles enable row level security;

-- Minimal helper: map auth.uid() -> user_profiles row
create or replace view current_user_profile as
  select * from user_profiles where auth_user_id = auth.uid();
