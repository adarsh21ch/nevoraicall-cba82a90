

## Plan: Update Google OAuth Redirect to Use app.nevorai.com

### Overview
Update the Google sign-in redirect URL to always use your custom domain `https://app.nevorai.com` instead of the current page's origin. This ensures users always land on your branded domain after Google authentication.

### What Will Change

#### File: `src/pages/Auth.tsx`

**1. Add import for PUBLISHED_APP_URL:**
```typescript
import { getPasswordRecoveryRedirectUrl, PUBLISHED_APP_URL } from '@/config/siteUrl';
```

**2. Update handleGoogleSignIn function (line 271):**
```typescript
// Before:
redirectTo: `${window.location.origin}/home`,

// After:
redirectTo: `${PUBLISHED_APP_URL}/home`,
```

This changes the redirect from dynamically using whatever domain the user is on, to always using `https://app.nevorai.com/home`.

### Current Configuration Status

| Setting | Value | Status |
|---------|-------|--------|
| Branding verification | Verified | ✅ |
| Authorized domain | nevorai.com | ✅ |
| JavaScript origin 1 | https://app.nevorai.com | ✅ |
| JavaScript origin 2 | https://nevorai.com | ✅ |
| Redirect URI | https://kisankusogixarejjphi.supabase.co/auth/v1/callback | ✅ |

### Expected Result
After this change:
1. User clicks "Continue with Google" from any domain (preview or production)
2. Google authenticates the user
3. User is redirected to `https://app.nevorai.com/home`
4. No Lovable domains visible to end users

### One Additional Check
Make sure `https://app.nevorai.com` is added as an allowed redirect URL in your backend authentication settings. You can verify this in the Lovable Cloud dashboard.

