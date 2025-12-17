-- Add indexes for frequently queried columns to improve performance
CREATE INDEX IF NOT EXISTS idx_prospects_action_taken ON prospects(action_taken);
CREATE INDEX IF NOT EXISTS idx_prospects_funnel_stage ON prospects(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_prospects_prospect_status ON prospects(prospect_status);
CREATE INDEX IF NOT EXISTS idx_prospects_updated_at ON prospects(updated_at);
CREATE INDEX IF NOT EXISTS idx_prospects_date_added ON prospects(date_added);
CREATE INDEX IF NOT EXISTS idx_prospects_batch_date ON prospects(batch_date);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_updated_at ON todos(updated_at);