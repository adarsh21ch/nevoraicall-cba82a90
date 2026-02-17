
# Nevorai Complete Disaster Recovery and Ownership Backup Plan

This document provides everything needed for ANY engineer to fully reconstruct Nevorai 1-2 years from now, without depending on Lovable.

---

## PART 1 -- Full Database Export

### Step 1: Download Your Source Code (Git Repository)

Your entire frontend codebase is already version-controlled in Git. To get a permanent local copy:

1. Go to your Lovable project settings
2. Find the GitHub repository link
3. Clone it: `git clone <your-repo-url>`
4. This gives you ALL frontend code, edge functions, config files, types, and the auto-generated database schema type file

### Step 2: Export Full Database Schema

The complete database schema is already captured in your codebase at `src/integrations/supabase/types.ts` (5,463 lines). This file contains every table, column, type, and relationship.

To get the raw SQL schema, run this command against your database (you will need Supabase CLI access or direct PostgreSQL connection):

```text
pg_dump --schema-only --no-owner --no-privileges \
  -h db.kisankusogixarejjphi.supabase.co \
  -U postgres \
  -d postgres \
  > nevorai_schema_backup.sql
```

Alternatively, from Lovable Cloud "Run SQL" panel, you can export schema by running:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

### Tables Identified in the System (60+ tables)

Core Nevorai tables:
- `profiles` -- User profiles with neverai_id, subscription info, hierarchy
- `prospects` -- Lead/prospect management (the main CRM data)
- `sheets` -- Grouping sheets for prospects
- `activity_logs` -- Prospect change history
- `daily_stats` -- Auto-computed daily lead stats
- `daily_leads` -- Manual tracking data (leads, calls, videos, enrolls)
- `daily_tracking_logs` -- Detailed daily tracking with tag breakdowns
- `funnel_configs` -- TrackUp funnel period configuration
- `custom_options` -- User-defined stage/response/status tags
- `todos` -- To-do items
- `todo_templates` -- Reusable to-do templates
- `inbox_messages` -- Leader-member messaging
- `leader_levels` -- Multi-level hierarchy definitions
- `leader_member_aliases` -- Custom names for team members

Funnels subsystem:
- `funnels` -- Video funnel definitions
- `funnel_leads` -- Leads captured via funnels
- `funnel_payments` -- Payment records
- `funnel_price_options` -- Multiple pricing tiers
- `funnel_video_sessions` -- Video watch tracking
- `funnel_video_analytics` -- Detailed video events
- `funnel_view_analytics` -- Page view analytics
- `funnel_access` -- Shared funnel access
- `funnel_notifications` -- Lead notifications
- `funnel_tracking` -- Stage tracking data
- `video_assets` -- R2-stored video metadata
- `video_assets_access` -- Shared video permissions
- `video_folders` -- Video organization
- `video_folder_access` -- Folder sharing
- `video_plays` -- Video play events
- `video_stats_daily` -- Aggregated video stats

Forms subsystem:
- `nevorai_forms` -- Form definitions
- `nevorai_form_fields` -- Form field definitions
- `nevorai_form_submissions` -- Submission records
- `nevorai_submission_answers` -- Individual field answers
- `nevorai_submission_attachments` -- File uploads
- `nevorai_form_shares` -- Share tokens
- `nevorai_form_analytics_daily` -- Daily submission stats

Admin/Subscription:
- `user_subscriptions` -- Pro/free/trial status
- `payments_log` -- Razorpay payment records
- `user_roles` -- Admin role assignments
- `admin_feature_flags` -- Feature toggle system
- `admin_usage_limits` -- Free tier limits
- `admin_user_overrides` -- Per-user limit overrides
- `admin_subscription_plans` -- Plan definitions
- `admin_offers` -- Promotional offers
- `admin_config_text` -- Dynamic config (trial banners, etc.)
- `admin_audit_logs` -- Admin action logs
- `coupon_usages` -- Coupon tracking
- `abuse_logs` -- Rate limiting/abuse detection

Auth/Identity:
- `user_products` -- Product-scoped auth (nevorai vs achievers_club)
- `email_otps` -- OTP verification
- `user_app_access` -- App usage tracking
- `user_kyc_submissions` -- KYC verification

Achievers Club (separate product sharing same DB):
- `ac_profiles`, `ac_announcements`, `ac_chat_messages`, `ac_events`, `ac_todo_templates`, etc.

