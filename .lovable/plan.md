
# Fix: Retargeting Filter Persistence After Refresh

## Problem
User-selected filter tags in the Retargeting dropdowns (Response Tags, Funnel Stages) are not persisting after:
1. Page refresh
2. Closing and reopening the app (PWA)

The user expects that if they select 2-3 tags in the Retargeting filters, those selections should remain when they return to the page.

## Root Cause Analysis

After thorough investigation of the codebase, the `usePersistedFilters` hook at `src/hooks/usePersistedFilters.ts` appears to have correct logic for saving and loading filters from localStorage. However, there are **two potential issues**:

### Issue 1: Effect runs on initial mount and may overwrite persisted data
The `useEffect` that saves filters to localStorage runs on **every change**, including the initial mount. In React StrictMode, the component mounts, unmounts, and remounts - which could cause timing issues.

### Issue 2: Component key changes causing unnecessary remounts
The `ProspectTable` component in `Dashboard.tsx` uses a dynamic `key` prop that changes when switching sheets or tabs. While this is intentional for scroll reset, it causes the component to fully remount, potentially triggering the save effect before the lazy initializer has properly loaded persisted data.

## Solution

### Fix 1: Prevent effect from running on initial mount
Add a flag to skip the first effect execution, ensuring we don't accidentally overwrite persisted filters before they're properly loaded.

### Fix 2: Use a ref to track initialization state
Track whether the component has completed initialization from localStorage before allowing any writes.

## Technical Changes

**File: `src/hooks/usePersistedFilters.ts`**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { FunnelStage, ProspectQuality, ExtendedActionTaken } from '@/types/prospect';

export interface Filters {
  search: string;
  stages: FunnelStage[];
  qualities: ProspectQuality[];
  actions: ExtendedActionTaken[];
  incompleteOnly: boolean;
}

interface PersistedFilterData {
  actions: string[];
  stages: string[];
  incompleteOnly: boolean;
}

const STORAGE_KEY_PREFIX = 'nevorai-filters-';

const DEFAULT_FILTERS: Filters = {
  search: '',
  stages: [],
  qualities: [],
  actions: [],
  incompleteOnly: false,
};

/**
 * Hook to persist filter state to localStorage.
 * Filters are stored per filter mode (calling vs funnel).
 */
export function usePersistedFilters(filterMode: 'calling' | 'funnel') {
  const storageKey = `${STORAGE_KEY_PREFIX}${filterMode}`;
  
  // Track if initial load is complete to prevent overwriting on mount
  const isInitializedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  // Lazy initialization: read from localStorage only once on mount
  const [filters, setFiltersState] = useState<Filters>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      console.log('[usePersistedFilters] Init:', storageKey, stored);
      if (stored) {
        const parsed: PersistedFilterData = JSON.parse(stored);
        // Mark as initialized since we found persisted data
        isInitializedRef.current = true;
        return {
          search: '', // Never persist search
          stages: Array.isArray(parsed.stages) ? parsed.stages : [],
          qualities: [], // Never persist qualities
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          incompleteOnly: typeof parsed.incompleteOnly === 'boolean' ? parsed.incompleteOnly : false,
        };
      }
    } catch (error) {
      console.warn('Failed to read persisted filters:', error);
    }
    // No persisted data found, use defaults
    isInitializedRef.current = true;
    return DEFAULT_FILTERS;
  });

  // Save to localStorage whenever filters change
  // Skip the first render to prevent overwriting persisted data on mount
  useEffect(() => {
    // Skip the first render entirely
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Only save if we've been initialized
    if (!isInitializedRef.current) {
      return;
    }

    try {
      const dataToStore: PersistedFilterData = {
        actions: filters.actions,
        stages: filters.stages,
        incompleteOnly: filters.incompleteOnly,
      };
      console.log('[usePersistedFilters] Save:', storageKey, dataToStore);
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to persist filters:', error);
    }
  }, [filters.actions, filters.stages, filters.incompleteOnly, storageKey]);

  // Wrapped setFilters that also clears storage when clearing filters
  const setFilters = useCallback((newFilters: Filters) => {
    setFiltersState(newFilters);
    
    // If clearing all filters, also clear from storage
    if (
      newFilters.actions.length === 0 &&
      newFilters.stages.length === 0 &&
      !newFilters.incompleteOnly
    ) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to clear persisted filters:', error);
      }
    }
  }, [storageKey]);

  return { filters, setFilters };
}
```

## Key Changes Summary

| Change | Purpose |
|--------|---------|
| Add `isFirstRenderRef` | Skip saving on initial mount to prevent overwriting persisted data |
| Add `isInitializedRef` | Track initialization status for safety |
| Add console.log for debugging | Helps verify filters are being read/written correctly |
| Skip first effect execution | Ensures lazy initializer data is preserved |

## Testing Steps

After implementation:
1. Open the Calling/Dashboard page
2. Select 2-3 tags in the Response/Retargeting filter
3. Verify the tags appear selected
4. Refresh the page (Ctrl+R or pull down)
5. Verify the same 2-3 tags are still selected
6. Close the app completely
7. Reopen the app
8. Verify the same 2-3 tags are still selected

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePersistedFilters.ts` | Add first-render skip logic to prevent overwriting persisted data on mount |

## Why This Works

The root issue is that React's `useEffect` runs **after** the component renders, including on the initial render. Even though the lazy initializer correctly reads from localStorage, the effect immediately fires and writes the current state back to localStorage.

In React StrictMode (development), the component mounts twice, which can cause race conditions. By skipping the first effect execution with `isFirstRenderRef`, we ensure:

1. Lazy initializer reads persisted data from localStorage
2. First render completes with correct persisted state
3. Effect is skipped on first render (no overwrite)
4. Subsequent user changes trigger the effect normally
5. Filters are correctly persisted

This approach is a standard pattern for preventing effects from running on initial mount when dealing with persisted state.
