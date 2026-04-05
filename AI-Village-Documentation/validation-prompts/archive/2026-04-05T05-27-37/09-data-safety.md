# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 75.3s
> **Files:** frontend/src/pages/HomePage/components/HomePage.V4.tsx
> **Generated:** 4/4/2026, 10:27:37 PM

---

# DATA SAFETY AUDIT REPORT — SwanStudios HomePage.V4.tsx

**Auditor:** Data Safety Auditor | **Platform:** SwanStudios (sswanstudios.com)
**File:** `frontend/src/pages/HomePage/components/HomePage.V4.tsx`
**Audit Date:** Current | **Classification:** FRONTEND UI COMPONENT

---

## EXECUTIVE SUMMARY

This file is a **pure frontend React/TypeScript UI component** — a homepage display layer with no direct database operations, no API mutation calls, no authentication logic, and no data persistence code. It contains zero SQL, zero Sequelize operations, zero fetch/axios calls that write data, and zero destructive operations.

**However, this does not mean it is risk-free.** Several findings below represent real threats to user data safety, session integrity, and production stability that must be addressed before they cause incidents.

---

## CRITICAL FINDINGS

### FINDING C-001
**Severity:** CRITICAL
**Data at Risk:** All authenticated user sessions — any logged-in user who clicks these buttons
**Blast Radius:** Every active user on the platform
**File & Line:** Lines ~620–680 (QuickNavRow CapsuleButton block)

**What's Wrong:**

```tsx
<CapsuleButton
  $variant="wingPurple"
  onClick={() => navigate('/dashboard/trainer/overview')}
>
  <LayoutDashboard size={14} />
  Trainer Dashboard
</CapsuleButton>

<CapsuleButton
  $variant="gilded"
  onClick={() => navigate('/signup?role=trainer')}
>
  <Award size={14} />
  Become a Trainer
</CapsuleButton>
```

The Trainer Dashboard navigation button is **publicly visible and clickable on the homepage with zero authentication gate at the UI layer**. If the backend route `/dashboard/trainer/overview` has any misconfigured middleware (a single missing `requireRole('trainer')` guard), a malicious user clicking this button could access trainer-level data including **other clients' workout histories, session notes, payment records, and personal health information**.

This is a defense-in-depth failure. The homepage is actively advertising and providing one-click navigation to privileged routes to unauthenticated visitors.

**Fix:**

```tsx
// 1. Create an authenticated navigation hook
const useAuthNavigate = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth(); // your auth context
  
  return (path: string, requiredRole?: string) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    if (requiredRole && user?.role !== requiredRole) {
      navigate('/unauthorized');
      return;
    }
    navigate(path);
  };
};

// 2. Replace the trainer dashboard button
const authNavigate = useAuthNavigate();

// Only render trainer-specific buttons if user has trainer role
{user?.role === 'trainer' && (
  <CapsuleButton
    $variant="wingPurple"
    onClick={() => authNavigate('/dashboard/trainer/overview', 'trainer')}
  >
    <LayoutDashboard size={14} />
    Trainer Dashboard
  </CapsuleButton>
)}

// 3. The client dashboard should also be gated
{isAuthenticated && (
  <CapsuleButton
    $variant="arcticCyan"
    onClick={() => authNavigate('/dashboard/client/overview')}
  >
    <UserCircle size={14} />
    Client Dashboard
  </CapsuleButton>
)}
```

---

### FINDING C-002
**Severity:** CRITICAL
**Data at Risk:** User PII — email addresses, names, health data — exposed in client-side error boundaries
**Blast Radius:** Any user whose session throws a React error while on this page
**File & Line:** Entire component — no error boundary present

**What's Wrong:**

This component has **no React Error Boundary**. The component renders user-facing navigation to authenticated routes (`/user-dashboard`, `/dashboard/client/overview`, `/dashboard/trainer/overview`). If any child component throws — including `TypewriterText`, `GlowButton`, `OrientationForm`, or `useAuth` context — React will unmount the entire tree and potentially expose a raw stack trace in development mode that leaks to production if error reporting is misconfigured.

More critically: `OrientationForm` is conditionally rendered via `showOrientation` state. If that form component crashes mid-submission (network timeout, validation error), **partially submitted user data (name, email, health goals, phone number) could be left in an inconsistent state** with no recovery path shown to the user.

```tsx
// Current — no protection:
const HomePageV4: React.FC = () => {
  // ... 800+ lines with no error boundary
  return (
    <>
      {showOrientation && <OrientationForm />} {/* Can crash silently */}
    </>
  );
};
```

**Fix:**

