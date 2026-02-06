
-- Add historical access config keys
INSERT INTO admin_usage_limits (config_key, config_value, description, is_enabled)
VALUES 
  ('restrict_historical_data', 0, 'Toggle to restrict free users from viewing past-date data', false),
  ('allowed_past_days', 0, 'Number of past days free users can access (0 = today only)', true)
ON CONFLICT (config_key) DO NOTHING;

-- Add scope config
INSERT INTO admin_config_text (config_key, config_value, description, is_enabled)
VALUES ('historical_restriction_scope', 'leads,funnel', 'Comma-separated scopes for historical data restriction', true)
ON CONFLICT (config_key) DO NOTHING;
