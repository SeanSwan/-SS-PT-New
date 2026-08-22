# Hostile review packet — User Dashboard trust repair, Waves 2–3

You are reviewing code that is **already deployed to production** (`main` @ `79f3bb804`,
sswanstudios.com). Findings are still actionable as follow-up fixes — do not soften
because it shipped. Attack the reasoning, not just the syntax.

**Stack:** React 18 + TypeScript + styled-components. No Material-UI. Victory for charts.
Dark-first theme (`crystalline-dark` default, 16 themes total incl. one light theme
`crystalline-light`). Rule 2: 44px min touch targets. Rule 6: `var(--token, #fallback)`,
no raw hex. Rule 7: WCAG 4.5:1.

The context: a prior hostile audit found several member-dashboard surfaces that
**claimed a capability they did not have** (Wave 1 fixed a Settings panel that reported
"Saved" without writing, and a fake "Mute User" control). Waves 2–3 continue that theme.

Please attack each item below. I am specifically interested in: cases where my fix is
itself a new lie; accessibility regressions; behaviour I have asserted but not proven;
and anything that breaks under a non-default theme, a non-default role, or an empty /
error data state.

---

## 2a — Shared before/after slider

**Before.** `PostCard.tsx` held a value with no setter, and the two photos were laid out
side by side, each at permanent 50% opacity, behind a decorative handle:

```tsx
const [transformationSliderValue] = useState(50);   // no setter, ever
```

```ts
export const TransformationImageContainer = styled.div`
  display: flex;            // side by side, NOT overlaid
  gap: 8px;
`;
export const TransformationImage = styled.img`
  flex: 1; height: 200px;
`;
export const TransformationSlider = styled.div`   // looked draggable, had no handler
  position: absolute; top: 50%; left: 50%;
  width: 40px; height: 40px;      // also under the 44px rule
  cursor: pointer;
  &:hover { transform: translate(-50%, -50%) scale(1.1); }
`;
```

```tsx
<StyledBox as={TransformationImage} $style={{ opacity: sliderValue / 100 }} />
<StyledBox as={TransformationImage} $style={{ opacity: 1 - (sliderValue / 100) }} />
<TransformationSlider><Play size={16} /></TransformationSlider>
```

A second, working implementation existed on the dashboard
(`TransformationPhotoShowcase.tsx`) with real pointer drag but **no keyboard support**
and a 36px handle.

**After.** Extracted the whole mechanism — not just the number — into a shared hook, so
the two cannot diverge again. Full source of the new file:

```ts
// src/hooks/useBeforeAfterSlider.ts
export const SLIDER_MIN = 5;
export const SLIDER_MAX = 95;
export const SLIDER_POSITION_VAR = '--swan-slider-pos';
const STEP = 2;
const PAGE_STEP = 10;

const clamp = (n: number) => Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, n));

export function useBeforeAfterSlider(options: UseBeforeAfterSliderOptions = {}) {
  const { initialPosition = 50, label = 'Before and after photo comparison slider' } = options;
  const [position, setPositionState] = useState(() => clamp(initialPosition));
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setPositionState(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onPointerUp = useCallback(() => { isDragging.current = false; }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown': next = position - STEP; break;
      case 'ArrowRight': case 'ArrowUp':  next = position + STEP; break;
      case 'PageDown': next = position - PAGE_STEP; break;
      case 'PageUp':   next = position + PAGE_STEP; break;
      case 'Home': next = SLIDER_MIN; break;
      case 'End':  next = SLIDER_MAX; break;
      default: return;
    }
    e.preventDefault();
    setPositionState(clamp(next));
  }, [position]);

  const containerProps = useMemo(() => ({
    role: 'slider' as const,
    tabIndex: 0 as const,
    'aria-label': label,
    'aria-valuenow': Math.round(position),
    'aria-valuemin': SLIDER_MIN,
    'aria-valuemax': SLIDER_MAX,
    'aria-orientation': 'horizontal' as const,
    style: { [SLIDER_POSITION_VAR]: `${position}%` } as React.CSSProperties,
    onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp, onKeyDown,
  }), [label, position, onPointerDown, onPointerMove, onPointerUp, onKeyDown]);

  return { position, setPosition, containerRef, containerProps };
}
```

The live position rides a CSS custom property rather than an interpolated
styled-component prop, because interpolating it would mint a new CSS class on every
pointer-move frame:

```ts
export const TransformationAfterImage = styled(TransformationImage)`
  clip-path: inset(0 0 0 var(--swan-slider-pos, 50%));
`;
export const TransformationSlider = styled.div`
  left: var(--swan-slider-pos, 50%);
  &::after { width: 44px; height: 44px; /* ... */ }
`;
```

Consumer:

