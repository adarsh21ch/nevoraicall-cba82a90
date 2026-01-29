-- Security Addendum Migration for NevorAI Funnels System

-- 1. Add session token columns to funnel_leads
ALTER TABLE funnel_leads 
ADD COLUMN IF NOT EXISTS session_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS session_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_funnel_leads_session_token 
ON funnel_leads(session_token) WHERE session_token IS NOT NULL;

-- 2. Add unique index for Razorpay payment deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_payments_razorpay_dedup 
ON funnel_payments(provider_payment_id) 
WHERE provider_payment_id IS NOT NULL AND status = 'success';

-- 3. Create abuse_logs table for security monitoring
CREATE TABLE IF NOT EXISTS abuse_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('rate_limit', 'honeypot', 'invalid_token', 'suspicious_progress')),
  ip_hash TEXT,
  key_hash TEXT,
  funnel_id UUID REFERENCES funnels(id),
  lead_id UUID REFERENCES funnel_leads(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abuse_logs_time ON abuse_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_logs_type ON abuse_logs(event_type);

-- Enable RLS with no policies = service role only access
ALTER TABLE abuse_logs ENABLE ROW LEVEL SECURITY;