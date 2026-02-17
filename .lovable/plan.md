

# Fix: PWA Stuck on Loading Screen

## Problem
Some users who installed the app as a PWA (Add to Home Screen) see the logo and a loading spinner that never goes away. The app never loads past this state.

## Root Cause (2 issues found)

### 1. Service Worker Caches Supabase API Calls
The current `sw.js` uses a **cache-first** strategy for ALL non-navigation requests:
```js
// Current problematic code
event.respondWith(
  caches.match(event.request).then(response => response || fetch(event.request))
);
```
This means if a Supabase auth/API response ever gets cached, the app will keep getting stale responses instead of hitting the network. Expired tokens, stale sessions -- all served from cache.

### 2. No Auth Loading Timeout
If the Supabase auth check (`getSession()`) hangs due to network issues (common on mobile/PWA), the `loading` state stays `true` forever, and the user sees an infinite spinner with no way out.

---

## Fix Plan

### Step 1: Update `public/sw.js` -- Exclude API calls from caching
- Add explicit bypass for Supabase API URLs (`supabase.co`) so they always go to the network
- Only cache static assets (images, fonts, icons) with cache-first
- Bump cache version to `v4` to clear old stale caches

### Step 2: Add auth loading timeout in `src/contexts/AuthContext.tsx`
- Add a 10-second safety timeout: if auth loading hasn't resolved in 10 seconds, force `loading = false`
- This ensures users can still reach the login page even on slow/offline connections
- The timeout is cleared if auth resolves normally

### Step 3: Add offline fallback in `src/pages/Auth.tsx`
- Show a "Tap to retry" message if the auth page loads but can't connect to the server, instead of an infinite spinner

---

## Technical Details

**sw.js changes:**
- Bypass all `supabase.co` requests (never cache API calls)
- Bypass all `supabase.co/auth` and `supabase.co/rest` URLs
- Keep navigation as network-first (already correct)
- Keep static assets as cache-first but only for known static file types

**AuthContext.tsx changes:**
- Add `useEffect` with a `setTimeout` of 10 seconds
- If `loading` is still `true` after 10 seconds, force it to `false` and log a warning
- Clear the timeout on cleanup or when loading naturally resolves

**Auth.tsx changes:**
- Minor: when `authLoading` finishes but there's no connectivity, show a retry button instead of just the form

