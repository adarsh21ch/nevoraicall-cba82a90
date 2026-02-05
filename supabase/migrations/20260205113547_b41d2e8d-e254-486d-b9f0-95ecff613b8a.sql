-- ============================================================================
-- MIGRATION: video_assets_access
-- Purpose: Enable video sharing between users without re-uploading
-- ============================================================================

-- Add shareable flag to existing video_assets table
ALTER TABLE video_assets 
ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN DEFAULT false;

-- Create video access sharing table
CREATE TABLE IF NOT EXISTS video_assets_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_asset_id UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- Who can use this video
  granted_by_user_id UUID NOT NULL,  -- Who granted access (owner)
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,  -- NULL = active access
  
  -- Prevent duplicate grants
  UNIQUE(video_asset_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_video_access_user 
  ON video_assets_access(user_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_video_access_video 
  ON video_assets_access(video_asset_id);

CREATE INDEX IF NOT EXISTS idx_video_access_granted_by 
  ON video_assets_access(granted_by_user_id);

-- Enable RLS
ALTER TABLE video_assets_access ENABLE ROW LEVEL SECURITY;

-- Policy: Video owners can manage access grants for their videos
CREATE POLICY "Owners can manage video access" ON video_assets_access
  FOR ALL USING (
    granted_by_user_id = auth.uid()
    OR video_asset_id IN (
      SELECT id FROM video_assets WHERE owner_user_id = auth.uid()
    )
  );

-- Policy: Users can view their own access grants (to see shared videos)
CREATE POLICY "Users can view their access grants" ON video_assets_access
  FOR SELECT USING (user_id = auth.uid());

-- Update video_assets RLS to allow viewing shared videos
CREATE POLICY "Users can view shared videos" ON video_assets
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR id IN (
      SELECT video_asset_id 
      FROM video_assets_access 
      WHERE user_id = auth.uid() AND revoked_at IS NULL
    )
  );