```tsx
const { containerRef, containerProps } = useBeforeAfterSlider({
  label: 'Before and after transformation comparison slider',
});
// single-photo case renders plainly rather than as a comparison control
if (!hasBoth) { /* ...TransformationSingleImageFrame... */ }
return (
  <TransformationImageContainer ref={containerRef} {...containerProps}>
    <TransformationImage src={before} alt="Before transformation" />
    <TransformationAfterImage src={after} alt="After transformation" />
    <TransformationSlider />
    <TransformationEdgeLabel $side="left">Before</TransformationEdgeLabel>
    <TransformationEdgeLabel $side="right">After</TransformationEdgeLabel>
  </TransformationImageContainer>
);
```

**Questions for you.** Is `role="slider"` on the whole track (rather than on a separate
thumb element) correct per WAI-ARIA, given the track is also the pointer surface? The
track has `touch-action: pan-y` — does horizontal drag work on touch, or have I broken
mobile? `setPointerCapture` is called on `e.target`, which may be a child image with
`pointer-events: none` — is that a bug? Is clamping to 5–95 (never 0–100) defensible, or
surprising for `Home`/`End`? Does the CSS-variable approach break if two comparison
sliders render on the same page (they each set the var on their own track — confirm the
scoping actually holds)?

---

## 2b — An upload affordance that could never render

`TransformationPhotoShowcase.tsx` gated its upload button on two conditions:

```tsx
{isOwnProfile && onUpload && (
  <UploadButton onClick={onUpload}><Upload size={14} />Upload Progress Photos</UploadButton>
)}
```

All three live mount sites passed `isOwnProfile` and **none** passed `onUpload`
(`UserDashboardTabsV3.tsx` ×2, `pages/Social/UserProfilePage.tsx:761`).

There is also no destination. `POST /api/photos/:userId` is a **record** endpoint whose
`storageKey` must already exist in R2 under this client's prefix:

```js
const { url, storageKey, photoType, takenAt, tags, visibility } = req.body;
const validation = validatePhotoRecord({ url, storageKey, clientId });
if (!validation.ok) return res.status(400).json({ success: false, message: validation.message });
const photo = await ClientPhoto.create({ userId: clientId, url, storageKey, /* ... */ });
```

`isOwnedPhotoStorageKey` requires `photos/{category}/{clientId}/...`. No presign or
direct-upload endpoint exists for client photos — the only frontend caller is the admin
`PhotoManager.tsx`, which makes a human **type the URL and storage key by hand**.

**My decision:** removed the affordance and the now-orphaned `UploadButton`, and changed
the copy from an instruction to a description:

```tsx
{hasPhotos
  ? 'Two photos of the same angle are needed to build a comparison. Only one is on record so far.'
  : 'Progress photos on your record will appear here as a before & after comparison.'}
```

**Questions for you.** Is removing the affordance the right call versus wiring it to the
existing generic `PhotoGallery` upload (which posts a general media post via `createPost`
and would **not** populate `photoType`, so the comparison would still never appear)? Is
the new copy accurate — a member *is* authorised to record their own photo, they just
have no way to place a file in R2. Does the copy mislead by omission about who can add
photos? Should the empty state instead link to the Photos tab?

---

## 2c — Role-blind routing and a button named for something it cannot do

```tsx
<ActionLink href="/dashboard/client/log-workout"><Zap/>Open Workout Logger</ActionLink>
// ...and, in the other branch, an identical destination under a different name:
<ActionLink href="/dashboard/client/log-workout"><Timer/>Log This Style</ActionLink>
<ActionLink href="/dashboard/client/workouts"><FileText/>View Workouts</ActionLink>
```

The logger accepts only a single-exercise deep link, never a routine:

```tsx
const routeExercise = searchParams.get('exercise');   // one lift, not a workout
```

**After** — using the existing canonical resolver (which I nearly re-implemented because
the handoff claimed none existed):

```tsx
const user = React.useContext(AuthContext)?.user;   // NOT useAuth() — see below
const logWorkoutPath = getLogWorkoutDashboardPath(user?.role);
const workoutsPath = `/dashboard/${getDashboardRolePath(user?.role)}/workouts`;
```

```ts
export function getLogWorkoutDashboardPath(role?: string | null): string {
  const dashboardRole = getDashboardRolePath(role);
  if (dashboardRole === 'admin')   return '/dashboard/admin/client-management?intent=log_workout';
  if (dashboardRole === 'trainer') return '/dashboard/trainer/clients?intent=log_workout';
  return '/dashboard/client/log-workout?loadPlan=today';
}
```

"Log This Style" was renamed to "Open Workout Logger" — the honest name for what it does.

I read `AuthContext` via `useContext` rather than `useAuth()` because `useAuth` throws
outside a provider and this is a leaf display modal; an absent role degrades to the
client route, which is what shipped before.

