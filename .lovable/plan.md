

# Switch All Selected Tabs/Toggles from Black to Blue

## Recommendation

**Blue is the better choice.** Here's why:

- Your brand identity is built around blue and light-blue tones
- The Leads/Funnel toggle already uses blue (`bg-primary`) and looks great
- Black selected states feel generic -- blue creates a cohesive, premium SaaS feel
- Every major SaaS app (Notion, Linear, etc.) uses their brand color for active states, not plain black

## What Changes

Every tab, toggle, and sheet selector across the app will switch from black (`bg-foreground text-background`) to blue (`bg-accent text-accent-foreground`) for their selected/active state.

### Affected Components

1. **`src/components/ui/tabs.tsx`** (global TabsTrigger) -- this one change affects ALL pages using the Tabs component:
   - Calling page: Leads / Funnel toggle
   - To-Do page: Daily Tasks / To-Do List toggle
   - Follow-Up page: Leads / Funnel toggle
   - TrackUp page: Personal / Team and Leads / Funnel toggles

2. **`src/components/prospects/SheetTabs.tsx`** -- the "All", "16 Feb", "10 Feb" sheet tabs at the bottom:
   - Change `bg-foreground text-background` to `bg-accent text-accent-foreground`

3. **`src/components/ui/BottomViewToggle.tsx`** -- the floating bottom toggle:
   - Change `bg-foreground text-background` to `bg-accent text-accent-foreground`

4. **`src/components/trackup-v2/ModeSelectors.tsx`** -- TrackUp mode selectors:
   - Change `bg-foreground text-background` to `bg-accent text-accent-foreground`

5. **`src/components/trackup-v2/ManualUpdateDrawer.tsx`** -- Leads/Funnel category toggle inside the manual update drawer:
   - Change `bg-foreground text-background` to `bg-accent text-accent-foreground`

### What Stays the Same

- Buttons (`bg-primary`) -- these are action buttons, not tab selectors
- Calendar selected day -- already uses `bg-primary` correctly
- Profile level dropdown -- this is a different UI pattern, not a tab
- Badge and other UI primitives -- not tab-related

## Technical Details

### The Key Change (tabs.tsx)

The `TabsTrigger` default active style changes from:
```
data-[state=active]:bg-foreground data-[state=active]:text-background
```
to:
```
data-[state=active]:bg-accent data-[state=active]:text-accent-foreground
```

This single change cascades to every page using the `Tabs` component (Calling, Follow-Up, To-Do, TrackUp).

### Other Files

Each of the 4 remaining files just needs a simple find-and-replace of `bg-foreground text-background` with `bg-accent text-accent-foreground` in their active/selected state classes.

