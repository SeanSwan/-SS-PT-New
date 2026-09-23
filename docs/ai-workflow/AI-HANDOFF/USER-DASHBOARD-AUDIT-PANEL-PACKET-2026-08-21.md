---
decision: Hostile-review an external User Dashboard audit against verified origin/main evidence
status: open
supersedes: none
originating_model: claude-opus-5
base_sha: 66ffde60784c1e47f8344c44b113214b1a529e7d
base_ref: origin/main
---

# PACKET — User Dashboard Hostile Audit, Panel Verification Round

## Your remit

An external audit of the SwanStudios **user dashboard + social surfaces** was delivered.
Before we act on it, we are hostile-reviewing it. You are one of four reviewers
(GLM 5.3, Kimi K3, Grok 4.6, Opus 5).

**You cannot read the repo.** So Opus 5 pre-verified the audit's headline claims
against `origin/main @ 66ffde607` and pasted the REAL code below each claim.
Judge the audit using that evidence.

Answer these, per claim and overall:

1. **Is the claim TRUE given the pasted code?** (confirm / refute / needs-more-evidence)
2. **Is the severity RIGHT?** (P0/P1/P2 — argue up or down)
3. **Is the PRESCRIBED FIX correct and sufficient?** Would it actually close the hole,
   or does it leave a sibling path open?
4. **What did the audit MISS?** Absence-first: what should exist and does not?
5. **Where is the audit WRONG, overreaching, or selling scope creep?**
   Push back hard. A 12-week roadmap from an outside auditor is a sales document
   until proven otherwise.
6. **What is the correct BUILD ORDER?** If you disagree with the audit's ordering, say so.

Be adversarial. Do not validate to be agreeable. If the audit is mostly right,
say which 20% is wrong — that is the valuable part.

## CRITICAL CONTEXT — the tree question

The audit claims base `main @ 66ffde607` (2026-08-20). **Opus 5 verified that SHA is
genuinely `origin/main`.** The local working tree is a `wip/` branch 2158 commits
BEHIND main, so all verification below was done via `git show origin/main:<path>` —
never the working tree. Treat any claim not backed by pasted code as UNVERIFIED.

---

## VERIFIED CLAIM 1 — P0: Settings can report "Saved" without writing

**Audit says:** `UserDashboardTabsV3` always supplies a callback (a no-op) even when
the real one is absent, so `UserSettingsHub`'s `PUT /api/profile` fallback never runs.
Settings shows "Saved" while nothing persists.

**REAL CODE — `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx`:**

    105:const noopUpdateProfile = async () => undefined;
    106:const noopOpenEditor = () => undefined;
    122:  onUpdateProfile?: (data: Record<string, unknown>) => Promise<void>;
    248:              onUpdateProfile={onUpdateProfile || noopUpdateProfile}
    249:              onOpenEditProfile={onOpenEditProfile || noopOpenEditor}

**REAL CODE — canonical shell `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`.
BOTH mount sites. Note what is absent:**

    128:              <UserDashboardTabsV3
    129:                activeTab={dashboard.activeTab}
    130:                onTabChange={handleTabChange}
    131:                transformationPhotos={dashboard.transformationPhotos}
    132:                transformationVisibility={dashboard.transformationVisibility}
    133:                homeProfile={dashboard.profile}
    ...                (NO onUpdateProfile, NO onOpenEditProfile)

    183:                  <UserDashboardTabsV3
    184:                    activeTab={dashboard.activeTab}
    185:                    onTabChange={handleTabChange}
    ...                    (NO onUpdateProfile, NO onOpenEditProfile)

**And `dashboard.updateProfile` DEMONSTRABLY EXISTS** — same file uses it:

    218:                    await dashboard.updateProfile(data);   // EditProfileModal onSave

**OPUS 5 VERDICT: CONFIRMED.** Prop is `undefined` -> falls to `noopUpdateProfile`
-> resolves successfully -> UI prints "Saved" -> no network write.

