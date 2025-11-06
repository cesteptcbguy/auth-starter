BEGIN;

-- Drop assets table
DROP TABLE IF EXISTS public.assets CASCADE;

-- Drop media_type enum
DROP TYPE IF EXISTS public.media_type;

-- Drop resource_type enum
DROP TYPE IF EXISTS public.resource_type;

-- Drop item_status enum
DROP TYPE IF EXISTS public.item_status;

COMMIT;
