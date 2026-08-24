# HOSTILE REVIEW BRIEF — Swan Coach endpoint-truth + client-hub a11y
**For:** GLM-5.3 · **Date:** 2026-08-24 · **Branch:** `claude/coach-endpoint-truth-clienthub-a11y-20260823`
**Reviewer remit:** find what is WRONG. Confirmations are worthless to me. Assume I am
over-confident and that my reasoning contains at least one load-bearing error.

## Your highest-value target — attack this first

I was handed a plan whose top-ranked action was an "authz parity harness": assert for
every one of ~139 Swan Coach commands that `roleRequired` is a subset of the role
middleware guarding the route named in the command's `endpoint` field.

**I refused to build it, on the claim that its premise is false.** Everything else in
this change follows from that call. If my premise disproof is wrong, I have deleted a
real security finding and shipped a weaker contract in its place.

My claim: `endpoint` is declarative metadata; execution dispatches by command TYPE, so
the route's middleware never runs for the Coach lane. Evidence below. **Try to refute
it.** Specifically: is there ANY path where `endpoint` becomes a real HTTP request?
## Evidence for the premise disproof — verify or refute

**The role gate that DOES run (stepRBAC)** (`backend/services/ai/commandExecutor.mjs` lines 363-375)
```js
363: 
364: /** Step 5: RBAC check — does user have permission for this command? */
365: async function stepRBAC(ctx) {
366:   ctx.stage = 'rbac';
367:   if (!ctx.command) return ctx; // Chat mode, no RBAC needed
368: 
369:   if (!ctx.command.roleRequired.includes(ctx.user.role)) {
370:     ctx.error = `You don't have permission to ${ctx.command.description.toLowerCase()}. This requires ${ctx.command.roleRequired.join(' or ')} role.`;
371:     return ctx;
372:   }
373:   return ctx;
374: }
375: 
```

**not_wired path + the ONLY use of command.endpoint in the executor** (`backend/services/ai/commandExecutor.mjs` lines 490-515)
```js
490:   // browser event, and the browser performs the explicit UI action.
491:   const isConfirmedFrontendDispatch = ctx.command.method === 'FRONTEND_DISPATCH' && ctx.command.frontendEvent;
492:   const isConfirmedDebate = Boolean(debateTypeForCommand(ctx.command));
493:   if (!hasDispatcher(ctx.command.type) && !isConfirmedFrontendDispatch && !isConfirmedDebate) {
494:     const manualOnly = getManualOnlyCommand(ctx.command.type);
495:     ctx.result = {
496:       type: 'not_wired',
497:       command: ctx.command.type,
498:       manualOnly: Boolean(manualOnly),
499:       reason: manualOnly?.reason || null,
500:       message: manualOnly
501:         ? `"${ctx.command.description}" is recognized but requires a manual admin workflow: ${manualOnly.reason}. No data was changed.`
502:         : `"${ctx.command.description}" is recognized but not yet wired for execution. No data was changed.`,
503:     };
504:     ctx.skipRemainingSteps = true;
505:     return ctx;
506:   }
507: 
508:   // For destructive ops, prepare HMAC-signed operation
509:   if (ctx.command.destructive) {
510:     const pending = prepareDestructiveOperation({
511:       type: ctx.command.method === 'DELETE' ? 'DELETE' : 'UPDATE',
512:       endpoint: ctx.command.endpoint,
513:       commandParams: ctx.intent.params,
514:       commandType: ctx.command.type,   // exec-substrate-v9: signed in HMAC payload
515:       userId: ctx.user.id,
```

**hasDispatcher — dispatch is by command TYPE** (`backend/services/ai/commandDispatcher.mjs` lines 338-350)
```js
338: 
339: /**
340:  * Check whether a command type has a registered dispatcher handler.
341:  * Used by stepConfirmation to decide whether to mint a real operationId
342:  * or return an honest 'not_wired' response.
343:  *
344:  * @param {string} commandType
345:  * @returns {boolean}
346:  */
347: export function hasDispatcher(commandType) {
348:   return DISPATCHERS.has(commandType);
349: }
350: 
```

**dispatchScheduleSession — the "drift" example, which asserts trainer-or-admin itself** (`backend/services/ai/dispatchers/scheduleWriteDispatchers.mjs` lines 113-130)
```js
113: export async function dispatchScheduleSession(params, ctx) {
114:   assertTrainerOrAdmin(ctx);
115: 
116:   const client = await resolveClient(resolveCommandClientId(params, ctx));
117:   const Session = getSession();
118:   const sessionDate = buildDateTime(params.date, params.time);
119:   const duration = clampDuration(params.duration);
120:   const endDate = new Date(sessionDate.getTime() + duration * 60000);
121:   const trainerId = ctx.user.role === 'trainer'
122:     ? ctx.user.id
123:     : await resolveTrainer(params.trainerId);
124: 
125:   await assertNoScheduleConflict(Session, {
126:     clientId: client.id,
127:     trainerId,
128:     sessionDate,
129:     endDate
130:   });
```

**endpoint IS HMAC-signed (this is why its truthfulness matters at all)** (`backend/services/ai/destructiveOperations.mjs` lines 30-45)
```js
30: function signOperation(op) {
31:   const payload = JSON.stringify({
32:     id: op.id,
33:     type: op.type,
34:     endpoint: op.endpoint,
35:     commandType: op.commandType,  // exec-substrate-v9: included so tampering with commandType fails verification
36:     params: op.params,
37:     createdBy: op.createdBy,
38:   });
39:   return crypto.createHmac('sha256', OPERATION_SECRET).update(payload).digest('hex');
40: }
41: 
42: function verifySignature(op) {
43:   const expected = signOperation(op);
44:   return crypto.timingSafeEqual(Buffer.from(op.signature, 'hex'), Buffer.from(expected, 'hex'));
45: }
```

**Grep I ran:** `grep -rn "\.endpoint" backend/services/ai/ backend/routes/aiCommandRoutes.mjs`
→ only the executor line above, the destructiveOperations signing and recording lines, an unrelated
`model.endpoint`, and `ctx.command.frontendEvent || ctx.command.endpoint` as a response label.

**What I did NOT audit (say so if this matters):** I did not trace every one of the 112
wired dispatchers. I read 3 (`dispatchScheduleSession`, `dispatchListActiveClients`,
`dispatchViewClientProfile`) and generalised. If even one dispatcher performs an internal
HTTP call to its own `endpoint`, my premise is wrong for that command.
## Second target — the route-table extractor's model of Express
I wrote a static extractor and then asserted absence claims from it. If its model of
Express is wrong, every absence claim is unsound.

**Extractor blueprint + stated limits** (`backend/tests/helpers/routeTable.mjs` lines 1-46)
```js
1: /**
2:  * routeTable.mjs — mount-resolved Express route extraction
3:  * ========================================================
4:  * Blueprint
5:  * ---------
6:  * PURPOSE   Build the real, mount-resolved route table of the Express app by static
7:  *           analysis, so contract tests can ask "which roles can actually reach
8:  *           METHOD /api/x/y?" without booting the server or a database.
9:  *
10:  * WHY STATIC
11:  *           Booting `setupRoutes(app)` requires a live DB, Redis, Stripe keys and
12:  *           ~200 module side effects. A contract test must run in CI with none of
13:  *           those. Static extraction is the only option that stays hermetic.
14:  *
15:  * THE TRAP THIS EXISTS TO AVOID (recorded 2026-08-23)
16:  *           A previous attempt matched command endpoints against route paths by
17:  *           STRIPPING the `/api/x` prefix and comparing tails. That produced ~23
18:  *           false positives (e.g. `/api/pain-entries/:userId` "matching"
19:  *           `videoLibraryRoutes GET /:id`). Tail-matching is unsound: it discards
20:  *           exactly the information — the mount prefix — that disambiguates
21:  *           routers. This module resolves `app.use(prefix, router)` prefixes and
22:  *           joins them to router-level paths (CLAUDE.md Rule 31, route ownership).
23:  *
24:  * EXPRESS SEMANTICS MODELLED
25:  *   1. Mount order matters. `app.use('/api/workout', a)` declared before
26:  *      `app.use('/api/workout/sessions', b)` means a request for
27:  *      `/api/workout/sessions/x` is offered to `a` FIRST; `a` falls through to `b`
28:  *      only by calling next() when no route in `a` matches. The effective handler
29:  *      for a path is therefore the FIRST mount-order match, not any match.
30:  *   2. `router.use(mw)` with no path applies to every route declared AFTER it in
31:  *      the file, not to the whole file. Line order is tracked.
32:  *   3. One router may be mounted at several prefixes (e.g.
33:  *      `/api/client-trainer-assignments` and `/api/assignments`). Every mount
34:  *      yields its own set of full paths.
35:  *   4. Stacked role gates INTERSECT. `protect, adminOnly` then a route-level
36:  *      `authorize(['admin','trainer'])` still admits only admin.
37:  *
38:  * KNOWN LIMITS (explicit on purpose — silence reads as absence to a reviewer)
39:  *   - Sub-routers mounted inside a router via `router.use('/p', child)` are
40:  *     resolved one level deep; deeper nesting is not followed.
41:  *   - Dynamically built paths (template literals, variables) are not resolved and
42:  *     are reported in `unresolved` rather than silently dropped.
43:  *   - Role semantics come from ROLE_GATES below. An unrecognised middleware name
44:  *     is treated as NOT a role gate and is counted in `unknownGates`, so a new
45:  *     gate cannot silently widen access without this table noticing.
46:  */
```

**pathMatches / resolveRoute — first-mount-order-match wins** (`backend/tests/helpers/routeTable.mjs` lines 200-240)
```js
200: 
201:     const pushRoute = (method, subPath, middleware, line, routerFile, alias) => {
202:       const ceiling = roleCeiling([...appLevel, ...middleware], alias);
203:       for (const name of ceiling.unknown) unknownGates.set(name, (unknownGates.get(name) ?? 0) + 1);
204:       const full = joinPath(prefix, subPath);
205:       table.push({
206:         method,
207:         path: full,
208:         segs: segments(full),
209:         allowedRoles: ceiling.allowedRoles,
210:         authRequired: ceiling.authRequired,
211:         mountPrefix: prefix,
212:         routerFile,
213:         line,
214:         middleware,
215:       });
216:     };
217: 
218:     for (const r of parsed.routes) pushRoute(r.method, r.subPath, r.middleware, r.line, rel(abs), parsed.alias);
219: 
220:     for (const sm of parsed.subMounts) {
221:       const childId = sm.args[sm.args.length - 1]?.trim();
222:       if (!childId || !/^[A-Za-z_$][\w$]*$/.test(childId)) continue;
223:       const childRel = parsed.imports.get(childId);
224:       if (!childRel) continue;
225:       const childAbs = path.resolve(path.dirname(abs), childRel);
226:       if (!fs.existsSync(childAbs)) continue;
227:       const child = parseCached(childAbs);
228:       for (const r of child.routes) {
229:         pushRoute(
230:           r.method,
231:           joinPath(sm.mountPath, r.subPath),
232:           [...sm.inherited, ...sm.args.slice(0, -1), ...r.middleware],
233:           r.line,
234:           rel(childAbs),
235:           new Map([...parsed.alias, ...child.alias])
236:         );
237:       }
238:     }
239:   }
240: 
```

**Role semantics table (authorize unions admin; requireAnyRole does NOT)** (`backend/tests/helpers/roleGates.mjs` lines 16-60)
```js
16: 
17: /**
18:  * Role semantics of each known gate, read from backend/middleware/authMiddleware.mjs.
19:  *
20:  * NOTE the asymmetry, which is real and load-bearing:
21:  *   - authorize([...])    -> roles UNION {admin}  (admin is a universal override, line 472)
22:  *   - requireAnyRole(...) -> roles exactly        (NO admin override, line 559)
23:  */
24: export const ROLE_GATES = {
25:   adminOnly: ['admin'],
26:   admin: ['admin'],
27:   isAdmin: ['admin'],
28:   authorizeAdmin: ['admin'],
29:   trainerOnly: ['trainer'],
30:   clientOnly: ['client', 'user', 'admin'],
31:   trainerOrAdminOnly: ['trainer', 'admin'],
32:   adminOrTrainerOnly: ['trainer', 'admin'],
33:   // Defined separately in backend/middleware/adminMiddleware.mjs:22-38
34:   // (`req.user.role === 'admin'` or 403). Same ceiling as adminOnly, different module.
35:   requireAdmin: ['admin'],
36: };
37: 
38: /**
39:  * Middleware that authenticate but impose no role ceiling.
40:  * `authenticateToken` is a re-export of `protect` (backend/middleware/auth.mjs:173).
41:  */
42: export const AUTH_ONLY = new Set([
43:   'protect',
44:   'authenticate',
45:   'authenticateToken',
46:   'requireAuth',
47:   'optionalAuth',
48:   'verifyToken',
49: ]);
50: 
51: const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'];
52: 
53: 
54: /**
55:  * Interpret one middleware argument into a role constraint.
56:  * Returns { kind: 'roles', roles } | { kind: 'auth' } | { kind: 'none' } | { kind: 'unknown', name }
57:  */
58: export function classifyMiddleware(arg, alias = new Map(), depth = 0) {
59:   let text = arg.trim();
60: 
```

**Why the scanner must understand regex literals** (`backend/tests/helpers/sourceScan.mjs` lines 1-30)
```js
1: /**
2:  * sourceScan.mjs — JavaScript source scanning primitives for route extraction
3:  * ===========================================================================
4:  * Blueprint
5:  * ---------
6:  * PURPOSE   The lexical layer under routeTable.mjs: strip comments, walk balanced
7:  *           brackets, split call arguments, and read import/const alias bindings.
8:  *           Split out of routeTable.mjs to keep every file under the 300-line cap
9:  *           (CLAUDE.md Rule 4).
10:  *
11:  * WHY IT IS FUSSIER THAN IT LOOKS
12:  *           These helpers must survive real source, not idealised source. Regex
13:  *           literals containing quotes, template literals containing `//`, and
14:  *           escaped characters inside strings have all appeared in this codebase's
15:  *           route files, and each one can silently truncate the scan. A truncated
16:  *           scan loses routes, and a route table that loses routes turns every
17:  *           "this endpoint does not exist" claim into a possible false positive.
18:  */
19: import fs from 'fs';
20: 
21: /**
22:  * Can a `/` at this point start a regex literal rather than be a division operator?
23:  * Standard heuristic: a regex may follow an operator, an opening bracket, a comma,
24:  * or a keyword — but not an identifier, a number, or a closing bracket.
25:  */
26: function regexCanFollow(out) {
27:   for (let i = out.length - 1; i >= 0; i--) {
28:     const c = out[i];
29:     if (c === ' ' || c === '\t' || c === '\n' || c === '\r') continue;
30:     if ('(,=:[!&|?{};+-*%~^<>'.includes(c)) return true;
```

**Attack these specifically:**
- `pathMatches` requires EQUAL segment counts. Express supports `/:id?` optional params
  and `/*` wildcards. I found 6 such routes and claimed none are Coach endpoints. Is the
  equal-length rule wrong in a way that produces a FALSE "route does not exist"?
- I claim stacked role gates INTERSECT. Is that right for Express in all orders?
- `authorize([...])` unions `admin` because of a universal override at authMiddleware:472,
  but `requireAnyRole` does not. Did I get that asymmetry backwards?
- Sub-routers are resolved ONE level. Could a 2-level mount hide a route and make an
  absence claim false?
## Third target — I deleted a security control labelled CRITICAL

**What replaced AI_ACTION_PERMISSIONS** (`backend/middleware/authMiddleware.mjs` lines 958-990)
```js
958:   }
959: };
960: 
961: // ─────────────────────────────────────────────────────────────
962: // SECTION: AI Action Authorization — WHERE IT ACTUALLY LIVES
963: //
964: // `AI_ACTION_PERMISSIONS` and `isAIActionAllowed` used to sit here, labelled
965: // "AI Village CRITICAL — prevents AI prompt injection from escalating privileges".
966: // They were removed 2026-08-23 because NOTHING CALLED THEM. The only references in
967: // the entire repo were the definitions themselves and one test's vi.mock stub, and
968: // their action vocabulary (fill_own_forms / read_client_data / ...) never mapped to
969: // any of the ~139 command types the AI lane actually dispatches. It was a parallel
970: // design that was drafted and never wired.
971: //
972: // It was deleted rather than wired because a dead control is worse than an absent
973: // one: it answers "is this defended?" with a confident yes, and the next reviewer
974: // stops looking. Wiring it would have meant inventing a 139-command -> 6-verb
975: // mapping and failing closed on every gap — a live risk to the Coach lane in
976: // exchange for a second gate the first one already covers.
977: //
978: // AI action authorization is enforced, just not here:
979: //   - Role gate         backend/services/ai/commandExecutor.mjs  (stepRBAC)
980: //                       command.roleRequired vs the caller's role.
981: //   - Capability gate   stepCapabilityGate -> authorizeCommandCapability
982: //   - Client scoping    middleware/verifyClientAccess.mjs (assertAssignmentOrAdmin)
983: //                       plus per-dispatcher scoping, e.g. dispatchListActiveClients
984: //                       joins ClientTrainerAssignment for trainers.
985: //   - Destructive ops   services/ai/destructiveOperations.mjs — single-use,
986: //                       120s TTL, ownership check, HMAC-signed payload.
987: //   - Transport         routes/aiCommandRoutes.mjs:154 — protect, kill switch,
988: //                       rate limiter, audit, PII sanitizer.
989: //
990: // If a second, action-verb-shaped gate is ever wanted, add it there and give it
```

It had zero production consumers (only its own definition + one test's `vi.mock` stub).
I deleted it rather than wiring it, arguing a dead control is worse than an absent one.

**Attack:** was deletion the wrong call? Is there a cheap correct wiring I dismissed too
fast? Does removing the export break anything at runtime that tests would not catch?
## Fourth target — the accessibility fix

**Loading region — aria-busy deliberately NOT here** (`frontend/src/components/DashBoard/workspaces/ClientsWorkspace.view.tsx` lines 235-252)
```js
235: );
236: 
237: const DetailContent: ContentRenderer = (props) => <SelectedClientDetail {...props} />;
238: // role=status + aria-live make the pulse announce itself; without them a roster
239: // fetch is silent to a screen reader. aria-busy is deliberately NOT set here: this
240: // node unmounts rather than flipping busy to false, and a live region left busy can
241: // have its announcement dropped. aria-busy lives on ContentArea, which persists.
242: const LoadingContent: ContentRenderer = () => (
243:   <LoadingPulse role="status" aria-live="polite">
244:     Loading clients...
245:   </LoadingPulse>
246: );
247: const EmptyContent: ContentRenderer = (props) => {
248:   const config = getClientHubAudienceConfig(props.audience ?? 'admin');
249:   return (
250:     <ClientsWorkspaceEmptyState
251:       copy={config.emptyRosterCopy}
252:       showCreateActions={config.canManageAccounts}
```

I put `role="status" aria-live="polite"` on the transient pulse and moved
`aria-busy={props.loading}` onto the persistent `ContentArea`, arguing that `aria-busy="true"`
on a node that unmounts (rather than clearing) can suppress the announcement.

**Attack:** is that ARIA reasoning actually correct, or did I invent a plausible rule?
Cite the spec if I am wrong. Also: is `role="status"` + `aria-live="polite"` redundant or
harmful together?

## Fifth — scope/blast radius
- Deleted a 31-file legacy `TrainerDashboard/ClientManagement/` tree (unmounted).
- Cut `frontend/src/config/dashboard-tabs.ts` from 241 to 120 lines (3 tab configs + 2
  types, zero importers outside the file).
- Removed a `TrainerVideosPage` lazy export.
**Attack:** what breaks that a green test suite would not reveal?

## What I already know is imperfect — do not spend time here
- 4 commands still declare endpoints that resolve to no route; pinned deliberately, since
  inventing a REST path for a lane-internal command would be fiction.
- Two flaky tests observed (one frontend, one backend), both pass in isolation and did not
  recur across repeated full runs. Not fixed; reported.
- The static-intelligence gate (fallow) is NOT installed, so that gate is [UNKNOWN].

## Verification already done (tell me what this does NOT prove)
- `tsc --noEmit` exit 0, 0 errors. `vite build` exit 0.
- Full frontend: 1584 files / 8025 tests pass.
- Full backend: failing-file set BYTE-IDENTICAL to `known-failing-baseline.json` (23 files).
- All 11 new route/endpoint assertions mutation-tested and restored byte-identical.

## Output I want
Ranked findings, most severe first. For each: the specific claim of mine that is wrong,
the evidence, and what it breaks. If you cannot refute the premise disproof, say so
plainly and move on — I do not want padding.
