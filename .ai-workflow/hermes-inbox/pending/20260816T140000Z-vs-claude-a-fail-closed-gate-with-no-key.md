# A fail-closed gate with no key is not security, it's a dead feature

**Surface:** Creator video studio — Phases 1+2 · **Agent:** vs-claude (Opus 5)
**On main:** `20f3d2bc8` — provider registry, ComfyUI adapter, `generate` handler, 58 tests

## What shipped

The video provider registry and the render-agent's `generate` handler. The queue, lease,
heartbeat and crash recovery already worked; what was missing was a provider and a handler.
Sean can now *attempt* a render on the 5090, which he could not before. No video has been
generated — there is no GPU here, so the transport is proven only against a fake ComfyUI.

The licence is now code rather than memory. `resolve()` refuses a commercial H3 run in an
excluded territory without a recorded grant, and **a test asserts that the refusal says which
thing is restricted** — running the weights, not the video produced. That is the sentence that
decayed into "commercial use is blocked" and made Sean think he could not use his own footage.

## Mistakes I made

- **Shipped a fail-closed gate with no key.** Every catalogue row is frozen `enabled: false`
  with no override, so `generate()` could never have succeeded for anyone. I built a lock and
  no key and called it fail-closed. Caught by my own test on its first run — but I wrote it.
- **Made dependency injection decorative.** `runGenerate` accepted an injected `env` while the
  registry underneath read `process.env` regardless. Tests would have passed against one
  environment while production read another — the shape of bug that makes a whole suite
  worthless rather than merely incomplete.
- **Wrote a graph injector that CREATES inputs a node does not declare.** ComfyUI silently
  ignores undeclared inputs, so the graph would have run at full GPU cost rendering the
  template's placeholder prompt and reported success. Silent wrong output, billed.
- **Classed a 5xx submit as permanent**, which discards a job for a service blip — the exact
  inverse of the retryable-classification defect this same subsystem was already burned by.
- **Wrote artifact bytes under a `.mp4` name regardless of the real container**, and reported a
  timeout as "the graph produced no output", sending diagnosis at the wrong problem.
- **Repeated `| tail` masking, from my own ledger.** Ran `vitest run | tail -40` and read
  "exited with code 0" as vitest passing. It was `tail`'s exit code. The suite had 22 failing
  files. I have written this exact mistake up before, and did it again this session.
- **Repeated `&&` short-circuiting, also from my own ledger.** `grep -c` found 0 matches, exited
  1, and the chained `&&` meant the verification test **never ran** — I was one step from
  reporting a restored file as verified without executing anything.

## What worked, for calibration

Suspecting the TEST first when new tests failed against new code. Both first-run failures were
real implementation defects, not test bugs — the discipline pointed the right way twice.

Then **mutation testing**, which is new here and is the part worth keeping: I broke the licence
gate, the image-first law and the retry classifier one at a time and confirmed each killed
tests (4, 2, 5). That converts "58 tests pass" from a claim into evidence. See the durable
packet — it is the first *procedural* answer I have to the "my test was the defect" class that
my own ledger records at ~12 occurrences.

## Open

- **No video has been generated.** The first person at the 5090 should expect real-transport
  defects. Phase 3 (studio surface) should update the Forge blueprint, not invent a new plan.
- `normalizeProviderResponse` is tested but has no production caller until a hosted adapter
  lands. Preserved knowledge, not live code — stated so nobody counts it as working.
- `render-agent.mjs` is 330 lines, over the rule-4 cap. It was 329 before; my import added one.
- The H3 licensing email is still drafted and unsent. Non-commercial local runs need no grant,
  so Sean is not blocked from testing — only from commercial use.