Community system:
- `communities`, `community_memberships`, `competitions`, `feed_posts`, `comments`, `learnup_topics`, `learnup_resources`, `reminders`

Courses:
- `courses`, `course_videos`, `course_enrollments`, `course_video_progress`

### Step 3: Export All Data

```text
pg_dump --data-only --no-owner \
  -h db.kisankusogixarejjphi.supabase.co \
  -U postgres \
  -d postgres \
  > nevorai_data_backup.sql
```

Or for CSV export of each table:
```sql
COPY (SELECT * FROM prospects) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;
-- Repeat for each table
```

### Key Business Definitions

**User**: A row in `profiles` table with a `user_id` (UUID from auth.users). Identified by `neverai_id` (e.g., NVR000123). Product scope tracked in `user_products`.

**Creator**: A user who owns at least one row in `funnels` table (`owner_user_id`).

**Views**: Tracked in `funnel_view_analytics` table. Each page visit creates a row with `viewer_id`, `watch_percentage`, `completed` status. Unique viewers counted via `COUNT(DISTINCT viewer_id)`. The `get_funnel_view_stats()` RPC function aggregates these.

**Video engagement**: `funnel_video_sessions` tracks per-session watch data. `video_plays` is an append-only event log. `video_stats_daily` stores hourly-aggregated metrics via `aggregate_video_stats()` pg_cron job.

**Funnel KPIs**: Calculated by `get_funnel_view_stats()` RPC -- total views, unique viewers, avg watch %, completion count, completion rate.

**Admin KPIs**: Aggregated via `admin_get_analytics()`, `admin_get_revenue_stats()`, `admin_get_active_usage_stats()`, `admin_get_retention_analytics()` RPC functions. Sources: `user_app_access` for DAU/WAU/MAU, `prospects` for lead counts, `payments_log` for revenue, `user_subscriptions` for plan breakdown.

### Database Functions (40+)

All listed in the provided context above. Key ones:
- `admin_get_analytics()` -- Main admin dashboard stats
- `admin_get_revenue_stats()` -- Revenue breakdown
- `admin_get_retention_analytics()` -- DAU/WAU/MAU
- `get_prospects_paginated()` -- Paginated prospect fetch
- `batch_reorder_prospects()` -- Drag-and-drop ordering
- `update_daily_stats()` -- Trigger-based stats
- `resolve_upline_leader_id()` -- Hierarchy resolution trigger
- `normalize_leader_id()` -- ID format normalization
- `can_leader_view_member()` -- Team access check
- `is_in_downline()` -- Hierarchy membership check
- `get_funnel_view_stats()` -- Funnel analytics aggregation

### Extensions Used
- `pg_cron` -- Scheduled jobs (video stats aggregation)
- `pg_net` -- HTTP requests from database
- Standard: `uuid-ossp`, `pgcrypto`

---

## PART 2 -- Edge Functions Export

All 23 edge functions live in `supabase/functions/` in your Git repo. Here is the complete list with purpose:

| Function | JWT | Purpose |
|---|---|---|
| `send-otp` | false | Send email OTP via Resend |
| `verify-otp-and-signup` | false | Verify OTP and create account |
| `cross-app-auth` | false | Check signup eligibility across products |
| `get-encryption-key` | false | Provide encryption key for phone encryption |
| `encrypt-data` | true | Encrypt sensitive data |
| `create-razorpay-order` | true | Create Razorpay payment order |
| `verify-razorpay-payment` | true | Verify payment signature |
| `razorpay-webhook` | false | Razorpay webhook handler |
| `admin-update-subscription` | true | Admin: update user subscription |
| `admin-reset-password` | true | Admin: reset user password |
| `admin-delete-user` | false | Admin: delete user account |
| `trackup-sso-link` | true | SSO link generation |
| `r2-get-upload-url` | false | Generate R2 presigned upload URL |
| `r2-confirm-upload` | false | Confirm R2 upload completion |
| `r2-get-playback-url` | false | Generate R2 signed playback URL |
| `create-funnel-lead` | false | Create lead from funnel page |
| `funnel-track-progress` | false | Track video watch progress |
| `submit-payment-proof` | false | Submit UPI payment proof |
| `upload-payment-screenshot` | false | Upload payment screenshot to R2 |
| `update-tracking` | false | Update TrackUp tracking data |
| `ai-assistant` | false | AI chat assistant |
| `nevorai-ai` | false | Advanced AI with tool-calling |
| `og-share` | false | Open Graph meta preview for shared links |