```tsx
// Create a dedicated error boundary for the orientation form
class OrientationFormErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorId: string }
> {
  state = { hasError: false, errorId: '' };

  static getDerivedStateFromError() {
    return { 
      hasError: true, 
      errorId: `ERR-${Date.now()}` // For support reference, NO PII
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to your error service — NEVER log user PII
    errorReportingService.capture(error, {
      component: 'OrientationForm',
      // Do NOT include: user email, name, form field values
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert">
          <p>Something went wrong. Your information was not submitted.</p>
          <p>Reference: {this.state.errorId}</p>
          <button onClick={() => this.setState({ hasError: false, errorId: '' })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap the form:
{showOrientation && (
  <OrientationFormErrorBoundary>
    <OrientationForm onClose={() => setShowOrientation(false)} />
  </OrientationFormErrorBoundary>
)}
```

---

## HIGH SEVERITY FINDINGS

### FINDING H-001
**Severity:** HIGH
**Data at Risk:** User session tokens, authentication state
**Blast Radius:** All users on mobile devices or slow connections
**File & Line:** Lines ~580–600 (VideoEl component)

**What's Wrong:**

```tsx
<VideoEl
  autoPlay
  muted
  loop
  playsInline
  disablePictureInPicture
  aria-hidden="true"
  poster="/images/parallax/hero-swan-bg.png"
  preload="metadata"
  initial={prefersReduced ? { opacity: 0.5 } : { scale: 1.1, opacity: 0 }}
  animate={prefersReduced ? { opacity: 0.5 } : { scale: 1, opacity: 0.5 }}
  transition={{ duration: 2, ease: 'easeOut' }}
  style={prefersReduced ? undefined : { scale: heroVideoScale }}
>
  <source src={VIDEO.swans} type="video/mp4" />
```

The video asset loads from `VIDEO.swans` (imported from `videoAssets` config). There is **no fallback source, no error handler, and no loading state**. On mobile with Data Saver mode or corporate firewalls that block video, this component will silently fail. More critically: if `VIDEO.swans` resolves to an incorrect path after a deployment (CDN misconfiguration, missing asset), the `<video>` element will throw a `MediaError` that is **completely unhandled**.

The real data risk: if this error causes a React hydration mismatch in SSR mode, it can **corrupt the client-side React tree**, potentially causing auth context to re-initialize and **silently log users out** by clearing their session state.

**Fix:**

```tsx
const [videoError, setVideoError] = useState(false);
const [videoLoaded, setVideoLoaded] = useState(false);

// In JSX:
{!videoError ? (
  <VideoEl
    autoPlay
    muted
    loop
    playsInline
    disablePictureInPicture
    aria-hidden="true"
    poster="/images/parallax/hero-swan-bg.png"
    preload="metadata"
    onError={() => {
      setVideoError(true);
      // Log to monitoring — NOT to console (no PII in URL params)
      console.warn('[SwanStudios] Hero video failed to load — falling back to static image');
    }}
    onLoadedData={() => setVideoLoaded(true)}
    initial={prefersReduced ? { opacity: 0.5 } : { scale: 1.1, opacity: 0 }}
    animate={
      prefersReduced 
        ? { opacity: 0.5 } 
        : { scale: 1, opacity: videoLoaded ? 0.5 : 0 }
    }
    transition={{ duration: 2, ease: 'easeOut' }}
    style={prefersReduced ? undefined : { scale: heroVideoScale }}
  >
    <source src={VIDEO.swans} type="video/mp4" />
    {/* Provide WebM fallback for broader compatibility */}
    <source src={VIDEO.swansWebm} type="video/webm" />
  </VideoEl>
) : (
  // Static fallback — no broken state
  <HeroParallaxImg
    style={{ opacity: 0.5 }}
    aria-hidden="true"
  />
)}
```

---

### FINDING H-002
**Severity:** HIGH
**Data at Risk:** User navigation state, potential session token exposure in URL
**Blast Radius:** All users who click "Become a Trainer" or trainer signup flow
**File & Line:** Lines ~665–675

**What's Wrong:**

```tsx
<CapsuleButton
  $variant="gilded"
  onClick={() => navigate('/signup?role=trainer')}
>
  <Award size={14} />
  Become a Trainer
</CapsuleButton>
```

The `role=trainer` parameter is passed as a **plain URL query string**. If your signup backend reads `req.query.role` and uses it to set the user's role during account creation without server-side validation, a malicious user could manipulate this to `role=admin` and potentially escalate privileges during registration.

This is a frontend component, but it is **directly constructing the URL that feeds your backend registration endpoint**. The homepage is the attack surface.

**Fix:**

