

# Diagnosis Complete: The App IS Working Right Now

## What I Found

After thorough investigation with live debugging tools:

1. **Auth service is healthy** -- it responded correctly at 00:33:03Z with "Invalid login credentials" (meaning it processed the request, the password was just wrong)
2. **Database is healthy** -- 6,573 profiles exist, queries execute instantly
3. **The login form loads correctly** -- browser logs show `INITIAL_SESSION` event fired, `loading` set to `false`, login form rendered with input fields
4. **The `get_app_config` RPC intermittently fails** with "Load failed" (browser network error), but this already falls back to `SAFE_DEFAULTS` and does NOT block login

## The Real Problem

The issue is **intermittent network failures** between the browser and the backend. Sometimes requests fail with "Load failed" (a browser-level network error, not a server error). When this happens to the `getSession()` call inside `AuthContext`, the app gets stuck on the loading spinner until the 10-second safety timeout kicks in.

This is NOT a permanent outage -- the backend is responding right now. But when it intermittently drops, the app has no recovery mechanism beyond the 10s timeout.

## What Needs to Change

### 1. `src/lib/fetchWithTimeout.ts` (NEW)
Create a reusable timeout utility that wraps any Promise with a deadline. Used across auth and API calls.

### 2. `src/contexts/AuthContext.tsx`
- Wrap `signIn()` and `signUp()` with 15-second timeouts so they never hang forever
- On timeout, return a clear error message instead of hanging indefinitely
- This ensures the "Signing in..." button always recovers

### 3. `src/pages/Auth.tsx`
- Add a `finally` block to `handleSignIn` to guarantee `isSubmitting` is always reset (prevents stuck button)
- Catch timeout errors and show a user-friendly toast: "Connection slow, please try again"

### 4. `src/hooks/usePlaybackUrl.ts`
- Add `AbortSignal.timeout(15000)` to the edge function fetch call
- Prevents video loading from hanging forever

### 5. `src/components/funnels/ControlledVideoPlayer.tsx`
- Add a "Tap to retry" button when video URL fetch fails
- Show "Still loading..." after 5 seconds

## Why This Fixes It

The backend works fine most of the time. The problem is that when a single request fails or hangs (intermittent network issue), the UI gets stuck with no way to recover. These changes ensure:
- Login button never stays stuck on "Signing in..." (15s timeout + finally block)
- Video player shows retry option instead of infinite spinner
- All API calls have a maximum wait time
- Users always get a clear error message and can retry

## Important Note About Other Projects

Since the website and Achievers Club are separate Lovable projects sharing the same backend, the same timeout protection should be applied there too. After implementing here, I can provide you the exact prompt to paste in those projects.