**AGGRAVATING FACTOR THE AUDIT DID NOT FIND.** A test exists that LOOKS like it guards
this — `UserSettingsHub.saveContract.test.ts` — but it is a SOURCE-TEXT REGEX test:

    const source = readFileSync(resolve(process.cwd(),
      'src/components/UserDashboard/components/UserSettingsHub.tsx'), 'utf8');
    expect(saveBranch.match(/apiService\.put\('\/api\/profile'/g)?.length || 0).toBe(1);
    expect(saveBranch).toMatch(/if \(onUpdateProfile\)[\s\S]*else[\s\S]*apiService\.put/);

It greps the file as a STRING. It never renders the component and never asserts a
write happened. It passes green while the bug ships. **Question for the panel: how many
other `*.contract.test.ts` / `*.saveContract.test.ts` files in this repo are source-text
regex tests giving false assurance?** This smells like a systemic testing-doctrine defect,
not a one-off.

---

## VERIFIED CLAIM 2 — P0: "Mute User" does nothing

**REAL CODE — `frontend/src/components/Social/Feed/hooks/usePostCardModeration.ts`:**

    47:  const handleMute = useCallback(() => {
    49:    logger.warn('TODO: implement mute user', post.user.id);

**REAL CODE — `frontend/src/components/Social/Feed/components/PostHeader.tsx`
(it is rendered as a live, clickable menu item):**

    177:                  <DropdownMenuItem onClick={() => { onMute(); onMenuClose(); }}>
    179:                    Mute User

The file's own blueprint header comment admits it:

    20: * | [Mute User] -> mutes user's posts (future: POST /api/mute) |

**OPUS 5 VERDICT: CONFIRMED.** A user-facing SAFETY control that silently no-ops.
The member believes they have muted someone. They have not.

**Panel question:** the audit says "remove it or implement it." Which? Argue it.
Consider: is a missing mute worse than a fake mute? Does `block` or `report` exist
and actually work, or are those also stubs? (Reviewer note: Opus 5 did not verify
block/report — flag if you think that gap matters.)

---

## VERIFIED CLAIM 3 — P1: Creative presents likes as views

**REAL CODE — `frontend/src/components/UserDashboard/components/CreativeGallery.data.ts`:**

    164:      views: normalizeCreativeMetricCount(post.likesCount),

**OPUS 5 VERDICT: CONFIRMED.** The field displayed as "views" is populated from
`likesCount`. This is not rounding — it is a mislabel of a different metric.

**Panel question:** severity. Audit says P1. Is a fabricated analytics number shown
to a creator actually P0, given this repo's own "data truth" rule that forbids
mock data in progress surfaces?

---

## VERIFIED CLAIM 4 — P1: in-post transformation slider cannot move

**REAL CODE — `frontend/src/components/Social/Feed/PostCard.tsx`:**

    56:  const [transformationSliderValue] = useState(50);

Value destructured; **setter omitted entirely.** Passed down and used for opacity:

    PostContent.tsx:134:        $style={{ opacity: sliderValue / 100 }}
    PostContent.tsx:141:        $style={{ opacity: 1 - (sliderValue / 100) }}
    PostContent.tsx:185:            sliderValue={transformationSliderValue}

**Contrast — the STANDALONE viewer is correct:**

    TransformationPhotoShowcase.tsx:113:  const [sliderPos, setSliderPos] = useState(50);

**OPUS 5 VERDICT: CONFIRMED**, and the audit was precise — it correctly distinguished
the working standalone component from the broken in-post one. That precision raises
the audit's credibility.

---

## VERIFIED CLAIM 5 — P1: nested 300px sidebar crushes content

**REAL CODE — `frontend/src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts`:**

    150:export const ContentGrid = styled.div<{ $fullWidth?: boolean }>`
    152:  grid-template-columns: ${({ $fullWidth }) => $fullWidth ? 'minmax(0, 1fr)' : '300px minmax(0, 1fr)'};

**And the Home surface adds a THIRD rail —
`frontend/src/components/UserDashboard/components/HomeTabVision.styles.ts`:**

    61:  grid-template-columns: minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px);
    67:    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(300px, 340px);

**OPUS 5 VERDICT: CONFIRMED.** Outer Observatory rails + inner 300px ContentGrid
sidebar nest. At 1280-1440px the true content column is squeezed.

**Panel question:** the audit prescribes "remove the inner sidebar + establish a
minimum usable main-content width." Is that right, or is the real fix to make
`$fullWidth` the DEFAULT and opt IN to the sidebar? Which is less likely to regress?

---

## VERIFIED CLAIM 6 — P1: Progress tab is far below the available chart system

**REAL CODE — `frontend/src/components/UserDashboard/components/WorkoutsTab.tsx`:**

    91:        params: { limit: 200, page: 1 },

Audit says these 200 sessions are reduced to exercise/category touch counts and
rendered as static horizontal bars — no date range, no hover, no drill-down,
no goal line, no PR annotation, no accessible table, no link to source session.

**OPUS 5 VERDICT: fetch limit CONFIRMED.** The "static bars / no interactivity"
characterization is consistent with the file but was not exhaustively verified.
Treat the 200-limit as VERIFIED and the interactivity gap as LIKELY.

**Panel question — this is the biggest build item, so attack it hardest:**
The audit wants ONE canonical analytics contract powering member Progress, trainer view,
public profile, Coach context, milestone cards and weekly stories; plus a shared drill
panel (bottom sheet mobile / side panel desktop); plus PR markers, goal lines, coach
annotations, an accessible data table, and "Ask Coach about this chart."
Is that the right scope, or is it a rewrite disguised as a fix? What is the
minimum slice that delivers real member value? The audit itself says "perfect two
charts first: consistency + primary exercise progression" — is that the right two?

---

## UNVERIFIED CLAIMS — panel should treat with suspicion

Opus 5 did NOT verify these. Flag any you think are load-bearing:

- Role-aware routing bypassed by hard-coded client paths (challenges, Nutrition Coach,
  workout-post logger links)
- "Log This Style" opens a generic logger without transferring the workout payload
- Copy over-promises: Activity claims posts+workouts+reactions but maps <=6 profile posts;
  Photos promises albums with no album logic; Groups promises chat that ordinary members
  cannot enter; party-health implies workout adherence drives HP; "Weekly Momentum"
  shows level progress, not weekly behavior
- Transformation Photos/Profile mounts pass `isOwnProfile` without an upload callback,
  so owner upload controls never render
- `main` has branch protection DISABLED and no required status checks
- Reels are limited to media from the first feed page (10 posts)
- Feed injects 2 external enrichment cards before the first member post, then 1 per 4 posts

## The audit's own headline numbers

- Verdict: 6.2/10 for fun; "B+ components inside a C-level information architecture"
- Proposes collapsing 10+ destinations into 5 clusters: Home / Feed / Progress / Community / Profile
- Proposes a 12-week roadmap: 48h trust repair -> 2wk simplify -> wk3-6 habit loop -> wk7-12 signature
- Explicit anti-goals: no new top-level tab, no new rail, no second chart implementation,
  no new design system, no more leaderboard pressure

**Panel: is the 5-cluster IA correct for a TRAINER-LED B2B2C product, or is it
generic consumer-social IA applied to a coaching product? SwanStudios' stated wedge is
coach-connected training, NOT a social network. Does the proposed IA serve the coach
relationship or dilute it?**

---

## Output format

    ## VERDICT: <audit is CREDIBLE / PARTIALLY CREDIBLE / UNRELIABLE>
    ## CLAIM-BY-CLAIM
      <n>. <confirm|refute|needs-evidence> — severity <agree|raise to X|lower to X> — <why, 1-3 lines>
    ## WHAT THE AUDIT MISSED   (absence-first; rank by value at risk)
    ## WHERE THE AUDIT IS WRONG / OVERREACHING
    ## CORRECT BUILD ORDER     (your ordering, with reasons; disagree freely)
    ## THE ONE THING           (if only one thing ships this week, what and why)