### Environment Variables / Secrets Required

| Secret | Purpose |
|---|---|
| `APP_SUPABASE_URL` | Backend Supabase URL |
| `APP_SUPABASE_ANON_KEY` | Backend anon key |
| `ENCRYPTION_KEY` | Phone number encryption |
| `CROSS_APP_SECRET` | Cross-app auth verification |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
| `R2_ACCOUNT_ID` | Cloudflare R2 account |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public URL for images |
| `RAZORPAY_KEY_ID` | Razorpay payment key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification |
| `RESEND_API_KEY` | Email sending (OTP) |
| `LOVABLE_API_KEY` | AI model access |

### Deployment Instructions (for new Supabase project)

```text
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref <new-project-id>

# Set secrets
supabase secrets set ENCRYPTION_KEY=xxx R2_ACCESS_KEY_ID=xxx ...

# Deploy all functions
supabase functions deploy send-otp
supabase functions deploy verify-otp-and-signup
# ... repeat for each function

# Or deploy all at once
for dir in supabase/functions/*/; do
  name=$(basename "$dir")
  supabase functions deploy "$name"
done
```

---

## PART 3 -- Full Frontend Source Code

Everything is in the Git repository. Key structure:

```text
src/
  App.tsx                    -- Root app with routing
  main.tsx                   -- Entry point
  index.css                  -- Global styles + CSS variables
  
  pages/                     -- 18 page components
    Auth.tsx                 -- Login/signup with OTP
    Dashboard.tsx            -- Main dashboard
    Home.tsx                 -- Home/landing
    Tracking.tsx             -- TrackUp dashboard
    TodoUp.tsx               -- To-do management
    ListUp.tsx               -- Prospect list (Calling tab)
    Profile.tsx              -- User profile/settings
    Admin.tsx                -- Admin panel
    Funnels.tsx              -- Funnels list
    FunnelEditor.tsx         -- Create/edit funnel
    FunnelAnalytics.tsx      -- Funnel stats
    FunnelView.tsx           -- Public funnel page
    Inbox.tsx                -- Messages
    
  contexts/                  -- 6 React contexts
    AuthContext.tsx           -- Auth state + session management
    ProspectsContext.tsx      -- Prospect CRUD operations
    CustomOptionsContext.tsx  -- User-defined tags
    TrackingFormatContext.tsx -- Tracking mode preferences
    TodosContext.tsx          -- To-do state
    PermissionsContext.tsx    -- Feature access control
    
  hooks/                     -- 60+ custom hooks
    useProfile.ts            -- Profile CRUD
    useProspectsQuery.ts     -- Prospect fetching
    useSubscription.ts       -- Plan status
    useFunnels.ts            -- Funnel CRUD
    useVideoAssets.ts        -- R2 video management
    useTrackingModes.ts      -- Auto/manual tracking
    useAdmin.ts              -- Admin operations
    ... (all in Git repo)
    
  components/                -- 100+ components organized by feature
    admin/                   -- Admin panel components
    ai/                      -- AI assistant
    calendar/                -- Calendar strip
    funnels/                 -- Funnel builder/viewer
    layout/                  -- Header, footer, bottom nav
    profile/                 -- Profile settings
    prospects/               -- Prospect table, filters, import
    subscription/            -- Upgrade modals, trial banners
    team/                    -- Team management
    todo/                    -- Daily tasks
    tracking/                -- Analytics charts
    trackup/                 -- TrackUp v1
    trackup-v2/              -- TrackUp v2 (current)
    ui/                      -- shadcn/ui components
    
  features/forms/            -- Forms module (self-contained)
    components/              -- Form builder, renderer, submissions
    hooks/                   -- useForms.ts
    pages/                   -- FormsDashboard, FormResponses, PublicForm
    types.ts                 -- Form type definitions
    utils/                   -- Form utilities
    
  integrations/supabase/     -- Auto-generated (DO NOT EDIT)
    client.ts                -- Supabase client setup
    types.ts                 -- Full database types (5,463 lines)
    
  types/                     -- TypeScript type definitions
    prospect.ts              -- Prospect types
    funnels.ts               -- Funnel types
    video-assets.ts          -- Video asset types
    
  lib/                       -- Utility functions
    encryption.ts            -- Phone encryption/decryption
    whatsapp.ts              -- WhatsApp message generation
    tagColors.ts             -- Tag color system
    validations.ts           -- Input validation
    
  config/                    -- App configuration
    appVersion.ts            -- Version tracking
    brand.ts                 -- Brand constants
    siteUrl.ts               -- URL configuration
```

