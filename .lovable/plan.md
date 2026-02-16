

## Fix: OTP Verification Failing for Existing Users

### Root Cause

The `verify-otp-and-signup` edge function uses `supabase.auth.admin.listUsers()` (line 97) to check if a user already exists. This call **only returns the first 50 users by default**. Since your app has grown past 50 users, existing users like `achieversclubapp@gmail.com` are not found in that first page.

The flow then incorrectly tries to create a new user, which fails with `"email_exists"` -- surfacing as "Verification failed" to the user.

### Fix

Replace the `listUsers()` approach with a **direct email lookup** using `getUserByEmail()` from the Supabase Admin API -- this is both faster and reliable regardless of user count.

### Changes

**File: `supabase/functions/verify-otp-and-signup/index.ts`**

Replace this block (around line 96-98):
```ts
// OLD - breaks when you have more than 50 users
const { data: existingUsers } = await supabase.auth.admin.listUsers();
const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
```

With:
```ts
// NEW - direct lookup, works at any scale
const { data: existingUserData } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
const existingUser = existingUserData?.user ?? null;
```

No other files need to change. The rest of the logic (granting Nevorai access vs creating a new user) remains the same.

