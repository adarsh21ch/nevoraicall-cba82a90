-- Phase 4: Add soft delete column to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create partial index for efficient filtering of deleted records
CREATE INDEX IF NOT EXISTS idx_prospects_deleted_at ON prospects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create index for active prospects (WHERE deleted_at IS NULL is used in most queries)
CREATE INDEX IF NOT EXISTS idx_prospects_active ON prospects(user_id, date_added) WHERE deleted_at IS NULL;