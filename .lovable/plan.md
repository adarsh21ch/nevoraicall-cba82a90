

# Combined "All-in-One Pro" Plan for App + Funnels

## The Idea

Instead of (or in addition to) separate subscriptions, offer a **combined plan** that unlocks both NevorAI App Pro features AND Funnels Pro features in a single purchase. This gives users three pricing options:

| Plan | Price | What it unlocks |
|---|---|---|
| App Pro Only | existing plans (Rs.99/mo, Rs.299/4mo, Rs.499/yr) | App features only (tracking, team, unlimited leads) |
| Funnels Pro Only | Rs.299/mo (new, separate plan) | Funnels features only |
| **Combined Pro** | Rs.399-499/mo (or discounted bundles) | **Everything** -- App Pro + Funnels Pro |

## How It Works (Technical Approach)

### Keep the existing system, extend it

Rather than reworking everything, we add a **plan scope** concept:

1. **Database**: Add a new `user_funnel_subscriptions` table (as previously planned) for standalone Funnels Pro buyers.

2. **Combined plan logic**: When a user buys a "Combined" plan:
   - Their `user_subscriptions` row gets set to `pro` (unlocks app features)
   - Their `user_funnel_subscriptions` row ALSO gets set to `pro` (unlocks funnel features)
   - Both tables are updated in a single webhook transaction

3. **New plans in `admin_subscription_plans`**:
   - `funnels_pro_monthly` -- Rs.299/mo, Funnels only
   - `combined_pro_monthly` -- Rs.399/mo, App + Funnels
   - `combined_pro_yearly` -- Rs.999/yr, App + Funnels (you set the price)

4. **Feature access check flow**:

```text
App feature check:
  useFeatureAccess() --> reads user_subscriptions --> existing behavior, no changes

Funnel feature check:
  useFunnelFeatureAccess() --> reads user_funnel_subscriptions --> new hook
```

5. **Payment routing** (edge functions):

```text
Plan key starts with "funnels_"  --> update user_funnel_subscriptions only
Plan key starts with "combined_" --> update BOTH tables
Plan key is anything else        --> update user_subscriptions only (existing)
```

### Admin Panel Control

- All plans managed in `admin_subscription_plans` -- you add/edit/disable plans anytime
- All funnel feature gates managed in `admin_feature_flags` with category "funnels"
- You can see combined subscribers in a new admin section
- "Grant Combined Pro" button for manual overrides

### Upgrade UI

The `UpgradeDrawer` (existing) and `FunnelsUpgradeDrawer` (new) both show relevant plans:
- From App context: shows App Pro plans + Combined plans
- From Funnels context: shows Funnels Pro plan + Combined plans
- Combined plans show a "Best Value" or "Save X%" badge

## Implementation Steps

### Phase 1: Funnels Pro (standalone)
1. Create `user_funnel_subscriptions` table with RLS
2. Add funnel feature flags to `admin_feature_flags`
3. Add `funnels_pro_monthly` plan to `admin_subscription_plans`
4. Create `useFunnelSubscription` and `useFunnelFeatureAccess` hooks
5. Update edge functions to route `funnels_` plans
6. Add gate checks in Funnels pages
7. Create `FunnelsUpgradeDrawer` component

### Phase 2: Combined Plan
8. Add `combined_pro_monthly` (and yearly) plans to `admin_subscription_plans`
9. Update edge functions: `combined_` prefix updates BOTH subscription tables
10. Update upgrade drawers to show combined plan option with savings badge
11. Add admin section for combined subscribers

### Files to Create/Modify

| File | Action |
|---|---|
| Database migration (new table + flags + plans) | Create |
| `src/hooks/useFunnelSubscription.ts` | Create |
| `src/hooks/useFunnelFeatureAccess.ts` | Create |
| `src/components/funnels/FunnelsUpgradeDrawer.tsx` | Create |
| `src/components/funnels/FunnelsProBadge.tsx` | Create |
| `src/pages/Funnels.tsx` | Modify (add gate checks) |
| `src/pages/FunnelEditor.tsx` | Modify (gate features) |
| `src/pages/FunnelAnalytics.tsx` | Modify (gate analytics) |
| `supabase/functions/razorpay-webhook/index.ts` | Modify (route funnels/combined plans) |
| `supabase/functions/verify-razorpay-payment/index.ts` | Modify (route funnels/combined plans) |
| `src/components/subscription/UpgradeDrawer.tsx` | Modify (show combined option) |
| Admin panel components | Modify (funnels subscription stats) |

This approach gives you maximum flexibility -- you can offer standalone plans, combined plans, or both, and control everything from the Admin Panel.
