# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 135.6s
> **Files:** docs/PLAYWRIGHT-QA-FINDINGS-FULL-SITE.md, docs/NOTIFICATION-FULL-SITE-UPGRADE-MASTER-PROMPT.md
> **Generated:** 3/13/2026, 10:53:51 PM

---

# SwanStudios Deep Architecture Review & Bug Hunt

## Executive Summary

This review synthesizes findings from the Playwright QA report and Notification Master Prompt to identify **8 CRITICAL bugs**, **6 HIGH bugs**, **12+ MEDIUM issues**, and significant architectural debt. The codebase has substantial infrastructure (notification models, Socket.IO, API routes) that is **not wired together**, creating a platform that appears feature-complete but fails in critical user-facing ways.

---

## 1. BUG DETECTION

### CRITICAL Bugs (P0 — Fix Immediately)

#### 1.1 Contact Page — Empty Content Below Hero
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/pages/Contact.tsx` (or equivalent)
- **What's Wrong:** The `<main>` element below the hero section is completely empty. The contact form does not render at all — users see a dark void. This is likely a lazy-load failure or missing component import.
- **Fix:**
```tsx
// Check for lazy loading issue - ensure ContactForm is imported correctly
import ContactForm from '../components/Contact/ContactForm';

// Ensure it's rendered in the return JSX
<main>
  <HeroSection />
  <ContactForm />  // ← This must be present
</main>
```

#### 1.2 Waiver Page — Empty Content Below Hero
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/pages/Waiver.tsx`
- **What's Wrong:** Identical root cause to Contact page — waiver form component not rendering below hero. New clients cannot sign waivers before sessions, creating legal/liability risk.
- **Fix:** Verify WaiverForm component is imported and rendered:
```tsx
import WaiverForm from '../components/Waiver/WaiverForm';

<main>
  <HeroSection />
  <WaiverForm />  // ← Must be present
</main>
```

#### 1.3 Client Dashboard — Retired Galaxy-Swan Theme
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/pages/ClientDashboard.tsx` + theme configuration files
- **What's Wrong:** The entire client dashboard uses the retired Galaxy-Swan theme (`#0a0a1a` background, cosmic purple gradients, "Galaxy" text). This violates the active Crystalline Swan palette directive.
- **Fix:** Replace theme configuration in ClientDashboard:
```tsx
// BEFORE (Galaxy-Swan - WRONG)
const theme = {
  colors: {
    background: '#0a0a1a',
    primary: '#7851A9',
    accent: '#00FFFF',
  }
};

// AFTER (Crystalline Swan - CORRECT)
const theme = {
  colors: {
    background: '#002060',      // Midnight Sapphire
    surface: '#003080',         // Royal Depth
    accent: '#60C0F0',          // Ice Wing
    secondary: '#50A0F0',       // Arctic Cyan
    luxury: '#C6A84B',          // Gilded Fern
    tertiary: '#4070C0',        // Swan Lavender
    glow: '#8B5CF6',            // Wing Purple
    text: '#E0ECF4',            // Frost White
  }
};
```

#### 1.4 Analytics Page — Raw Unrounded Float Values
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/AnalyticsWidgets.tsx` (estimated)
- **What's Wrong:** All percentage values display raw JavaScript floats: `22.703744974779248%`, `7.753933517474638/10`. This is extremely unprofessional.
- **Fix:**
```tsx
// Apply toFixed(1) or Math.round() to all percentage displays
const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
const formatScore = (value: number) => `${value.toFixed(1)}/10`;

// In JSX:
<span>{formatPercentage(data.totalUsersTrend)}</span>
<span>{formatScore(data.engagementScore)}</span>
```

#### 1.5 Analytics — Fake "Live User Activity" Data
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/LiveUserActivity.tsx`
- **What's Wrong:** "Live User Activity" shows hardcoded mock users (Alex P., David K., Jessica L., Rachel T.) with fake actions. This destroys trust in analytics.
- **Fix:** Either connect to real visitor tracking or hide the widget:
```tsx
// Option 1: Connect to real API
useEffect(() => {
  const fetchLiveUsers = async () => {
    const response = await fetch('/api/analytics/live-users');
    const data = await response.json();
    setLiveUsers(data);
  };
  fetchLiveUsers();
  const interval = setInterval(fetchLiveUsers, 30000);
  return () => clearInterval(interval);
}, []);

// Option 2: Hide until real data exists
if (!liveUsers || liveUsers.length === 0) {
  return null; // Don't show fake data
}
```