### Build and Run Instructions

```text
# Prerequisites: Node.js 18+ and npm

# Install dependencies
npm install

# Set environment variables (create .env file)
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Key Dependencies
- React 18, TypeScript, Vite 5
- Tailwind CSS 3 + tailwindcss-animate
- shadcn/ui (Radix UI primitives)
- @supabase/supabase-js
- @tanstack/react-query (data fetching/caching)
- react-router-dom v6 (routing)
- recharts (charts)
- lucide-react (icons)
- xlsx (Excel import/export)
- @dnd-kit (drag and drop)
- date-fns (date utilities)
- zod (validation)
- sonner (toast notifications)
- vaul (drawer component)

---

## PART 4 -- Website Project

The nevorai.com website is a SEPARATE Lovable project sharing the SAME backend Supabase instance. To back it up:

1. Clone the website Git repository separately
2. It uses the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. It shares the same `nevorai-app-auth` localStorage key for cross-app sessions
4. It includes its own copies of: Public Form pages, Public Funnel pages, Share routes, OG meta preview

The key differences between app and website:
- Website is the marketing/landing site at nevorai.com
- App is the full dashboard at app.nevorai.com (this project)
- Both share the same database, edge functions, and auth system
- Forms/Funnels public pages exist in BOTH projects for URL routing

---

## PART 5 -- System Architecture Documentation

### Overall Architecture

```text
+------------------+     +------------------+
|  App Frontend    |     |  Website Frontend|
|  (Lovable/React) |     |  (Lovable/React) |
+--------+---------+     +--------+---------+
         |                         |
         +----------+--------------+
                    |
         +----------v-----------+
         |   Supabase Backend   |
         |  (kisankusogixarejjphi)|
         +----------+-----------+
         |  - Auth (OTP-based)  |
         |  - PostgreSQL DB     |
         |  - Edge Functions    |
         |  - RLS Policies      |
         +----------+-----------+
                    |
         +----------v-----------+
         |   Cloudflare R2      |
         |  (Video/Image Store) |
         +----------------------+
                    |
         +----------v-----------+
         |   External Services  |
         |  - Razorpay (payments)|
         |  - Resend (emails)   |
         +----------------------+
```

### Authentication Flow
1. User enters email on Auth page
2. `send-otp` edge function sends 6-digit OTP via Resend
3. User enters OTP
4. `verify-otp-and-signup` checks OTP, creates/signs-in user
5. Product scope checked via `user_products` table
6. Session stored in localStorage under `nevorai-app-auth`
7. `AuthContext` manages session state with auto-refresh

### Tracking Mode (Manual vs Automatic)
- Stored in `profiles.tracking_source_personal` and `tracking_source_total`
- Values: `'MANUAL'` or `'AUTO'`
- **MANUAL**: User enters numbers in ManualUpdateDrawer, saved to `personal_snapshot_v2` / `total_snapshot_v2`
- **AUTO**: System auto-calculates from `prospects` table data (count by stage/response)
- `useAutoTrackingSync` hook handles auto-computation
- TrackUp V2 supports switching between modes per metric type

### How Views Are Counted
- `funnel_view_analytics` -- one row per page view session
- `viewer_id` -- unique anonymous ID per browser
- `watch_percentage`, `completed` -- video engagement
- `get_funnel_view_stats(funnel_id)` RPC aggregates: total views, unique viewers, avg watch %, completion rate
- `video_plays` -- append-only event log for video plays
- `video_stats_daily` -- hourly aggregated by `aggregate_video_stats()` pg_cron

### Admin Dashboard Metrics and Their Sources

| Metric | Source Table/Function |
|---|---|
| Total users | `admin_get_analytics()` -> `user_app_access` WHERE app='nevorai' |
| Today active | `user_app_access.last_seen_at = today` |
| Week active | `user_app_access.last_seen_at >= 7 days ago` |
| Total creators | `SELECT COUNT(DISTINCT owner_user_id) FROM funnels` |
| Total funnels | `SELECT COUNT(*) FROM funnels` |
| Total videos | `SELECT COUNT(*) FROM video_assets` |
| Total views | `funnel_view_analytics` COUNT |
| Daily views | `funnel_view_analytics` WHERE date = today |
| Weekly views | `funnel_view_analytics` WHERE date >= 7 days ago |
| Monthly views | `funnel_view_analytics` WHERE date >= 30 days ago |
| Views per creator | `funnel_view_analytics` GROUP BY `owner_user_id` |
| Views per funnel | `get_funnel_view_stats(funnel_id)` |
| Active Pro users | `user_subscriptions` WHERE plan='pro' |
| Total leads | `SELECT COUNT(*) FROM prospects` |
| Revenue | `admin_get_revenue_stats()` -> `payments_log` (deduplicated) |
| Retention (DAU/WAU/MAU) | `admin_get_retention_analytics()` |

---

## PART 6 -- Complete Rebuild Instructions

### Step 1: Create New Supabase Project
1. Go to supabase.com, create account, create new project
2. Note the project URL, anon key, and service role key
3. Get the database connection string from Settings > Database

### Step 2: Restore Schema
```text
# Option A: From pg_dump file
psql -h db.<new-project-id>.supabase.co -U postgres -d postgres < nevorai_schema_backup.sql

