INSERT INTO public.admin_feature_flags (
  feature_key, feature_name, description, module, category,
  is_enabled, required_tier,
  free_access, free_limit,
  pro_access, pro_limit,
  trial_access, trial_limit
) VALUES (
  'share_leads', 'Share Leads with Team', 'Share selected leads with direct team members',
  'application', 'CALLING',
  true, 'pro',
  false, 0,
  true, null,
  true, null
)
ON CONFLICT (feature_key) DO NOTHING;