# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R4.md
**Tokens:** 2662 in / 9854 out (reasoning: 8969) | total 12516
**Wall:** 156.8s

---

```
VERDICT: DRY
```

**The three things I attacked hardest, and why each held:**

**1. The role-matrix oracle (message constant + registry verdict).** I tried to construct the case where it passes with a broken role check. For that, an expected-deny cell would need a compensating denial cause, and an expected-allow cell would need a compensating allow. The first is structurally closed: with client access mocked permissive (which it must be, or the allow-cells fail), the *only* available denial cause in a deny-expected cell is the role/registry check — there is nothing else to deny. The second is closed by verdict comparison: an over-denying role check flips allow-cells to denial messages, an over-allowing one flips deny-cells to success messages, and the constant is *copied*, not imported, so drift in the message itself is a failure too. What it genuinely cannot distinguish is **co-drift**: if someone flips a role in the registry, the gate follows the registry and the matrix follows the registry, and everything stays green. That is irreducible — the registry *is* the policy object, and the matrix's job is enforcement, not policy; the policy was the rounds 1–3 audit of all 139 commands. But it means the matrix inherits the classic sweep vacuity (a shrunken or empty enumeration passes by running zero cases), which the pin-test only partially fences. That goes in the next-step line, not the findings.

**2. The `CLIENT_IDENTIFYING` regex.** I went hunting for the name it misses, and found several: `clientEmail`, snake_case `client_id`, unanchored compounds (`targetClientId`), nested shapes (`client: {id}`). But I don't think this breaks dryness, because of what the invariant is *for*. The gate consumes `params.clientId` (and `clientRef`) — and every param name the gate can actually key on is in the list. A command that identifies a client by `clientEmail` is equally invisible to the gate *itself*; declaring `requiresClientRef` on it would change nothing, so the tripwire isn't the weak link — the gate's design boundary is, and a command like that gets caught at registry time, not by any flag. The invariant's coverage matches the mechanism's coverage, which is the property it needs. Unanchoring to `/client/i` is a strictly stronger, near-free widening — next-step material, not a hole in the current 139.

**3. `present()` semantics, especially the `status: null` delta.** The change introduces exactly one behavioural delta versus the old code: explicit `status: null` now passes where it denied before (absent ids passing was already true). Exploiting that needs a production assignment row with a null status, or with absent `clientId`/`trainerId`. The ids can't be absent in real rows — they're the join keys of the lookup that produced the row. Null status requires a nullable column *and* a write path that nulls it. If the schema says NOT NULL / always-written, the exploitable shape does not exist and the narrowing is what it claims to be — lax for fixtures only. The falsifier to verify when the stub-migration slice lands: check the column definition, and let null→deny come back with the slice rather than after it.

**On the mutation adjudication: yes, correct call.** A mutant that lands in the test's own filter has mutated the oracle, not the code under test; an oracle mutated into vacuity survives by construction, so recording it as a survivor would permanently cap the score at a number no production fix could ever move. Removal with the reason recorded is the only adjudication that keeps the remaining 40 meaningful.

```
ONE LINE: Before the deploy (after the burn entry goes on the checklist): snapshot the registry's per-command role/flag assignments and the sweeps' breadth (a command-count floor), and unanchor CLIENT_IDENTIFYING to /client/i — three cheap pins against co-drift, a shrunken sweep, and the 140th command; none of them blocks dryness.
```
