

## Plan: OTP Email Verification for New Signups + Simplified Achievers Club Flow

### Overview

This plan implements two key improvements:

1. **4-Digit OTP Email Verification** - All new signups verify their email with a code before account creation
2. **Simpler Achievers Club Flow** - Stop pre-provisioning users, let them sign up normally, then detect and link their Achievers Club membership after signup

---

### Current Issues

| Problem | Current Experience |
|---------|-------------------|
| No email verification | Anyone can sign up with any email (no proof of ownership) |
| Achievers Club users blocked | They get "email already registered" because they were pre-provisioned with random password |
| Password reset required | Achievers Club users must reset password via email link |

### New Experience After Changes

| Scenario | New Experience |
|----------|----------------|
| Normal signup | Enter details → Receive 4-digit OTP → Enter code → Account created ✅ |
| Achievers Club user signup | Same flow as above → After signup, detect & link AC membership → Welcome message ✅ |
| Any user login | Standard email + password login (no change) |

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Auth.tsx Signup Flow                     │
├─────────────────────────────────────────────────────────────┤
│  Step 1: User enters Name, Email, Password                  │
│           ↓                                                  │
│  Step 2: Click "Sign Up" → Call send-otp edge function      │
│           ↓                                                  │
│  Step 3: Show OTP input screen (4-digit code)               │
│           ↓                                                  │
│  Step 4: User enters OTP → Call verify-otp-and-signup       │
│           ↓                                                  │
│  Step 5: OTP valid → Create Supabase auth user              │
│           ↓                                                  │
│  Step 6: Check if email exists in Achievers Club            │
│           ↓                                                  │
│  Step 7: If AC member → Link data, show welcome message     │
│           ↓                                                  │
│  Step 8: Redirect to /home ✅                                │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementation Details

#### 1. Create Database Table for OTP Storage

**Migration: Create `email_otps` table**

```sql
CREATE TABLE public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_email_otps_email ON public.email_otps(email);

-- Auto-cleanup old OTPs (optional trigger or cron)
CREATE INDEX idx_email_otps_expires ON public.email_otps(expires_at);

-- RLS: No direct access from client (edge functions use service role)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
```

#### 2. Create Edge Function: `send-otp`

**File**: `supabase/functions/send-otp/index.ts`

**Purpose**: Generate and email 4-digit OTP to user

**Logic**:
1. Validate email format
2. Rate limit: Max 3 OTPs per email per 10 minutes
3. Generate 4-digit random code
4. Store in `email_otps` table with 10-minute expiry
5. Send email via Resend with OTP
6. Return success

**Email Template**:
```html
Subject: Your NevorAI Verification Code

Your verification code is: 1234

This code expires in 10 minutes.
If you didn't request this, please ignore this email.
```

**Config**: `verify_jwt = false` (called before auth)

#### 3. Create Edge Function: `verify-otp-and-signup`

**File**: `supabase/functions/verify-otp-and-signup/index.ts`

**Purpose**: Verify OTP, create user, detect Achievers Club membership

**Logic**:
1. Validate email, otp_code, password, name
2. Check `email_otps` table:
   - OTP exists and matches
   - Not expired
   - Max 5 attempts (prevent brute force)
3. If invalid → increment attempts, return error
4. If valid → Mark OTP as verified
5. Create Supabase auth user with `supabase.auth.admin.createUser()`
6. Wait for profile trigger
7. **NEW**: Check if email exists in Achievers Club (via cross-app-auth or shared lookup)
8. If AC member → Update profile with `source_app: 'achievers_club_linked'`
9. Return success with `is_achievers_club_member` flag

**Config**: `verify_jwt = false` (called before auth)

#### 4. Update `cross-app-auth` Edge Function

**File**: `supabase/functions/cross-app-auth/index.ts`

**Changes to `provision_leader_id` action**:

**Option A (Recommended)**: Stop creating auth entries entirely
- Only store the email in a lookup table for later detection
- Don't call `supabase.auth.admin.createUser()`
- Return leader_id for Achievers Club's internal use

**Option B**: Keep provisioning but make password reset seamless
- Continue current behavior but improve Auth.tsx handling

**Recommended: Option A** - This eliminates the "email already registered" problem entirely.

**New Logic**:
```typescript
case 'provision_leader_id': {
  // Instead of creating auth user, just track the email
  // Achievers Club can look up leader_id, but user signs up fresh in NeverAI
  
  const { data: existing } = await supabase
    .from('profiles')
    .select('neverai_id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing?.neverai_id) {
    return jsonResponse({ success: true, leader_id: existing.neverai_id, is_new: false });
  }

  // Generate leader_id but DON'T create auth user
  // Store in a separate mapping table or just return for AC to track
  const newId = await supabase.rpc('generate_sequential_neverai_id');
  
  // Insert into achievers_club_pending table (new table)
  await supabase.from('achievers_club_pending').upsert({
    email: normalizedEmail,
    leader_id: newId,
    display_name,
    created_at: new Date().toISOString()
  });

  return jsonResponse({ success: true, leader_id: newId, is_new: true });
}
```

**Add new action `check_achievers_club_membership`**:
```typescript
case 'check_achievers_club_membership': {
  const { email } = requestBody;
  
  // Check if email exists in Achievers Club's records
  // This could query AC's database via their API or shared table
  
  const { data } = await supabase
    .from('achievers_club_pending')
    .select('leader_id, display_name')
    .eq('email', normalizedEmail)
    .maybeSingle();

  return jsonResponse({ 
    success: true, 
    is_member: !!data,
    leader_id: data?.leader_id 
  });
}
```

#### 5. Create Database Table: `achievers_club_pending`

**Migration**:

```sql
-- Track Achievers Club users who haven't signed up in NeverAI yet
CREATE TABLE public.achievers_club_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  leader_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ, -- Set when user signs up in NeverAI
  claimed_user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_ac_pending_email ON public.achievers_club_pending(email);

-- RLS: No direct access
ALTER TABLE public.achievers_club_pending ENABLE ROW LEVEL SECURITY;
```

#### 6. Update Auth.tsx UI

**New State Variables**:
```typescript
const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
const [pendingSignupData, setPendingSignupData] = useState<{
  email: string;
  password: string;
  name: string;
} | null>(null);
const [otpCode, setOtpCode] = useState('');
const [otpSending, setOtpSending] = useState(false);
const [otpVerifying, setOtpVerifying] = useState(false);
const [resendCooldown, setResendCooldown] = useState(0);
```

**Modified Sign Up Flow**:

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... validation ...
  
  setOtpSending(true);
  
  // Step 1: Send OTP
  const { data, error } = await supabase.functions.invoke('send-otp', {
    body: { email: emailOrLeaderId.trim().toLowerCase() }
  });
  
  if (error || !data?.success) {
    toast.error(data?.error || 'Failed to send verification code');
    setOtpSending(false);
    return;
  }
  
  // Step 2: Show OTP input
  setPendingSignupData({
    email: emailOrLeaderId.trim().toLowerCase(),
    password,
    name
  });
  setSignupStep('otp');
  setResendCooldown(60); // 60 second cooldown
  toast.success('Verification code sent to your email!');
  setOtpSending(false);
};

const handleVerifyOtp = async () => {
  if (otpCode.length !== 4) {
    toast.error('Please enter the 4-digit code');
    return;
  }
  
  setOtpVerifying(true);
  
  const { data, error } = await supabase.functions.invoke('verify-otp-and-signup', {
    body: {
      email: pendingSignupData.email,
      otp_code: otpCode,
      password: pendingSignupData.password,
      name: pendingSignupData.name
    }
  });
  
  if (error || !data?.success) {
    toast.error(data?.error || 'Invalid verification code');
    setOtpVerifying(false);
    return;
  }
  
  // Account created!
  if (data.is_achievers_club_member) {
    toast.success('Welcome! Your Achievers Club account has been linked!', { duration: 5000 });
  } else {
    toast.success('Account created successfully!');
  }
  
  // Auto sign in
  await signIn(pendingSignupData.email, pendingSignupData.password);
  navigate('/home');
};
```

**New OTP Input UI**:

```tsx
{signupStep === 'otp' && (
  <div className="space-y-6">
    <button onClick={() => setSignupStep('form')} className="...">
      <ArrowLeft /> Back
    </button>
    
    <div className="text-center">
      <h2>Verify Your Email</h2>
      <p>We sent a 4-digit code to {pendingSignupData?.email}</p>
    </div>
    
    <div className="flex justify-center">
      <InputOTP maxLength={4} value={otpCode} onChange={setOtpCode}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    </div>
    
    <Button onClick={handleVerifyOtp} disabled={otpVerifying}>
      {otpVerifying ? 'Verifying...' : 'Verify & Create Account'}
    </Button>
    
    <button onClick={handleResendOtp} disabled={resendCooldown > 0}>
      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
    </button>
  </div>
)}
```

---

### Security Features

| Feature | Implementation |
|---------|---------------|
| Rate limiting | Max 3 OTPs per email per 10 minutes |
| Brute force protection | Max 5 verification attempts per OTP |
| OTP expiry | 10-minute validity window |
| Secure storage | OTPs stored server-side only, never sent to client |
| No client access | `email_otps` table has strict RLS (no policies = no access) |
| Resend cooldown | 60-second cooldown in UI |

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-otp/index.ts` | Generate and email OTP |
| `supabase/functions/verify-otp-and-signup/index.ts` | Verify OTP and create account |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add config for new edge functions |
| `src/pages/Auth.tsx` | Add OTP verification step UI |
| `supabase/functions/cross-app-auth/index.ts` | Modify provisioning to not create auth entries |

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `email_otps` table | Store OTP codes with expiry |
| `achievers_club_pending` table | Track AC users pending NeverAI signup |

---

### User Experience Summary

#### New User (Fresh Signup)
1. Enter name, email, password
2. Click "Sign Up"
3. Receive 4-digit code in email
4. Enter code on verification screen
5. Account created, auto-logged in ✅

#### Achievers Club User (First Time in NeverAI)
1. Enter name, email (same as AC), password (any new password)
2. Click "Sign Up"
3. Receive 4-digit code in email
4. Enter code on verification screen
5. Account created + AC membership detected
6. See: "Welcome! Your Achievers Club account has been linked!"
7. Profile shows AC membership, leader_id preserved ✅

#### Existing NeverAI User
1. Standard sign-in (no change)

---

### Migration Strategy for Existing Provisioned Users

For users already provisioned (with random passwords), we have two options:

**Option A: Keep current password reset flow**
- Existing provisioned users continue using password reset
- Only new AC users go through OTP flow

**Option B: Clean up provisioned users** (Recommended)
- Delete auth entries for provisioned users who never logged in
- Move their data to `achievers_club_pending` table
- They sign up fresh next time

---

### Benefits

| Before | After |
|--------|-------|
| ❌ No email verification | ✅ OTP proves email ownership |
| ❌ AC users blocked by "already registered" | ✅ AC users sign up normally |
| ❌ AC users need password reset email | ✅ AC users set password during signup |
| ❌ Complex provisioning logic | ✅ Simple: everyone signs up the same way |
| ❌ Confusing error messages | ✅ Clear, helpful UX |