# Option B: Run migrations in order
# All migration files are in supabase/migrations/ directory
supabase db push
```

### Step 3: Restore Data
```text
psql -h db.<new-project-id>.supabase.co -U postgres -d postgres < nevorai_data_backup.sql
```

### Step 4: Enable Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 5: Set Up pg_cron Jobs
```sql
-- Video stats aggregation (hourly)
SELECT cron.schedule('aggregate-video-stats', '0 * * * *', 'SELECT aggregate_video_stats()');
```

### Step 6: Deploy Edge Functions
```text
supabase link --project-ref <new-project-id>

# Set all secrets
supabase secrets set \
  ENCRYPTION_KEY="..." \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  R2_ACCOUNT_ID="..." \
  R2_BUCKET_NAME="..." \
  R2_PUBLIC_URL="..." \
  RAZORPAY_KEY_ID="..." \
  RAZORPAY_KEY_SECRET="..." \
  RAZORPAY_WEBHOOK_SECRET="..." \
  RESEND_API_KEY="..." \
  CROSS_APP_SECRET="..."

# Deploy functions
for dir in supabase/functions/*/; do
  supabase functions deploy "$(basename "$dir")"
done
```

### Step 7: Update config.toml
Copy `supabase/config.toml` from repository -- it contains JWT verification settings for each function.

### Step 8: Set Up Cloudflare R2
1. Create Cloudflare account
2. Create R2 bucket
3. Generate API tokens (Access Key ID + Secret)
4. Enable public access for image serving
5. Update secrets with new R2 credentials

### Step 9: Set Up Razorpay
1. Create Razorpay account
2. Get API keys from Dashboard > Settings > API Keys
3. Set up webhook URL: `https://<new-project-id>.supabase.co/functions/v1/razorpay-webhook`
4. Update secrets

### Step 10: Set Up Resend (Email)
1. Create Resend account
2. Verify your domain
3. Get API key
4. Update RESEND_API_KEY secret

### Step 11: Connect Frontend
```text
# Update .env
VITE_SUPABASE_PROJECT_ID="<new-project-id>"
VITE_SUPABASE_PUBLISHABLE_KEY="<new-anon-key>"
VITE_SUPABASE_URL="https://<new-project-id>.supabase.co"

# Install and run
npm install
npm run dev
```

### Step 12: Deploy Production
```text
npm run build
# Deploy dist/ folder to any static hosting:
# Vercel, Netlify, Cloudflare Pages, etc.
```

### Step 13: Set Up Custom Domain
- Point `app.nevorai.com` to your hosting provider
- Point `nevorai.com` to your website hosting

---

## Immediate Action Items for You

1. **Clone the Git repo now** -- this is your most critical backup. All source code, edge functions, and types are here.
2. **Run pg_dump** -- export both schema and data from the Supabase database. You can do this from Cloud View > Run SQL or via direct PostgreSQL connection.
3. **Save your secrets** -- store the 14 environment variables listed above in a secure password manager (1Password, Bitwarden, etc.).
4. **Back up R2 credentials** -- your Cloudflare R2 access keys and bucket configuration.
5. **Back up Razorpay/Resend credentials** -- payment and email service API keys.
6. **Store this document** -- save this plan alongside your code backup as `DISASTER_RECOVERY.md`.

With items 1-5 completed, any engineer can fully reconstruct Nevorai on any hosting platform.