#### 1.6 System Health — Raw Float Uptime / Incorrect Calculation
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/SystemHealthWidget.tsx`
- **Issue:** Database uptime shows `1.88%` instead of ~99.9%. The calculation is computing uptime since last deploy instead of actual server availability.
- **Fix:**
```tsx
// BEFORE (WRONG - calculates time since last deploy)
const uptime = (now - lastDeployTime) / (now - serverStartTime) * 100;

// AFTER (CORRECT - actual availability)
const calculateUptime = (uptimeSeconds: number, totalSeconds: number) => {
  if (totalSeconds === 0) return 100;
  return ((totalSeconds - uptimeSeconds) / totalSeconds) * 100;
};

// Or fetch from actual monitoring API
const { data } = await fetch('/api/system/uptime').then(r => r.json());
return `${data.uptimePercentage.toFixed(2)}%`;
```

#### 1.7 Notification Bell — Hardcoded / Not Wired
- **Severity:** CRITICAL
- **File & Line:** `frontend/src/components/Header/Header.tsx`
- **What's Wrong:** Notification bell exists in header but shows hardcoded count (was `3`, fixed to `0`). Not connected to `GET /api/notifications/count` endpoint.
- **Fix:**
```tsx
import { useNotifications } from '../../hooks/useNotifications';

const Header = () => {
  const { unreadCount, isLoading } = useNotifications();
  
  return (
    <HeaderContainer>
      {/* Other header items */}
      <NotificationBell>
        {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      </NotificationBell>
    </HeaderContainer>
  );
};
```

#### 1.8 Canada Immigration — 4 API Errors
- **Severity:** CRITICAL
- **File & Line:** `backend/routes/immigrationRoutes.mjs` + frontend component
- **What's Wrong:** All 4 API routes return server errors:
  - `GET /api/immigration/seed`
  - `GET /api/immigration/study-sessions`
  - `GET /api/immigration/tasks`
  - `GET /api/immigration/documents`
- **Fix:** Check backend route handlers:
```mjs
// backend/routes/immigrationRoutes.mjs
router.get('/seed', async (req, res) => {
  try {
    // Check for missing await, syntax errors, model issues
    const sessions = await ImmigrationSession.findAll();  // Ensure model exists
    res.json(sessions);
  } catch (error) {
    console.error('Immigration seed error:', error);  // Add logging
    res.status(500).json({ error: 'Failed to load study sessions' });
  }
});
```

---

### HIGH Bugs (P1 — Fix Before Deploy)

#### 1.9 Dashboard Overview — System Health Shows 1.88%
- **Severity:** HIGH
- **File & Line:** Same as 1.6 — uptime calculation bug
- **What's Wrong:** Duplicate of issue #6
- **Fix:** See 1.6

#### 1.10 Social Hub — Notifications Button Disabled
- **Severity:** HIGH
- **File & Line:** `frontend/src/pages/SocialHub.tsx`
- **What's Wrong:** The "Notifications" button in Social Hub sidebar is disabled (grayed out, not clickable).
- **Fix:**
```tsx
// BEFORE (disabled)
<SidebarButton disabled>Notifications</SidebarButton>

// AFTER (enabled - wire to notification panel)
<SidebarButton onClick={() => setShowNotifications(true)}>
  Notifications
</SidebarButton>
```

#### 1.11 Video Library Hero — "GALAXY FITNESS" Branding
- **Severity:** HIGH
- **File & Line:** `frontend/src/pages/VideoLibrary.tsx` — hero background image
- **What's Wrong:** Hero background image shows "GALAXY FITNESS" text from retired theme.
- **Fix:** Replace hero image asset with Crystalline Swan branded version:
```tsx
// Find and replace the background image
<HeroSection 
  backgroundImage="/assets/hero/video-library-crystalline.jpg"
  alt="SwanStudios Video Library - Elite Training Videos"
/>
```

#### 1.12 About Page — "By The Numbers" Counters Show 0
- **Severity:** HIGH
- **File & Line:** `frontend/src/components/About/NumberCounters.tsx`
- **What's Wrong:** Intersection Observer for counter animation doesn't fire in some contexts. All counters show 0.
- **Fix:**
```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Start animation
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);  // Only trigger once
        }
      });
    },
    { threshold: 0.5 }  // Increase threshold to ensure visibility
  );

  const counters = document.querySelectorAll('.counter');
  counters.forEach((counter) => observer.observe(counter));

  return () => observer.disconnect();
}, []);
```

#### 1.13 Checkout Page — Payment Section Empty
- **Severity:** HIGH
- **File & Line:** `frontend/src/pages/Checkout.tsx`
- **What's Wrong:** Customer Information and Order Summary render, but payment method area is empty. No Stripe form renders.
- **Fix:** Ensure Stripe Elements is properly initialized:
```tsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const Checkout = () => {
  const { clientSecret } = useClientSecret(); // Fetch from backend
  
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm />
    </Elements>
  );
};
```

#### 1.14 Business Intelligence — 100% Churn Rate
- **Severity:** HIGH
- **File & Line:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/BusinessIntelligence.tsx`
- **What's Wrong:** Shows "Churn Rate: 100.0%" due to small sample size (2 active clients + test accounts).
- **Fix:**
```tsx
const calculateChurnRate = (churned: number, total: number) => {
  if (total < 5) return 'N/A';  // Guard for small samples
  return ((churned / total) * 100).toFixed(1) + '%';
};

// Display
<span>{totalClients < 5 ? 'Insufficient data' : `${churnRate}%`}</span>
```

