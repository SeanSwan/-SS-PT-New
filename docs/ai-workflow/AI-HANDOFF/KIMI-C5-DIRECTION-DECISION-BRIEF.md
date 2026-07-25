# Kimi — arbitrate ONE design decision (C5, Swan Coach intent bar)

**What I need from you:** pick **one** of three directions and defend it, or tell me all three are wrong and say what replaces them. This is a decision request, not a general review. Lead with the pick.

---

## The surface

Swan Coach is the Jarvis layer of a personal-training SaaS. A **trainer** drives it **by voice, hands busy, on a gym floor, with a client standing in front of them.** Dictation is primary input; tapping is the fallback.

C5 builds **"the one intent bar"** — a role-aware `Cmd+K` **and** the voice lane as a single object: intent → capability → client → destination.

**Definition of done #1 (outranks everything else):** *a voice-originated set log lands in ≤2 seconds, screen-off, offline-capable, with earcon confirmation and spoken undo.* Trainers will benchmark this against **two taps in a manual logger**, not against other voice assistants. If voice is slower than tapping, or needs a glance, dictation-first is dead.

## Non-negotiable context you must design against

1. **The catastrophic failure mode is a wrong-client write.** A trainer runs back-to-back sessions and speaks in pronouns ("she's feeling it in her knee", "add another set for him"). A misresolved pronoun is not a wrong answer — it is a **write to the wrong client's record**. Clients read their own plans; pain notes feed NASM decisions. This was **live in production two days ago** on the command that cancels a session. It is now fixed in the backend, but the *trainer never sees that guarantee*.

2. **A confirmation tier system already exists** (built, not yet wired): `fire_and_forget` (silent, earcon only) / `read_back` (spoken read-back of parsed numbers, slot-level correction) / `deliberate` (explicit spoken yes — destructive, trainer-only, or **cross-client**). Tiers only escalate.

3. **Five command surfaces already exist** and must converge on whatever we build. One of them (`ClientTrainingCommandBar.tsx`, 296 ln) **already pairs typed intent + dictation**. We are generalizing, not inventing.

4. **Reference sweep finding:** I examined six real command palettes (Linear, Vapi, StackAI, Juicebox, Fey, Navattic). Best borrowable idea = **Linear's context chip above the input** — the palette declares *what it acts on* before you type. **But all six are keyboard-only. Not one treats voice as a co-equal input.** That's the part we must invent.

---

## The three directions

### 1 — "The Lock" (overlay, safety-first)
Full overlay. The first thing that resolves is **not** the input — it is the **client chip**: "Working with Client #84." Grouped commands beneath, scoped to that client.

**Signature move:** the chip sits above the input in Midnight Sapphire `#002060` with an Ice Wing `#60C0F0` edge. The instant a typed or spoken command would act on a *different* client, it flips to **Gilded Fern `#C6A84B`** with a 2s pulse and the primary button's glow inverts. The `deliberate` tier made visual.

**Motion:** tier-2. **Risk:** chip eats vertical space on mobile; if a trainer works one client for an hour the chip becomes wallpaper — the classic always-on-warning-stops-being-read failure.

### 2 — "The Lane" (docked bar, restrained)
**No overlay.** A persistent **56px bar docked at the bottom** of every Coach surface, always showing the locked client + a mic. Nothing to summon. `Cmd+K` **focuses** it rather than opening a modal. Typing/speaking expands it upward into 5 rows; collapses on execute. Collapsed state carries one live token: pending/unsynced count.

**Signature move:** the bar that is already open — keyboard and voice reach the same object with **no mode change**, and on mobile the thumb is already on it.

**Motion:** tier-3 reduced baseline. **Risk:** permanently occupies 56px on every Coach surface; worse in landscape on a phone; will not demo as well as an overlay.

### 3 — "The Console" (two-column, consequence preview)
Full overlay, two columns. Left: intent list. Right: a **live consequence preview** of the highlighted command — *"Squats · 185 lb × 8 → adds set 3 to today's session for Client #84"* — with last session's numbers inline, and the confirmation tier it will require named before you press enter.

**Signature move:** you see what a command will do to the record *before* it happens — the `read_back` tier rendered visually instead of spoken, with numbers big enough to catch a misheard digit at arm's length.

**Motion:** tier-1 available. **Risk:** two columns do not survive a phone; would need to degrade to Direction 1 on mobile = **building two things**.

---

## My current pick (attack it)

**Direction 2 as the base, with Direction 1's client chip fused into it** — the docked bar carries the chip inline at its left edge, flipping Gilded Fern on cross-client.

**My reasoning:** DoD #1 is ≤2s screen-off. An overlay you must summon is a **mode-switch**, and a mode-switch fights that goal. Direction 2 is also the shortest path from the bar that already exists. Direction 3 is the best *idea* in the set but has no mobile answer, so it is a later slice.

---

## Answer these, concretely

1. **Which direction, and why?** If you think the fused 2+1 is wrong, say what beats it.
2. **Is a 56px permanent dock defensible** on a phone across 320/375/414 given the Logger also wants that space — or does the always-present bar lose to a summoned overlay in real one-handed use?
3. **Does the always-visible client chip actually prevent wrong-client writes, or does it habituate into wallpaper?** If it habituates, what design makes cross-client *impossible to miss* on the 200th time instead of the 1st?
4. **How should voice and keyboard share one object without a mode?** Every reference palette is keyboard-only — this is unsolved prior art. Be specific about the affordance.
5. **The one highest-impact change** to make this feel premium and unmistakably Swan rather than a generic `cmdk` clone.

Be concrete and opinionated. Do not hedge to consensus.
