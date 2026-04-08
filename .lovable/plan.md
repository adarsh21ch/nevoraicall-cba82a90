

# Admin: Restore Deleted Leads by User Email

## Context

The app uses soft-delete (`deleted_at` timestamp) for prospects. Currently, 1,875 soft-deleted leads exist in the database. Users can only see their own deleted leads via the "Recently Deleted" drawer in Profile. There is no admin-level tool to find and restore a user's deleted data.

**Important limitation**: Leads that were hard-deleted before the soft-delete system was implemented are permanently gone and cannot be recovered.

## What We Will Build

A new **"Data Recovery"** section in the Admin Panel that allows admins to:

1. Search for a user by email
2. View all their soft-deleted leads (with `deleted_at` set)
3. Restore individual leads or bulk-restore all deleted leads for that user
4. See metadata: lead name, phone, sheet, deletion date, days remaining before 30-day expiry

## Plan

### Step 1: Create AdminDataRecovery component

New file: `src/components/admin/AdminDataRecovery.tsx`

- **Search bar**: Input field for user email, search button
- On search: query `profiles` table to find user_id by email, then query `prospects` where `user_id = X AND deleted_at IS NOT NULL`
- **Results table**: Shows lead name, phone (masked), sheet_id, deleted_at, days remaining
- **Actions per row**: "Restore" button (sets `deleted_at = null`)
- **Bulk action**: "Restore All" button to restore all deleted leads for that user
- Confirmation dialog before bulk restore
- Success/error toasts

### Step 2: Add "Recovery" tab to Admin page

In `src/pages/Admin.tsx`:
- Add a new tab "Recovery" with a database/restore icon
- Render `AdminDataRecovery` inside that tab

### Technical Details

- Uses existing Supabase client with admin RLS bypass (admin check already in place)
- No database migration needed — queries existing `prospects` table
- Decryption handled via `useEncryption` hook for displaying lead names/phones
- All restore actions logged via `logAdminAction` for audit trail