---

### MEDIUM Issues (P2 — Fix This Sprint)

#### 1.15 Dark Content Below Heroes
- **Severity:** MEDIUM
- **File & Line:** Multiple page files — contrast issue
- **What's Wrong:** Content below hero sections has very low contrast, potentially invisible on low-brightness screens.
- **Fix:** Add gradient overlay or increase content section background:
```css
/* In styled-components */
export const ContentSection = styled.section`
  background: linear-gradient(180deg, 
    rgba(0, 32, 96, 0.8) 0%, 
    rgba(0, 48, 128, 1) 100%
  );
  min-height: 400px;
`;
```

#### 1.16 Homepage Title Inconsistency
- **Severity:** MEDIUM
- **File & Line:** `frontend/src/pages/Homepage.tsx` — document title
- **What's Wrong:** Title is "SwanStudios | Elite Performance Training — Where Human Excellence Meets AI Precision" — too long and mentions "AI Precision" which confuses personal training clients.
- **Fix:**
```tsx
// In useEffect or document.title
useEffect(() => {
  document.title = 'SwanStudios | Elite Personal Training — NCEP Certified';
}, []);
```

#### 1.17 Connection Status Banner on Every Page Load
- **Severity:** MEDIUM
- **File & Line:** `frontend/src/components/ConnectionStatus/ConnectionBanner.tsx`
- **What's Wrong:** "🔄 Connecting to Server / Retrying..." banner appears on every page navigation for 2-5 seconds.
- **Fix:**
```tsx
// Only show on actual failure, not initial load
const { status } = useConnectionStatus();

if (status === 'connecting' && !hasAttemptedConnection) {
  return null; // Don't show during initial load
}

if (status === 'failed') {
  return <ConnectionBanner retrying />;
}
```

#### 1.18 Admin Sidebar — "!" Badge on Admin Command
- **Severity:** MEDIUM
- **File & Line:** `frontend/src/components/Sidebar/AdminSidebar.tsx`
- **What's Wrong:** "Admin Command" has red "!" badge — unclear if real alert or decorative.
- **Fix:** Either remove if decorative or add tooltip explaining the alert:
```tsx
<Tooltip content="Pending admin actions require attention">
  <SidebarItem>
    Admin Command
    {pendingActions > 0 && <Badge>{pendingActions}</Badge>}
  </SidebarItem>
</Tooltip>
```

#### 1.19 Content Studio — Video Shows "Invalid Date"
- **Severity:** MEDIUM
- **File & Line:** `frontend/src/components/DashBoard/Pages/content/VideoCard.tsx`
- **What's Wrong:** Published YouTube video shows "Invalid Date" in card metadata.
- **Fix:**
```tsx
// BEFORE (causes Invalid Date)
const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

// AFTER (with fallback)
const formatDate = (dateString) => {
  if (!dateString) return 'Date

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
