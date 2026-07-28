# A bounded cache that evicts wrong turns a rate limiter into a bypass

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `1d2515af1` on `origin/main`

Sean asked for another hostile pass specifically to see whether it would come back empty. It did not.

## The defect

The message throttle keeps per-user timestamps in a `Map` bounded at `MAX_TRACKED_USERS`. Eviction removed `sends.keys().next().value` — the **first-inserted** key. `Map.set` on an existing key does **not** reorder it, so that key was merely the first user the process ever saw, not the least recently active. Evicting them deleted their timestamp array, and an actively-throttled sender got a **fresh burst budget**.

Reproduced before touching anything: exhaust a user's burst → confirm throttled → push 10,100 other senders through → the same user is admitted again.

Severity honestly stated: **LOW**. An attacker cannot execute it alone; it needs ~10k distinct senders inside the window to flush a specific victim. Fixed because a throttle should mean what it says, not because it was reachable at launch scale.

## The part worth remembering: the first fix failed its own test

Switching to true LRU (`delete` then `set` on every touch) made eviction order honest — and the probe **still** admitted the throttled user. Under enough traffic a throttled sender *legitimately becomes* the least-recently-used, so correct LRU still evicts them.

The working fix is different in kind: eviction now **prefers a victim that is not currently throttled**, scanning a bounded window (64) from the LRU end, falling back to the LRU entry so the map cannot grow without limit.

**Transferable rule: for any bounded cache holding enforcement state, "which entry is oldest" is the wrong question. The right question is "which entry is safe to lose."** Eviction policy is part of the security property, not a housekeeping detail.

## Second issue the same probe exposed

Entries were never removed once their window emptied, so the map grew monotonically with every distinct sender the process had ever seen — a permanent registry, not a working set. Entries whose pruned array is empty are now dropped, so the bound applies to ACTIVE senders and the 10k ceiling is far harder to reach.

## Method note

This was found by **executing the module adversarially**, not by re-reading it. Boundary, clock-skew-backwards, same-instant flood, retry-after sanity, and eviction pressure — five probes, four clean, one caught it. Three prior hostile passes over the same file by reading found nothing.

When reviewing stateful code, run it against hostile inputs. Reading confirms what you already believe.

## Verified clean in this pass and left alone

Import-execution smoke on all three changed modules loads at runtime; burst and hourly boundaries are exact; non-monotonic clock input cannot over-admit; a same-timestamp flood is capped; `retryAfterMs` stays inside the window; recovery after the window works.

Baseline note for the next session: `tests/unit` + `tests/api` now shows **16 failures across 5 files** (commandRegistry, consoleRedaction, evalHarness, logRedactionShared, loggerRedaction), verified **identical on a pristine `origin/main` worktree**. It grew 7 → 11 → 16 over the day from other agents' in-flight logging work. Do not chase these as regressions.

*IDs and roles only. No PII, credentials, or customer data.*
