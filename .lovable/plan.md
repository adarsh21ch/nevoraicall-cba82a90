

# Fix TrackUp Dashboard Button — Not Opening

## Problem

Two issues prevent the button from working:

1. **Browser popup blocker**: The code calls `window.open()` after multiple `await` calls (session check, then edge function call). Browsers block `window.open` when it's not triggered by a direct, synchronous user gesture. This is why nothing happens — the popup is silently blocked.

2. **Wrong redirect URL**: The generated magic link redirects to `https://nevorai.lovable.app` instead of `https://nevorai.com/trackup`. The Supabase auth Site URL configuration is overriding the `redirectTo` parameter specified in the edge function.

## Fix

### 1. `src/pages/Profile.tsx` — Fix popup blocker

Open a blank window **before** the async calls, then set its URL after the SSO link is generated:

```typescript
const handleOpenTrackUp = async () => {
  setSsoLoading(true);
  // Open window IMMEDIATELY on user click (before any await)
  const newWindow = window.open('about:blank', '_blank');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      newWindow?.close();
      toast.error('Please log in first');
      navigate('/auth');
      return;
    }
    const { data, error } = await supabase.functions.invoke('trackup-sso-link');
    if (data?.action_link) {
      if (newWindow) {
        newWindow.location.href = data.action_link;
      } else {
        window.location.href = data.action_link;
      }
    } else {
      // Fallback
      if (newWindow) {
        newWindow.location.href = 'https://nevorai.com/auth?redirect=/trackup';
      }
    }
  } catch (err) {
    if (newWindow) {
      newWindow.location.href = 'https://nevorai.com/auth?redirect=/trackup';
    }
  } finally {
    setSsoLoading(false);
  }
};
```

This pattern opens the window synchronously (allowed by browsers), then navigates it once the link is ready.

### 2. `src/pages/Tracking.tsx` — Apply same fix

The Tracking page has the same SSO button with the same popup blocker issue. Apply the identical `window.open('about:blank')` pattern there.

### 3. Redirect URL issue (informational)

The redirect URL (`nevorai.com/trackup`) must be added to the **Redirect URLs** list in the Supabase Auth configuration for the external Supabase instance. Without it, Supabase falls back to the Site URL. This is a backend configuration change on the external instance — not something that can be fixed in code alone.

## Files to Edit
- `src/pages/Profile.tsx` — Fix popup blocker in `handleOpenTrackUp`
- `src/pages/Tracking.tsx` — Fix popup blocker in equivalent SSO handler

