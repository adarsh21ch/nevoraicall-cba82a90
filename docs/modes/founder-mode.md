# Founder Mode — Phase 1 (Business Cockpit)

Founder mode re-skins the CRM into an operating system for a solo / small-business
founder. Phase 1 ships the **7-function cockpit**: a single place to see how
healthy each part of the business is and what needs attention today.

## The 7 functions

Every small business runs on the same seven functions. They are the single
source of truth in `src/config/founderFunctions.ts`:

`management`, `marketing`, `sales`, `operations`, `accounts`, `legal`, `hr`.

Each function carries a short description, a lucide icon name, a default review
cadence (`daily | weekly | monthly | quarterly | once`) and a 4–7 item
**system checklist** — the concrete SOPs that must exist for the function to be
"consistent".

## Navigation

Bottom nav (`src/config/modes/founder.ts`) surfaces the three daily-touch
functions plus profile:

- **Manage** (`/manage`) — business-at-a-glance home
- **Marketing** (`/marketing`) — marketing function detail
- **Sales** (`/sales`) — sales function detail
- **Profile** (`/profile`)

The other four functions (operations, accounts, legal, hr) live inside the
Manage home and open at `/manage/:functionKey`.

## What each function tracks

Per user, per function (`founder_functions` table, RLS-scoped to the owner):

- **status** — `missing | inconsistent | consistent`
- **cadence** — review rhythm
- **checklist** — which system/SOP items are in place (jsonb map)
- **notes** — free-form

UPSERT keyed on `(user_id, function_key)`.

## Manage home

1. **Business health** — overall score averaging each function's status
   (consistent = 100, inconsistent = 50, missing = 0) with a progress bar and
   per-status counts.
2. **Today's focus** — daily-cadence functions plus anything missing /
   inconsistent. Positive empty-state when everything is consistent.
3. **7 status cards** — icon, label, status pill, cadence, checklist progress;
   tap to open the function detail.

## Data layer

- Hook: `src/hooks/useFounderFunctions.ts` — `useFounderFunctions()` (all rows +
  `mergedFunctions` config⨝row) and `useFounderFunction(key)`.
- Migration: `supabase/migrations/20260602100000_founder_functions.sql`.

## Status

Phase 1 = self-assessment cockpit. Future phases can layer real CRM data
(actual leads → sales, content → marketing), AI nudges via the `founder`
persona, and per-function deep tools.
