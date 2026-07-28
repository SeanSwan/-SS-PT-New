# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/MASTER-HANDOFF-degate-design-overhaul-2026-07-21.md
**Seed:** (none)
**Tokens:** 3547 in / 5988 out · **Cost:** ~$0.1005 · **Wall:** 224.8s

---

# Kimi K3 Co-Review — R1

## (1) HOSTILE PASS

**H1 — Undefined rule references (executability failure).** The prompt claims the agent needs zero context, then invokes Rules 70, 26, 34, 40, 42, 48, 51, 61 with no definitions. "Canonical Surface Receipt (rule 26)", "rule-51 confidence tags", "Rule 42 pre-push backend audit" — a zero-context agent cannot produce these artifacts in the required format. Either inline the operative content of each rule or replace with literal instructions ("write a markdown receipt with fields X/Y/Z to path Z").

**H2 — The flag-mapping table is missing.** §1 gives env key names but never the registry/seed key names, the `ff_<key>` names, the `?swanpreview=` param values, or the per-surface `flags.ts` paths. S1.2/S1.3 say "remove the 6 redesign flags + dashboardV2" from seed/registry/UI/plumbing — from text alone the agent cannot know what string to grep. Add one table: surface → gate component (file:line) → env key → seed key → VITE_ key → ff_ key → swanpreview value → flags.ts path.

**H3 — The 8th vNext surface is unidentified.** §1 lists 6 vNext directories + dashboard v2 = 7. S2.2 says "register the 8 parked vNext surfaces." The tracker says 8/8 built but the prompt never names all 8. An agent cannot register an unknown surface. Enumerate all 8 directories explicitly.

**H4 — S1.4 contradicts S4.2 (double-clear hazard).** S1.4's migration deletes the removed flags' rows *and their overrides*. S4.2 tells Sean to clear redesign overrides via the board. After the migration deploys there is nothing to clear; before it deploys the board (per S1.2) no longer lists those flags. Pick one mechanism and order it: board Kill-all pre-deploy, migration as audited backstop — or migration only. As written, two agents will do both and the second will be confused by a no-op.

**H5 — dashboardV2 is unlocated and its dependency unexamined.** Ground truth never gives the file:line of the dashboardV2 gate or names the V1 fallback component. Worse: `dashboardV2Finance` is kept as a feature flag — if the finance widget only renders inside the v2 shell, de-gating the shell to V1 silently strands a "working" feature flag that does nothing (or breaks it). The doc must state the dependency verdict and where the finance flag consumer lives. Also "Decide… if (it is)" is pre-decided theater — just issue the directive.

**H6 — S1.5's acceptance criterion is likely unverifiable.** "No `/api/config/public-flags` call from these pages" — if the fetch originates in a global FlagProvider at app root, this is impossible and the agent will either fake it or rip out shared plumbing (breaking the 3 surviving feature flags). State where the fetch originates; if global, rewrite the criterion as "these routes import no flag-resolution module" and assert that.

**H7 — Ordering hazard: S1.3 can break vNext compilation.** "Delete the frontend flag plumbing… the per-surface flags.ts files' ENV_FALLBACK, the ff_<key> QA hooks, and the ?swanpreview paths" — scope of deletion is ambiguous (whole files? constants?), and if any parked vNext page imports those modules, S1 breaks compilation, violating Sean's law #4. Specify exact paths, exact symbols, and a grep-verify step proving zero vNext imports of deleted modules.

**H8 — No per-slice gates.** First full `tsc`/vitest/build happens in S5. Rule "commit per slice" + no per-slice build = up to 4 broken intermediate commits, and the batch push amplifies the blast radius. Require tsc --noEmit + affected vitest + build green before every slice commit, with the explicit assertion "vNext dirs still compile after S1."

**H9 — No rollback story.** One batch push, one irreversible-ish migration. State: revert = `git revert` of the push; migration must be backward-compatible (old code + new schema fails closed to original designs since env keys are unset). Also: verify `flag_audit` has no FK to the flags table before the migration deletes rows — append-only audit + FK = failed deploy.

