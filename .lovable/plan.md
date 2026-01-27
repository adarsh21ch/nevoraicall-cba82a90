

## Plan: Fix Auth Page Scrolling + Tabbed Login UI

### Overview
This plan addresses the mobile scrolling issues on the auth page and implements a cleaner tabbed UI with "Login" and "Create your account" tabs. Since TrackUp is a separate website, those changes will need to be made in the TrackUp codebase separately.

### Scope (This Project Only)
- Fix mobile scrolling issue on auth page
- Implement tabbed Login/Create Account UI
- Google OAuth already works - no changes needed

### Changes Required

---

### 1. Fix Mobile Scrolling in `src/index.css`

**Problem**: The global CSS has `body { overflow: hidden; }` which prevents the auth page from scrolling on mobile.

**Solution**: Add a specific class for auth pages that overrides this behavior.

```css
/* Add to src/index.css */

/* Auth page layout - allows scrolling on standalone pages */
.auth-page-layout {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

### 2. Update `src/pages/Auth.tsx` - Tabbed UI

**Current**: Uses `isSignUp` state to toggle between forms with text links at the bottom.

**New Design**:
- Add tabs at the top: "Login" (default) | "Create your account"
- Tab switching updates the form below
- Both tabs show email/password fields + Google Sign-In button
- Dynamic heading based on selected tab
- Scrollable container wrapper for mobile

**Key Changes**:
1. Import `Tabs` component from `@/components/ui/tabs`
2. Wrap main return in scrollable auth container class
3. Replace the toggle link with proper tabs at top of card
4. Default to Login tab (`isSignUp: false`)
5. Update heading text dynamically

**Structure**:
```tsx
<div className="auth-page-layout bg-background p-4">
  <div className="min-h-screen flex items-center justify-center py-8">
    <div className="w-full max-w-md bg-card rounded-2xl ...">
      {/* Logo header */}
      
      {/* Tabs */}
      <Tabs defaultValue="login" onValueChange={(v) => setIsSignUp(v === 'signup')}>
        <TabsList className="w-full">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Create your account</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Dynamic heading */}
      <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
      
      {/* Form content */}
      {/* Google button */}
      {/* Footer links */}
    </div>
  </div>
</div>
```

---

### 3. Update OTP and Forgot Password Views

Apply the same scrollable container to:
- OTP verification view (lines 357-434)
- Forgot password view (lines 299-353)

Wrap each in `<div className="auth-page-layout bg-background p-4">` instead of `min-h-screen flex items-center justify-center`.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Add `.auth-page-layout` class for scrollable standalone pages |
| `src/pages/Auth.tsx` | Import Tabs, default to login, implement tabbed UI, add scrollable wrapper |

---

### Technical Details

**Tabs Implementation**:
```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Default isSignUp to false (Login first)
const [isSignUp, setIsSignUp] = useState(false);

// In JSX:
<Tabs 
  defaultValue="login" 
  value={isSignUp ? 'signup' : 'login'}
  onValueChange={(v) => setIsSignUp(v === 'signup')}
>
  <TabsList className="grid w-full grid-cols-2 mb-6">
    <TabsTrigger value="login">Login</TabsTrigger>
    <TabsTrigger value="signup">Create your account</TabsTrigger>
  </TabsList>
</Tabs>
```

**Mobile Scroll Fix**:
The key issue is `body { overflow: hidden; }` in index.css line 151. The auth-page-layout class provides explicit overflow-y: auto to override this on auth-related pages without affecting the main app layout which needs fixed header/nav behavior.

---

### What This Achieves

1. Mobile users can scroll the auth page naturally
2. Clear visual distinction between Login and Create Account with tabs
3. Login is the default active tab (most common action)
4. Form fields and Google button remain accessible in both tabs
5. Consistent with the app's existing UI patterns using shadcn/ui Tabs

---

### Out of Scope (Requires TrackUp Codebase)

The following items need to be implemented in the TrackUp website codebase:
- Adding Google Sign-In to TrackUp dashboard
- Password reset flow for TrackUp
- Redirect URL configuration for TrackUp domain