**Questions for you.** Is degrading silently to the client route the right failure mode,
or should an unknown role render no action at all? Two links now share the label "Open
Workout Logger" in mutually exclusive branches — is that confusing? Is bypassing
`useAuth()` a smell that will rot (someone later assumes the modal is auth-aware)? Should
the button instead carry the workout via params (a versioned, sanitised payload) rather
than being renamed down to what it can do?

---

## 2d — A cap applied before filtering

```ts
export function mapPostsToActivities(posts?: ProfileActivityPost[] | null): DashboardActivity[] {
  if (!posts || posts.length === 0) return [];
  return posts.slice(0, 6).map((post, index) => { /* ... */ });   // BEFORE any filter
}
```

Filters run downstream (`filterActivities(activities, activeFilter)`), so selecting
"Workouts" searched only the six most recent posts. A member whose recent six were
general posts saw **"No recent activity yet"** while having workouts.

The upstream loader already bounds the set: `loadUserPosts(userId, limit = 20, offset = 0)`.

**After:** cap removed; empty state made filter-aware.

```tsx
<EmptyTitle>
  {isFilteredView && activeFilterLabel ? `Nothing under ${activeFilterLabel} yet`
                                       : 'No recent activity yet'}
</EmptyTitle>
<EmptyCopy>
  {isFilteredView ? 'Your other activity is still here — switch filters to see it.'
                  : 'Start a workout or create a post!'}
</EmptyCopy>
```
```tsx
isFilteredView={activeFilter !== 'all' && activities.length > 0}
```

**Questions for you.** The feed still only ever reflects **profile posts** — a workout
logged but never posted still never appears, and the filter chips ("Workouts",
"Progress", "Achievements") arguably still overpromise. Is my copy fix sufficient, or is
the whole filter row a lie that should be cut until a real event ledger exists? Is
removing the cap a performance risk at 20 items with `framer-motion` per row?

---

## 3 — Nested rails

`ContentGrid` applied a 300px rail by default, opt-out:

```ts
grid-template-columns: ${({ $fullWidth }) => $fullWidth ? 'minmax(0, 1fr)' : '300px minmax(0, 1fr)'};
```

Home renders three rails of its own inside it:

```ts
grid-template-columns: minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px);
```

Computed from the stylesheet, Home's content column was **412px at a 1440px viewport** —
narrower than a 414px phone gets. Inverted to opt-in, with the policy extracted so it can
be asserted rather than read as source text:

```ts
const TABS_WITHOUT_PROFILE_SIDEBAR: ReadonlySet<string> = new Set<string>(['home', 'nutrition']);

export function shouldShowProfileSidebar(activeTab: TabId | string | null | undefined): boolean {
  if (!activeTab) return false;
  return !TABS_WITHOUT_PROFILE_SIDEBAR.has(String(activeTab));
}
```

Rationale recorded in the file: the failure modes are asymmetric — an accidentally
full-width tab still reads; an accidentally crushed one is the bug. A tab added later and
never considered renders full width.

**Questions for you.** `shouldShowProfileSidebar(null)` returns **false** while an
unknown string returns **true** — is that inconsistency a latent bug? Is a hardcoded
exclusion Set the right shape, or should each tab declare its own layout need? Home now
loses the profile rail entirely at every width — does that remove information members
relied on (level/streak/stats), given Home's own rails may not carry the same data? I did
not verify this in a browser; the width figures are derived from CSS, not measured.

---

## Cross-cutting: a compliance pass that introduced a bug

Bringing an 877-line styles file into Rule 6 compliance (the pre-commit guard scans whole
staged files) meant converting 31 pre-existing hex literals. Four were text on a **fixed**
surface. `--text-primary` is near-white in 15 themes and `#0B1726` under
`crystalline-light`, so those would have gone dark-on-dark. Caught in self-review:

- accent-gradient surfaces → `--text-on-accent` (computed for readability against the accent)
- a fixed `rgba(0, 0, 0, 0.6)` scrim → literal `#fff` with a `swan-guard-allow-hex` justification

**Questions for you.** Did I get the remaining 27 conversions right, or is mapping e.g.
`#A0A0B0 → --text-muted` and `#E0E0E0 → --text-secondary` a silent visual change in the
default theme? Is `--text-on-accent` (derived from the theme's *primary button* background)
actually correct for a purple avatar gradient and a cyan button gradient, which are not
necessarily the primary button colour?

---

## What I verified, and what I did not

**Verified this session:** 462/462 tests in the two affected trees (baseline 435);
`tsc --noEmit` exit 0; `vite build` exit 0; eslint 0 errors; design guards CLEAN; every
fix mutation-tested (revert it, the guarding test goes red). Live production checks after
deploy confirmed presence of new strings and **absence** of the old ones in the served
chunks.

**Not verified:** no live authenticated browser journey — no real pointer drag on a real
photo pair, no real member saving a setting. The viewport width numbers are computed from
the stylesheet, not measured in a browser. No screen-reader testing of the new slider.
