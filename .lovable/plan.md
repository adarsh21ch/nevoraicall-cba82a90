

# Admin Panel UI/UX Overhaul — Modern SaaS Dashboard

## Overview
Transform the admin panel from card-based layouts to clean table-based layouts following Stripe/Supabase patterns. No backend logic changes — purely UI presentation improvements.

## Changes

### 1. Users Tab — Table Layout (`EnhancedUsersTab.tsx`)
- Replace `UserCard` components with a proper `<Table>` using the existing `table.tsx` UI component
- Columns: Name, Email, Plan (badge), Status, Expiry, Days Left, Leads, Joined, Actions
- Keep tier stat chips at top
- Keep existing search + plan filter
- Actions column: dropdown with Grant Plan, Override, Revoke, Suspend options
- Color-coded plan badges (gray/blue/amber)
- Sortable column headers (click to sort by leads, joined date, expiry)

### 2. Analytics Tab — Product Metrics (`AdminAnalyticsDashboard.tsx` + `EnhancedStatsGrid.tsx`)
- Reorganize stats grid into 3 sections: Growth, Usage, Revenue
- Growth: Total Users, New This Week, Trial-to-Paid Conversion
- Usage: Active Callers, Lead Importers, Today Active
- Revenue: Total Revenue, This Month, Avg Order Value
- Keep existing sub-tabs (Overview, Trials, Retention, Revenue, Offers)

### 3. Plans Tab — Table Layout (`PlansManager.tsx`)
- Convert plan cards to a `<Table>` with columns: Plan Name, Tier, Price, Duration, Status, Default, Actions
- Keep existing edit sheet, just change the list presentation
- Actions: Edit, Toggle Active, Set Default, Delete

### 4. Features Tab — Table Layout (`FeatureFlagsManager.tsx`)
- Convert stacked cards to a `<Table>` layout
- Columns: Feature Name, Module, Free (toggle), Basic (toggle), Pro (toggle), Tier Required, Actions
- Add module filter dropdown at top
- Group by module with section headers in the table
- Keep inline toggle switches for quick access control
- Keep Add Feature button

### 5. Audit Log — Table Layout (`AuditLogViewer.tsx`)
- Convert card-based log entries to a `<Table>`
- Columns: Timestamp, Admin, Action, Target, Description, Details (expandable)
- Keep existing filters and pagination
- Fix the "Failed to load" error by adding better error handling/retry

### 6. Notifications Tab — Targeting (`AdminNotificationsPanel.tsx`)
- Add a "Target Audience" select dropdown before the send button
- Options: All Users, Free Users, Basic Users, Pro Users, Trial Users, Expiring Soon
- Pass selected target to the edge function (UI-only for now, backend already sends to all)
- Keep existing send form and history

### 7. Admin Layout (`Admin.tsx`)
- Keep sticky KPI bar (already implemented)
- Improve tab styling with slightly larger text and better spacing
- Update subtitle from "Manage user subscriptions" to "Admin Dashboard"

## Files to Modify
1. `src/components/admin/EnhancedUsersTab.tsx` — table layout
2. `src/components/admin/FeatureFlagsManager.tsx` — table layout with toggles
3. `src/components/admin/PlansManager.tsx` — table layout (list portion only)
4. `src/components/admin/AuditLogViewer.tsx` — table layout + error fix
5. `src/components/admin/AdminNotificationsPanel.tsx` — add targeting select
6. `src/components/admin/AdminAnalyticsDashboard.tsx` — minor reorganization
7. `src/pages/Admin.tsx` — subtitle update, tab spacing

## Design Principles
- Use `Table/TableHeader/TableBody/TableRow/TableCell/TableHead` from existing UI components
- Consistent `text-sm` sizing throughout tables
- Sticky table headers where applicable
- Badges for status indicators
- Dropdown menus for actions (DropdownMenu component)
- Toggle switches inline in tables for boolean fields
- Clean spacing, no heavy borders

