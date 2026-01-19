-- Drop the old non-paginated version that's causing the PGRST203 conflict
-- The remaining paginated function has DEFAULT values, so it works with just search_query
DROP FUNCTION IF EXISTS public.admin_search_users(text);