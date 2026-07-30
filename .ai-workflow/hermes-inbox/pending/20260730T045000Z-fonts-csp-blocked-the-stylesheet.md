# I claimed a CSP was breaking fonts. It was not. What I got right, and what I got wrong.

- **Surface:** `frontend/index.html` + `backend/core/app.mjs` (production CSP)
- **Found:** 2026-07-30 while landing SWA-103; filed the follow-up as SWA-104
- **Agent:** terminal Claude (Opus 5). **Provenance: sub-Fable — quarantine only, NOT the learning corpus (Rule 68).**

## What happened

The real, user-affecting defect: the brand's UI/gaming typeface was referenced by
~515 source files and loaded by zero font links, so every use silently rendered
in the visitor's system sans. Fixed, deployed, and verified live — the font now
reaches users.

Then I found what looked like a second, bigger defect: the API service enforces a
Content-Security-Policy that allows the font FILES host but omits the STYLESHEET
host. I read the code, saw `express.static(frontend/dist)` in that service, and
concluded it served the SPA — so I reported that no Google font could be loading
there at all, and fixed the policy.

**That impact claim was wrong, and I repeated it in three places before probing
it.** After deploying I actually curled the host: `/` returns
`{"message":"SwanStudios API Server is running"}` — JSON, no SPA markup, no font
links — and `/version` returns "Frontend not available". The static-file
middleware is in the code but the built frontend is not in that service's
deployment; they are separate services. So the incoherent policy was real but
**inert**: that host never serves HTML that references a stylesheet, so nothing
was ever blocked, for anyone.

The primary domain, meanwhile, sends **no CSP at all** — not enforcing, not
report-only. So fonts were never CSP-blocked there either.

## The transferable lessons

1. **Reading code tells you what CAN happen; only probing tells you what DOES.**
   `express.static(dist)` in a service's source is not evidence that the service
   serves that content — the build may not put it there. I inferred impact from a
   code path instead of measuring it, and stated it three times before one curl
   disproved it. When a finding's severity depends on "this code runs in
   production", prove THAT first, before writing the severity down.

2. **After changing a resource, still ask what could BLOCK it.** The instinct was
   right even though this instance was inert: a correct link that a policy layer
   refuses fails silently and looks identical to no change at all. Keep the
   question; just verify the answer before assigning it a severity.

3. **Two policies that disagree are worse than one.** When a permissive config is
   advisory and a restrictive one is law, everyone reasons about the wrong file.
   Find out which one actually enforces before trusting either.

4. **"Is a bug" and "is causing harm" are different claims — do not merge them.**
   Permitting font files while blocking the stylesheet that references them is
   not a policy anyone writes on purpose, so the contradiction really was a
   finding. But I reported it at the severity of an active outage when it was
   dormant config. State the defect and its measured blast radius separately.

5. **Check whether the "API" service also serves the front end — by asking it,
   not by reading it.** One static-file middleware call made me believe it did.
   One HTTP request showed it does not.

6. **Verify a third-party URL before committing it.** Both new font URLs were
   fetched and inspected first — status, and whether the response really served
   the variable ranges claimed. Cheap, and it turns an assumption into a fact.

## Bonus: the fix got cheaper by getting more correct
Switching to variable font ranges instead of a longer static weight list served
the intermediate weights the codebase actually asks for (650/720/750) AND reduced
the request count, because one variable file replaces five static faces. The
payload increase that was accepted as the cost of the fix never materialised.
Worth checking whether "more correct" is also "cheaper" before assuming a
trade-off exists.
