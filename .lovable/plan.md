

## Update Per-Month Pricing Across All Upgrade Modals

**Problem**: The HardLimitModal, LeadLimitModal, and TrialExpiredModal all show flat prices (e.g., "₹499 for 12 months") instead of the per-month breakdown (e.g., "₹41/month, Billed as ₹499 for 12 months") that the Profile tab's UpgradeDrawer uses.

**Goal**: Make all upgrade surfaces consistent -- multi-month plans show per-month as the primary price, with total billed amount as secondary text.

---

### Changes (3 files)

**1. `src/components/subscription/HardLimitModal.tsx`**
- Update the price display in plan cards (line 174-177) to show per-month pricing for multi-month plans using `Math.floor(price / months)`
- Update the CTA button (line 196) to show per-month price instead of flat total

**2. `src/components/subscription/LeadLimitModal.tsx`**
- Update plan card price display (line 125-128) with per-month logic
- Update the CTA button (line 145) to show per-month price

**3. `src/components/subscription/TrialExpiredModal.tsx`**
- Update plan card price display (line 160-163) with per-month logic
- Update the CTA button (line 182) to show per-month price

---

### Pricing Logic (matching UpgradeDrawer)

For each plan card:
- If `months > 1`: Show `₹{Math.floor(price/months)}/month` as primary, and `Billed as ₹{price} for {months} months` as secondary
- If `months === 1`: Show `₹{price}` flat with "for 1 month"

For the CTA button:
- Show the selected plan's per-month price when applicable (e.g., "Upgrade to Pro -- ₹41/month")

This ensures all 5 upgrade surfaces (UpgradeDrawer, UpgradeModal, HardLimitModal, LeadLimitModal, TrialExpiredModal) display pricing identically.