```tsx
// Option 1: Use a route-based approach instead of query params for role
onClick={() => navigate('/signup/trainer')}

// Option 2: If query params are required, document the backend MUST validate
// Add a comment that is enforced in code review:
onClick={() => navigate('/signup?role=trainer')}
// SECURITY NOTE: Backend /api/auth/register MUST validate that 'trainer' role
// requires admin approval — never trust client-supplied role values.
// See: backend/routes/auth.js requireAdminApproval middleware

// Option 3: Use a signed token approach
const handleTrainerSignup = async () => {
  // Get a short-lived signed intent token from backend
  // This prevents role parameter tampering
  const { data } = await api.post('/auth/signup-intent', { 
    type: 'trainer_application' 
  });
  navigate(`/signup?intent=${data.token}`);
};
```

---

### FINDING H-003
**Severity:** HIGH
**Data at Risk:** Orientation form submission data — user name, email, health goals, contact info
**Blast Radius:** Any user who submits the orientation form
**File & Line:** Lines ~540–545 (OrientationForm modal trigger)

**What's Wrong:**

```tsx
const [showOrientation, setShowOrientation] = useState(false);
// ...
{showOrientation && <OrientationForm />}
```

The `OrientationForm` is mounted/unmounted via boolean state with **no confirmation on close, no submission state preservation, and no duplicate submission prevention** visible at this layer. If a user:

1. Fills out the orientation form (name, email, health history, goals)
2. Accidentally clicks outside the modal
3. The form unmounts immediately

Their data is **silently lost**. Worse: if they submitted and the network request is in-flight when the component unmounts, React will attempt to call `setState` on an unmounted component, potentially causing the submission to complete server-side but the user sees no confirmation — leading them to submit **multiple times**, creating duplicate user records or duplicate orientation requests in your database.

**Fix:**

```tsx
const [showOrientation, setShowOrientation] = useState(false);
const [orientationSubmitted, setOrientationSubmitted] = useState(false);
const [orientationSubmitting, setOrientationSubmitting] = useState(false);

const handleCloseOrientation = () => {
  if (orientationSubmitting) {
    // NEVER close while a submission is in flight
    return;
  }
  if (!orientationSubmitted) {
    // Warn user they'll lose their data
    const confirmed = window.confirm(
      'Are you sure? Your information will not be saved.'
    );
    if (!confirmed) return;
  }
  setShowOrientation(false);
};

// Pass submission state handlers down:
{showOrientation && (
  <OrientationFormErrorBoundary>
    <OrientationForm
      onClose={handleCloseOrientation}
      onSubmitStart={() => setOrientationSubmitting(true)}
      onSubmitSuccess={() => {
        setOrientationSubmitting(false);
        setOrientationSubmitted(true);
      }}
      onSubmitError={() => setOrientationSubmitting(false)}
    />
  </OrientationFormErrorBoundary>
)}
```

---

## MEDIUM SEVERITY FINDINGS

### FINDING M-001
**Severity:** MEDIUM
**Data at Risk:** User PII — testimonial data, stat data hardcoded in component
**Blast Radius:** All visitors to the homepage
**File & Line:** Lines ~820–870 (TESTIMONIALS constant)

**What's Wrong:**

```tsx
const TESTIMONIALS = [
  {
    quote: "Thanks to SwanStudios personal training...",
    author: 'Sarah J.',
    descriptor: 'Corporate Executive',
    result: 'Lost 42 lbs in 7 months',
  },
  {
    author: 'Officer Martinez',
    descriptor: 'Law Enforcement',
    result: 'Run improved by 2:30',
  },
```

Testimonial data including **partial names, professional roles, and specific health/body metrics** (weight loss amounts, physical performance data) are **hardcoded in the frontend bundle**. This data:

1. Is shipped to every visitor in the JavaScript bundle — no access control
2. Cannot be removed without a full redeployment if a client requests their data be deleted (GDPR/CCPA right to erasure)
3. The combination of `'Officer Martinez'` + `'Law Enforcement'` + specific performance metrics could be enough to identify a real person

**Fix:**

```tsx
// Move testimonials to a CMS or API endpoint with proper data governance
// frontend/src/pages/HomePage/components/HomePage.V4.tsx

const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

useEffect(() => {
  // Fetch from API — allows removal without redeployment
  api.get('/api/public/testimonials')
    .then(res => setTestimonials(res.data))
    .catch(() => setTestimonials(FALLBACK_TESTIMONIALS)); // Generic fallbacks only
}, []);

// FALLBACK_TESTIMONIALS should use only first names and no identifying details:
const FALLBACK_TESTIMONIALS = [
  {
    quote: "Incredible transformation...",
    author: 'Sarah',
    descriptor: 'Client',
    result: 'Significant weight loss',
  },
];
```

---

### FINDING M-002
**Severity:** MEDIUM
**Data at Risk:** User navigation — broken routes could prevent access to purchase history, session data
**Blast Radius:** All users who click quick-nav buttons
**File & Line:** Lines ~620–680 (all CapsuleButton onClick handlers)

**

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
