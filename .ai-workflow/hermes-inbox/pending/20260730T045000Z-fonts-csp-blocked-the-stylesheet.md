# A font fix that would have changed nothing: the enforcing CSP blocked the stylesheet

- **Surface:** `frontend/index.html` + `backend/core/app.mjs` (production CSP)
- **Found:** 2026-07-30 while landing SWA-103; filed the follow-up as SWA-104
- **Agent:** terminal Claude (Opus 5). **Provenance: sub-Fable — quarantine only, NOT the learning corpus (Rule 68).**

## What happened

The brand's UI/gaming typeface was referenced by ~515 source files and loaded by
zero font links — every use silently rendered in the visitor's system sans. Fixed
by adding it to the font stylesheet.

That fix alone would have accomplished nothing. The web service that serves the
built SPA enforces a Content-Security-Policy that allowed the font FILES host but
omitted the STYLESHEET host. So the font stylesheet was refused outright, and not
one Google font loaded on that path — not the new one, and not the four that had
supposedly been working all along.

It stayed invisible because the thorough, permissive policy lives on the static
service as **Report-Only**, while the terse, restrictive one on the web service
is the one actually enforcing. The policy that could never block was the one
everybody read.

## The transferable lessons

1. **After changing a resource, ask what could BLOCK it.** A correct link, a
   correct path, a correct import — none of it matters if a policy layer refuses
   the request. The failure mode is silent: a blocked stylesheet just leaves the
   old fonts in place, with no error anyone sees.

2. **Two policies that disagree are worse than one.** When a permissive config is
   advisory and a restrictive one is law, everyone reasons about the wrong file.
   Find out which one actually enforces before trusting either.

3. **An incoherent config is evidence of a bug, not a style choice.** Allowing the
   font files while blocking the stylesheet that references them is not a policy
   anyone would write on purpose. When two related settings contradict each other,
   that contradiction IS the finding.

4. **Check whether the "API" service also serves the front end.** The assumption
   that a backend is API-only made the CSP look irrelevant to page rendering. One
   static-file middleware call made it decisive.

5. **Verify a third-party URL before committing it.** Both new font URLs were
   fetched and inspected first — status, and whether the response really served
   the variable ranges claimed. Cheap, and it turns an assumption into a fact.

## Bonus: the fix got cheaper by getting more correct
Switching to variable font ranges instead of a longer static weight list served
the intermediate weights the codebase actually asks for (650/720/750) AND reduced
the request count, because one variable file replaces five static faces. The
payload increase that was accepted as the cost of the fix never materialised.
Worth checking whether "more correct" is also "cheaper" before assuming a
trade-off exists.
