# Swan Coach C5 — design contract, and the blocker that stopped the code

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 (comment posted), SWA-64 (blocker), SWA-67 · **On main:** `06de226b4`
**Status:** ideation gate OPEN — no runtime code written, awaiting Sean's direction pick

---

## The thing worth carrying: grounding caught a compile-breaking assumption

The plan for C5 states as fact that the intent bar must route audience-correct destinations through `resolveAudienceFromPath`, shipped by SWA-64.

**It is not on `main`.** `git grep resolveAudienceFromPath origin/main` returns zero hits. It exists in **three unpushed commits** on `feat/admin-trainer-normalization`, in a separate worktree, finished but never merged.

Had I started coding from the plan, I'd have written code that does not compile — and I would have found out at build time, not design time.

**Generalizable rule:** a plan can cite a dependency as *shipped* when it is only *written*. Before designing against any named helper, `git grep` it **against `origin/main`, not the local tree** — a local worktree can make unmerged work look landed. This is the same class as the seven "already built" findings, inverted: the plan was wrong about something existing *and* wrong about something not existing, in the same program.

## Eighth "already built" — and a distinction that mattered

- **No global command palette exists** (the only `cmdk|Cmd+K` hit was an unrelated Reels key handler) → the overlay genuinely is net-new, so the design gate legitimately applied.
- **But the intent+voice pairing already exists.** `ClientTrainingCommandBar.tsx` (296 ln) already runs `useCoachCommand` + `useCoachBrowserSpeechInput` with the placeholder *"Dictate sets, reps, load, pain, notes…"*.

So the honest scope is **generalize an existing bar**, not invent the pairing. Worth noting the grounding pass produced *both* answers — part net-new, part already-built — rather than a single verdict. **"Does this exist?" is usually not a yes/no question; it is a per-component one.**

## Design lesson from the external reference pass

Six real command palettes examined (Mobbin, working-surface lane — a palette's job is task completion, so this is not the cinematic lane).

The highest-value pattern was **Linear's context chip above the input**: the palette declares *what it is acting on* before you type. For Swan that is the locked client — the precise failure mode C0.5 proved was live in production on a destructive command. A palette that does not show whose record it writes to is dangerous in a way a project-management palette never is.

**And what the references did NOT have:** not one of the six treats **voice as a co-equal input**. Every reference palette is keyboard-only. That is Swan's actual differentiator, and it is the part that cannot be borrowed — each of the three directions answers *"what is voice here"* differently, which is why they disagree on structure rather than palette.

**Rule:** when a reference sweep comes back unanimous on a dimension your product must be different on, that unanimity is the signal — it marks the boundary between what to borrow and what to invent.

## The direction that is winning, and why

Three directions were produced: an overlay led by the client chip (*The Lock*), a persistent docked bar where `Cmd+K` **focuses** rather than opens (*The Lane*), and a two-column overlay with a live consequence preview (*The Console*).

Recommendation is **The Lane with The Lock's chip fused in**, on one argument: DoD #1 is a voice-originated set log in **≤2s, screen-off**. An overlay you must summon is a mode-switch, and a mode-switch fights the goal. It is also the shortest path from the bar that already exists.

*The Console* is the strongest single idea in the set — showing what a command will do to the record before commit is the C3 read-back tier made visual — but it has no mobile answer that is not "also build The Lock," so it is a later slice, not this one.

**Rule worth keeping: the best idea and the right next slice are frequently not the same idea.** Naming that gap explicitly is more useful than picking the most impressive option.

## Open for Sean

1. Direction pick (1 / 2 / 3 / hybrid — hybrid requires a written 4th combined direction before code, per the router).
2. **Audience routing: (a) land SWA-64's 3 unpushed commits first, (b) ship with role props and wire on merge, or (c) duplicate the resolver — (c) not recommended, that is the drift this program removes.** Recommendation is (a): it is finished work sitting unmerged.
3. Whether C3's confirmation tier (SWA-67) goes observe-only first or C5 ships tier-unaware.

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation. No durable packet emitted for this turn: the transferable lessons here are process-level and are already carried by the two packets from this program; a third would dilute rather than compound.
