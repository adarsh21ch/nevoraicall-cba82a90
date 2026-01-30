

# Database Schema Fixes for Funnels Payment System

## Problem Summary
After analyzing the App Supabase database schema and comparing it with the edge function code and frontend TypeScript types, I've identified **3 missing database columns** that need to be added to enable the complete UPI payment flow.

---

## Missing Schema Elements

### 1. `funnel_payments.price_option_id` (MISSING)
- **Issue:** The `submit-payment-proof` edge function inserts `price_option_id` (line 115), but this column doesn't exist in the database
- **Impact:** Payment submissions will fail with a database error

### 2. `funnel_price_options.updated_at` (MISSING)
- **Issue:** The TypeScript types and hooks expect an `updated_at` column, but the table only has `created_at`
- **Impact:** Type mismatches and potential runtime errors

### 3. `funnel_price_options.upi_id` (NOT NULL Constraint)
- **Issue:** The column has a NOT NULL constraint, but the frontend allows creating price options without a UPI ID (when only a QR code is used)
- **Impact:** Inserts without `upi_id` will fail

---

## SQL Migration for App Supabase

Run this SQL in your **App Supabase SQL Editor**:

```sql
-- 1. Add price_option_id column to funnel_payments
ALTER TABLE funnel_payments 
ADD COLUMN IF NOT EXISTS price_option_id UUID 
REFERENCES funnel_price_options(id) ON DELETE SET NULL;

-- 2. Add updated_at column to funnel_price_options
ALTER TABLE funnel_price_options 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Make upi_id nullable in funnel_price_options
ALTER TABLE funnel_price_options 
ALTER COLUMN upi_id DROP NOT NULL;

-- 4. Create trigger to auto-update updated_at on funnel_price_options
CREATE OR REPLACE FUNCTION update_funnel_price_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_funnel_price_options_updated_at ON funnel_price_options;
CREATE TRIGGER set_funnel_price_options_updated_at
  BEFORE UPDATE ON funnel_price_options
  FOR EACH ROW
  EXECUTE FUNCTION update_funnel_price_options_updated_at();

-- 5. Backfill existing price options with updated_at = created_at
UPDATE funnel_price_options 
SET updated_at = created_at 
WHERE updated_at IS NULL;
```

---

## Verification After Running SQL

After executing the migration, verify the schema:

```sql
-- Check funnel_payments columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'funnel_payments' 
ORDER BY ordinal_position;

-- Check funnel_price_options columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'funnel_price_options' 
ORDER BY ordinal_position;
```

---

## Files Requiring Updates in Lovable Cloud

Once the App Supabase schema is fixed, the following updates should be made in the Lovable Cloud project to sync the types:

| File | Change |
|------|--------|
| `src/integrations/supabase/types.ts` | Will auto-update after schema change (types are generated) |
| `src/types/funnels.ts` | Update `upi_id` to be `string \| null` in `FunnelPriceOption` |

---

## Edge Functions Deployment Checklist

Ensure these functions are deployed to **App Supabase**:

| Function | Deployed? | Config.toml Entry? |
|----------|-----------|---------------------|
| `submit-payment-proof` | Needs deployment | Yes, `verify_jwt = false` |
| `upload-payment-screenshot` | Needs deployment | Yes, `verify_jwt = false` |
| `create-funnel-lead` | Check status | Yes, `verify_jwt = false` |

---

## Implementation Steps

1. **Run the SQL migration** in App Supabase SQL Editor
2. **Verify the schema** with the verification query
3. **Deploy edge functions** to App Supabase:
   - `submit-payment-proof`
   - `upload-payment-screenshot`
4. **Test the flow**:
   - Create a funnel with UPI payment
   - Add price options with QR codes
   - Test public funnel lead capture
   - Test payment screenshot upload
   - Verify payment in dashboard

