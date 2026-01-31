-- Enable pgcrypto extension for generating random bytes/tokens
-- Required for Nevorai Forms share token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;