**H10 — S0.4 assumes prod admin credentials.** "Log in as admin" on live prod — whose creds, MFA? Either name the provider or convert to "Sean performs the click-pass against the agent's checklist." Unblockable step otherwise.

**H11 — Minor but real:** DoD says "Design Studio", S2 says "Design Playground" — pick one name. S3.3 "delete ADMIN_DASHBOARD_TABS… tests import it" — must say "update importing tests." "Restore branch unaffected" / "proof-card flag still flips" (S5.3) — neither is located anywhere; give file paths or the agent can't verify them.

## (2) NEXT-LEVEL IT (leave it better for the Mobbin redesign)

- **I1 — Playground as a data-driven manifest, not hardcoded entries.** A `playgroundRegistry.ts`: `{ id, title, lazyImport, status: 'parked'|'iterating'|'approved', sourceRoute, mobbinRefs[], notes }`. The future redesign then costs: add/flip entries, and "promotion" = moving one import from registry to route — which is exactly Sean's-law-#2's "ships by REPLACING the real page." Document that promote path in the playground README.
- **I2 — Parked-design inventory.** In S2, capture a screenshot + short "what was built / why parked / reusable primitives" note per surface into a `PARKED-VNEXT-INVENTORY.md`, linked from the tracker. The vNext work's real value for the Mobbin pass is tokens, primitives, and copy — make that extractable without booting the app.
- **I3 — Preview frame with viewport switcher (structure only, no styling).** Desktop/tablet/mobile toggles + the "PREVIEW — not live" banner. This is wiring, not redesign, so it doesn't violate the budget guardrail — and it's the harness every Mobbin iteration will use.
- **I4 — Receipts bundle, defined as artifacts:** S0 screenshots + click-pass log + `public-flags` JSON before/after + **build-manifest diff proving vNext chunks left the public graph (with KB delta)** + post-deploy click-pass. Land in `docs/receipts/de-gate-2026-07-21/`. The bundle-size win is the one number Sean will actually enjoy.
- **I5 — Two new contract tests:** (a) no route module imports from any `v-next`/`vnext` directory; (b) the flag registry whitelist test (see below). These make Sean's law #3 *enforced*, not documented.

## (3) Fable's Launch Control opinion — AGREE, with teeth

Keep-for-features is right. `postSaveHandoff` touches the post-checkout flow (money-adjacent), `prismCapture` and `dashboardV2Finance` are genuinely risky runtime surfaces — for those, an audited DB kill switch beats a revert-and-redeploy incident response, and it doesn't violate push-to-git because it gates *behavior*, not *appearance*. Full removal would throw away `flag_audit`, which is genuinely useful forensics. But "doctrine says design never gates again" is a pinky-promise. Add the whitelist contract test: registry may contain exactly `{postSaveHandoff, dashboardV2Finance, prismCapture}` — any future design flag fails CI. That's the difference between a rule and a vibe.

## (4) VERDICT: SHIP-WITH-CHANGES

Ranked:
1. **H1** — inline all rule references or convert to literal instructions.
2. **H2 + H3** — the full flag-mapping table and all 8 vNext directories named.
3. **H5** — locate dashboardV2 gate, name V1 fallback, state the dashboardV2Finance dependency verdict.
4. **H4** — one override-clearing mechanism, explicitly ordered.
5. **H8 + H9** — per-slice green gates; rollback note + flag_audit FK check.
6. **H6 + H7** — fix the unverifiable S1.5 criterion; delimit S1.3 deletion scope with grep-verify.
7. **H10 + H11** — S0 credential plan; locate proof-card/Restore; name + test-import fixes.
8. **I1–I5 + §3 test** — manifest registry, inventory, receipts bundle, whitelist contract test.

Everything above is executable from the document plus these edits — none requires my session context. Logged as R1: complete.
