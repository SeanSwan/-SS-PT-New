# Swan Design Brain synthesis — Training Studio v2

Version 2.0 · 2026-09-07 local session; verification continued 2026-09-08 UTC.
Owner Sean · Blueprint and synthetic preview only. This is the governing visual direction for this packet, superseding the v1 Training Workbench concept.

## Direction and provenance

Sean selected **Training Studio with optional Program Map**, personal OpenRouter accounts, and blueprint/preview first. Retain a ready-to-use Swan Coach for nontechnical customers. “Brain” means the Swan knowledge, constraints and permission layer; the model is a replaceable backend.

Applied the installed Swan Design Brain at .claude/skills/swan-design-router/SKILL.md and its cinematic, asset-storyboarding, design-brain, external-reference-MCP, Mobbin learning and QA references. Chosen working-dashboard arc B2, compact C5 navigation, contextual C11 insight, restrained C12 surfaces. No unsupported cinematic hero, fabricated progress chart or gratuitous 3D.

**Mobbin was actually queried through the configured OAuth MCP client**, after this session's direct tool list lacked Mobbin. One manual pass: three calls, nine screen results and three flow previews. No full flow opened, no sections call, no automatic canon promotion. The pass stayed within the configured manual control limits. Root independently inspected returned Basecamp, Devin and Rows images; the bounded client inspected the returned reference set. Provider inference was not purchased with OpenRouter credits. Raw MCP outputs and reference images remain outside Git; public deep links and translated observations are in the local reference report.

| Design question | References inspected | Swan translation |
|---|---|---|
| What should dominate an editable work surface? | Basecamp task editor; MagicPath session setup; SchoolAI agenda; Perplexity workout detail | One prescription document dominates. Context and controls remain subordinate. |
| Where should AI live while someone works? | Rows contextual AI flow preview; Devin session and connection screens | Coach lives beside the selected prescription; changes have an exact before/after preview. |
| How do personal connections stay comprehensible? | Devin Personal Connections, Plain/Cofounder/HoneyBook AI settings; Rows and Vercel flow previews | Separate account ownership, capability, privacy and spending review. No provider console in the normal client journey. |
| How does this behave on a phone? | Swan's own mobile constraints; web references above | Session / Rolodex / Coach & settings select retained panes. This is our adaptation, not an observed Mobbin mobile pattern. |

## Composition and identity

Compact app bar and planning context → week/day spine → dominant session → contextual inspector → Review & save.
The Rolodex uses an economical list; the current session uses block markers and aligned prescriptions; the inspector uses a sapphire surface. They should not look like three interchangeable cards.

Plus Jakarta Sans supports headings and controls; Cormorant Garamond Italic marks one small editorial phrase; Fira Code aligns prescription data. Fonts and OFL licenses are locally retained. Branded controls use Midnight Sapphire, Royal Depth, Ice Wing, Wing Purple and Frost White, including blue-button/purple-glow pairing. Muted neutral ramps are prototype-local; application implementation must use the existing world/lens tokens and styled-components.

The signature moment is a reviewed change visible on the precise prescription row. Gold is restrained to the editorial line. Meaningful data stays legible and calm. No hover-only controls or ambient motion.

At ≥1280px the session has a dedicated inspector. At 701–1279px the inspector follows the session in the same work column. At ≤700px three retained panes prevent a long stack of library, workout and chat. Work width caps at 2000px on large displays; extra width does not stretch prescriptions across an entire 4K monitor.

## Usable scope in the interactive preview

- Exercise search/filter/detail/add, edit sets/reps/rest/tempo, lock/unlock, remove, move earlier and undo.
- Week/day navigation and Program Map use the same per-session draft state.
- Six Advanced sections expose goal/schedule, effort, progression/recovery, rotation/anchors, equipment/restrictions, and quality/provenance. Apply retains values; Cancel discards. Existing rows are not silently regenerated.
- Current plan first; backup comparison and selected-day blend creates a separate synthetic entry; drafts, template copies and archive restoration remain distinct.
- Default Coach plus personal OpenRouter/local-device sheets. Owner is separate from planning target. Unknown allowance, insufficient allowance, timeout and revocation have explicit blocked states.
- Fixed synthetic proposal, stale-draft/locked-row rejection, review, discard and in-memory save.
- 105-attempt loop example admits one synthetic call and blocks 104, then requires human review before future tasks.

This is an interaction prototype, not an implementation of OAuth, model selection, pairing, durable budgets, a live exercise catalog, actual backup regeneration, multiweek prescription generation or save transactions. All examples reset on refresh. Richer generator controls and all v1 preservation requirements remain specified in 03; the preview is a deliberate representative subset.

## State and accessibility contract

| State | Appearance and recovery |
|---|---|
| Loading | Final app retains last safe draft, names the operation and exposes Cancel; library skeleton carries no fabricated count. Prototype has no asynchronous fetch to simulate. |
| Empty | Rolodex search renders a real no-match state with clear recovery. New plan uses an empty session and Add movement. |
| Partial | Keep loaded prescriptions editable; identify unavailable history or device. Do not fill missing performance with zeros. |
| Success | In-memory save confirms “Preview draft saved”; production must use a persisted receipt. |
| Denied | Connection revoked, consent denied, child eligibility unknown, assignment lost: stop before enrichment/dispatch and preserve an authorized draft. |
| Validation | Numeric HTML bounds plus limit ordering errors; focus the first invalid field and retain values. Server returns typed violations. |
| Failure/retry | Unknown provider acceptance holds a reservation. Retry is a status check until resolved, not another paid dispatch. |
| Cancel/recovery | Native dialog Escape and Cancel restore focus. An interrupted save reconciles by request ID; no blind resave. |
| Privacy unavailable | Explain that protected context cannot be verified; manual editing remains available within current authorization. Never show a reassuring “private” success badge. |

Use native buttons/forms/dialogs; real application modal manager must preserve focus trapping, Escape behavior, focus restoration and screen-reader announcements. Visible touch targets at least 44px. Prefer 16px phone body text and readable label sizes when integrating into the app; this compact prototype deliberately prioritizes the prescription hierarchy.

Fresh browser evidence: evidence/v2-preview-qa.json. Eight workflow checks, twelve widths, CSS 200% reflow, reduced-motion/forced-colors emulation, Escape/focus return and zero external browser requests passed. This does not replace a full accessibility audit, native browser zoom test or screen-reader pass. Initial Cancel bug was detected and corrected before the green run; evidence/v2-preview-failure.json retains that observed failure.

## Decisions from the hostile design pass

Removed oversized marketing orientation, repeated KPI cards and an equally weighted provider tab. Added explicit payer ownership, stale-proposal rejection and a plain-language stop state. Kept Coach first-run setup-free. Kept Program Map secondary. Deferred generated illustrations and charts because neither would make a prescription decision clearer. The application still needs responsive/component tests in its mounted route before UI implementation can be called verified.
