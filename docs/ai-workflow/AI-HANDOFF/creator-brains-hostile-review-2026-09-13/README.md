# Creator Brains hostile review and builder fix packet

Date: 2026-09-13. Owner: Sean. Reviewer: current Codex session. Version: 1.
Status: **REVISE**. Scope: independent review and synthetic diagnostics; no engine repairs.
This is an evidence addendum to [the governing engine blueprint](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md), not a replacement plan. Preserve that blueprint and its history when incorporating these findings.

## Plain-English Summary

The acquisition prototype is real, but **“built and verified” overstates the result**. Existing tests pass while the software can overwrite damaged state, exceed its supposed hourly budget, fetch a different creator from the one requested, merge contradictory advice into a doctrine, and retain claims whose source document is gone.

Independent diagnostic runs reproduced **24 invariant violations across HR01–HR21**. These are synthetic local reproductions, not claims that the user's real archive suffered these failures. HR22–HR26 add verified source/contract/evidence gaps requiring repair or explicit scope reconciliation.

The two design choices need different judgments:

- **Deterministic extraction:** acceptable for a free candidate-extraction lane, but the current output loses polarity, conditions and context. “Cannot invent a rule” is false: always/never become the same rule. Do not expose these fragments as trusted rules/doctrines. Fix semantic fidelity and label uncertain output; an LLM is not required to fix the basic negation defect.
- **Lexical search:** acceptable for an explicitly limited acquisition prototype. It does not fulfill the upstream semantic retrieval requirement. Local hybrid indexing over valid derived rows remains necessary for that outcome; embeddings cannot repair a row whose meaning was already destroyed.
- **OAuth:** the missing credential is only one blocker. The actual exchange is unimplemented. Supplying a client file will not make the documented workflow work.
- **Recovery incident:** passing tests after rebuilding a deleted source file proves only those assertions. It does not prove behavioral equivalence to the lost implementation or establish a backup.

## Technical Summary and evidence

| Claim/check | Current result |
|---|---|
| Exact checkout | `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT` |
| Mounted task folder | `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`; no Git repository here |
| Source branch / HEAD | `wip/comms-notifications-2026-07-05` / `fbca1bb2bd010b467d44c7b175cbfab74982a86e` |
| Working tree | 963 status entries at intake; all 31 engine files untracked; unrelated changes preserved |
| Review preservation | 35 files copied and SHA-256 compared: 31 engine files, three swan-scout dependencies, governing blueprint; [manifest](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/source-manifest.json) |
| Existing offline suite | **54 PASS, 4 live tests SKIPPED**, Node v24.19.0, [log](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/baseline-offline.txt) |
| Offline qualification | Unmodified invocation stalled in tool discovery and was interrupted. Passing run used `CREATOR_BRAINS_YTDLP=node.exe` solely for the version lookup; injected acquisition fixtures remained in use. This is no proof of yt-dlp availability. |
| New main diagnostics | **20 violations reproduced**, exit 1 intentionally; [receipt](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/diagnostic-results.json), [output](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/diagnostics-output.txt) |
| New transport/process diagnostics | **4 violations reproduced**, exit 1 intentionally; actual parser/argv path with synthetic subprocess output, plus two real local Node processes for run IDs; [receipt](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/transport-results.json) |
| Stored demo metadata | `.ai-workflow/creator-brains-demo`: 979 state rows; 13 fetched, 2 no_track_retry, 964 pending; 13 documents; one rules file with 146 rows |
| Original live results | Historical claim only; no YouTube fetch or authenticated OAuth run repeated by this review. Stored counts do not prove cue accuracy or completeness. |
| “11/11 mutations killed” | Not independently rerun. Blueprint's mutation table lists M1–M6 and an M3 rerun; it does not itself supply reproducible evidence for eleven distinct killed mutations. |
| Review authority | This is the requested Codex hostile review. No GLM/Flash dispatch, subscription spend, workflow advancement, commit, push, deployment, scheduler registration, real-vault publication or production-data mutation. |
| Graph/native workflow | No root `graphify-out/graph.json` available. Source paths were traced directly. No task-bound native freeze/enforcement or automatic vault-hook execution is claimed. |

The original source and plan were left unchanged. The copied snapshot is the stable line-level review baseline if the builder changes the live tree.

## Reproduced findings and required fixes

### HR01 — P1 — The rolling-hour budget resets on every invocation

Source: [lib/ledger.mjs:40](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/ledger.mjs:40), [lib/run.mjs:157](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/run.mjs:157).
Probe: two runs at the same clock with cap 1 each fetch one video: **2 fetches inside a 1/hour limit**. `ledger.jsonl` contains summaries, but admission never reads prior reservations.

**Fix:** persist timestamped reservations before network work; admit under the store lock from HR14; share the budget across CLI, scheduled runs and processes. Define whether the cap counts videos, transport operations or actual requests. Account for discovery and canary traffic separately and visibly. Validate the cap as a finite positive integer; reject `Infinity`, negative, missing and malformed values rather than coercing them. Add pacing/jitter as separately configured behavior, because a maximum count is not pacing.

**Acceptance:** cap 1 permits one operation across two processes/restarts in an hour; next admission succeeds only after expiry; crash after admission cannot erase the reservation; malformed budget state fails closed. Include zero, NaN, Infinity, clock changes and exhausted-cap receipts.

### HR02 — P1 — `fetch <channel_id>` ignores its selected creator

Source: [cli.mjs:123](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/cli.mjs:123).
Probe: requested Alpha; both Alpha and Beta were probed. `targets` is computed and then discarded when `runDaily` reloads all enabled creators.

**Fix:** pass a validated explicit channel selection to the runner and intersect with the current enabled registry under the same ownership/lock policy. Reject a specified disabled creator. Parse positional arguments independently of flag order; `fetch --per-hour=1 <id>` must not expand to everybody.

**Acceptance:** with two enabled creators, fetching A never probes, reserves budget for, or mutates B. Test reversed flag order, unknown IDs, and an explicit disabled target.

### HR03 — P1 — CLI fetch returns success after its fetch phase fails

Source: [cli.mjs:139](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/cli.mjs:139).
Probe: stdout reported **failed 2**, but the command returned **0**. The correction to `record.ok` never reached this caller.

**Fix:** derive the command exit from the actual run/phase verdict; distinguish a successful no-op, intentional deferral, failure and preflight rejection consistently across entry points.

**Acceptance:** test the real CLI process exit, not just `runDaily`: all failed, mixed success/failure, exhausted budget, corrupt store and empty pending queue. No command may print successful completion for failed work.

### HR04 — P1 — Corruption protection is syntax-only and bypassable

Source: [lib/store.mjs:78](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/store.mjs:78), [lib/store.mjs:234](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/store.mjs:234), [lib/discover.mjs:69](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/discover.mjs:69).
Probes: a `state.json` containing valid JSON `null` became an empty state map in a green daily run. Direct `discoverChannel` also replaced an unparseable `{bad` file with an empty map.

**Fix:** one strict schema-validated store reader used by every command and helper. Validate version, map shapes, row IDs/channel binding, enums, finite timestamps and attempt counts. Distinguish absent-new-store from unreadable/corrupt/unsupported-version. Never write a fallback over existing data. Provide explicit recovery from a verified snapshot, not “move it aside and start fresh” as the normal recovery.

**Acceptance:** null, arrays, scalars, missing maps, invalid rows, unsupported versions, truncation and read-denied errors preserve original bytes and produce named failures through daily, discover, build, status and query as applicable.

### HR05 — P1 — A corrupt creator registry becomes an empty success and can be overwritten

Source: [lib/store.mjs:40](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/store.mjs:40), [lib/run.mjs:114](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/run.mjs:114), [lib/registry.mjs:104](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/registry.mjs:104).
Probe: unreadable registry produced `run.ok=true`; adding Beta replaced the damaged registry. This can lose owner selections, names and discovery bookkeeping.

**Fix:** apply strict fail-closed reads to the registry too. A catalog with owner-controlled enable choices is authoritative state, not a disposable cache. Make all upserts/enable/sync changes transactional with validation and preservation.

**Acceptance:** corrupt registry blocks acquisition and catalog writes, reports a durable failure and remains byte-identical. A genuinely new empty registry remains a valid first-run case.

### HR06 — P1 — Opposing advice is collapsed into one recurring doctrine

Source: [lib/lexicon.mjs:131](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/lexicon.mjs:131), [lib/extract.mjs:169](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/extract.mjs:169).
Probe: “always blur the tear trough crease before retouching portraits” and “never blur…” both become `directive — blur tear trough crease retouching portraits`. They are promoted to a two-video doctrine with **no conflict**.

**Fix:** retain polarity, action, applicable condition and attribution separately from search keywords. Do not strip modality-bearing tokens. Extract from a bounded supported span that can cross cue boundaries, not an isolated ASR line. If semantic support is insufficient, emit a candidate with uncertainty or abstain. Group doctrines only across compatible assertions; retain opposing evidence and dates. Never use recurrence of a bag of words as evidence that the creator endorses a rule.

**Acceptance:** always/never, do/don't, recommend/avoid, quoted bad advice, “I used to… but now…,” condition changes, negation split across cues and overlapping captions all preserve meaning or abstain. A reviewer can recover the supporting source span and distinguish candidate from validated rule.

### HR07 — P1 — Normal creator names still collide and overwrite another brain

Source: [lib/extract.mjs:59](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/extract.mjs:59).
Probe: two distinct channels named “Common Name” write the same directory; Alpha's searchable claims disappear after Beta renders. The non-Latin-only fallback did not fix general uniqueness.

**Fix:** use full canonical channel ID as the immutable storage namespace. Treat display names/slugs as labels or aliases only. If readable prefixes are retained, append the complete case-preserved ID; an eight-character lowercased fragment is not an identity guarantee. Migrate existing directories with ownership checks and a manifest; do not guess ownership or delete ambiguous artifacts.

**Acceptance:** same names, punctuation-equivalent names, 60-character prefix collisions, renames, non-Latin names and equal ID prefixes remain isolated; each exported filename and rule row binds to one creator.

### HR08 — P1 — Missing source documents do not recover; their old claims survive

Source: [lib/pipeline.mjs:93](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/pipeline.mjs:93), [lib/pipeline.mjs:156](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/pipeline.mjs:156), [lib/run.mjs:190](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/run.mjs:190), [lib/export.mjs:124](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/export.mjs:124).
Probe: remove the creator's only document after building. Next run: **ok=true, built=0, zero probes, one old searchable claim, five old staged files**. `fetched` prevents repair; the empty-brain early return prevents invalidation.

**Fix:** reconcile stored state against validated documents before scheduling. Allow an explicit missing/corrupt-document repair transition. Publish a valid empty generation when necessary, invalidate dependent rules and update a citation-status manifest. Query/export must consume only a committed current generation. Reap only historically owned stale artifacts using the prior manifest, including removed/renamed creator namespaces; the current-slug list cannot identify old slugs. Mark upstream-deleted citations as dead while preserving the private archive. Implement the upstream deletion cascade as an explicit owner action, separate from merely disabling acquisition.

**Acceptance:** removing/corrupting the last or one of several docs, deleting a source upstream, removing a creator and renaming a creator cannot leave apparently supported stale claims. Foreign files survive cleanup. An interrupted build/export exposes either the prior complete generation or the new complete generation, never a mixture.

### HR09 — P1 — The “seven-word cap” still permits long verbatim runs

Source: [lib/lexicon.mjs:107](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/lexicon.mjs:107), [lib/render.mjs:96](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/render.mjs:96).
Probe: seven hyphenated tokens become **14 consecutive normalized source words** in the claim and export. A twelve-word creator title is also copied verbatim into headers. Gap reasons and other metadata bypass phrase caps.

**Fix:** centralize the actual shared-boundary check over the final serialized outputs with consistent Unicode/punctuation normalization. Validate every creator-controlled field and errors, not just key phrases or video titles. Handle approved technical terms according to the upstream policy. Keep source comparison in the private validation stage; publish a hash-bound validated generation for query/export. Reject/quarantine nonconforming output before replacing a good generation. Restrict export to validated regular files under owned paths; filename allowlisting or absence of a `store.mjs` import is not a content/trust boundary.

**Acceptance:** hyphens, apostrophes, punctuation, line breaks, Unicode, titles, handles, error strings and concatenated fields cannot evade the exact n-gram policy. Include poisoned derived rows and link/reparse-point handling. Describe the cap as an internal policy control, not a legal certification.

### HR10 — P1 — OAuth is unimplemented, not simply awaiting credentials

Source: [lib/subs.mjs:116](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/subs.mjs:116).
Probe: a valid synthetic desktop credential returns `oauth_exchange_not_implemented`. CLI never supplies `deps.listSubscriptions`, no default exists, and daily has no subscription-sync phase.

**Fix:** correct README/blueprint status immediately. Implement the authorized OAuth lane as a distinct slice: desktop consent, state/PKCE, loopback callback, bounded timeout/cancel, secure token persistence, refresh/revocation handling, paginated `subscriptions.list`, and a real default adapter. Separate interactive authorization from noninteractive daily refresh. A complete validated catalog snapshot is required before marking any creator unsubscribed; invalid rows, duplicate/repeating cursors and partial pages must not masquerade as authoritative absence.

**Acceptance:** first consent/cancel/timeout, refresh, expiry/revocation, >50 subscriptions, failure after page one, valid zero subscriptions, malformed response and preserving disabled/manual creators. No secrets in argv, logs, errors or artifacts. Until real authorization is completed, mark live sync BLOCKED and implementation status honestly.

Google confirms the seven-day Testing limit for external apps using scopes beyond basic identity; that fact does not supply the missing code or make refresh failure invisible by necessity. [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2), [desktop PKCE guidance](https://developers.google.com/identity/protocols/oauth2/resources/best-practices).

### HR11 — P2 — Transcript idempotency ignores timings and trusts the stored hash

Source: [lib/store.mjs:120](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/store.mjs:120).
Probe: same text with cue time changed from 1s to 9s is not written. Tamper the prior text but keep its `contentHash`; a correct refetch still reports unchanged and retains the damaged text.

**Fix:** hash/validate a canonical document payload including cue text/timings, language, source identity and schema version; recompute the old digest before trusting it. Separate source-content identity from fetch metadata. Revision history must state what it preserves; hash-only capped history is not recovery of previous bytes. Decide/version archival retention explicitly.

**Acceptance:** timing-only, cue segmentation, language/provenance changes and tampered bytes are detected; unchanged valid documents are no-ops. Every rule binds to the exact document generation it was extracted from.

### HR12 — P1 — Invalid or incomplete enumeration becomes a deletion verdict

Source: [lib/enumerate.mjs:29](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/enumerate.mjs:29), [lib/discover.mjs:72](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/discover.mjs:72).
Probe: a title with an embedded tab makes the row parser drop the video; two such zero-row results mark a fetched video `deleted_upstream`. “Two observations” does not make an unverified enumeration complete.

**Fix:** use escaped structured records. Return an explicit result with rows, completeness, cursor/continuation state, invalid-row count and reason. Preserve stderr warnings. Empty/partial/shape-invalid output must never update the completeness checkpoint or increment deletion confirmations. An absence from even a complete catalog indicates “not currently listed”; require stronger availability evidence before claiming deletion.

**Acceptance:** tabs/newlines in titles, invalid rows, null return, empty-but-successful process, partial continuations, aborted walks and private/member/region cases cannot fabricate deletion. Every omission decision names its authority.

### HR13 — P2 — Invalid timestamps become “verified” negative citation links

Source: [shared parser:56](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/swan-scout/yt-scout-transcript.mjs:56), [lib/fetch.mjs:128](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/fetch.mjs:128).
Probe: a cue at -9000ms is stored as `fetched` and produces `&t=-9s`. Missing/nonnumeric timings are also coerced to zero by the shared parser.

**Fix:** validate the acquisition document at the engine boundary. Require finite nonnegative timings, valid cue shape, ordering policy and sane duration bounds. Preserve start/end span information needed by the claim contract. Avoid breaking the existing scout parser's accepted behavior without separate regression analysis.

**Acceptance:** negative, infinite, NaN, missing, malformed and out-of-order times fail or follow an explicit validated policy; valid zero is retained. Check link time against the persisted cue, not just URL syntax.

### HR14 — P1 — No store writer lock; atomic rename does not prevent lost updates

Source: [lib/paths.mjs:113](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/paths.mjs:113), [lib/run.mjs:121](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/run.mjs:121), [lib/run.mjs:172](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/run.mjs:172).
Probes: concurrent runs fetch the same video twice. A second writer's newly added video disappears when the first run saves its stale in-memory map. All writes use the same `<path>.tmp` name as well.

**Fix:** one robust ownership/locking protocol covering acquisition, registry mutation, state, budget and generation publication. Use unique temporary names, durable journal/checkpoints and compare-and-swap/version checks as appropriate. A live or ambiguous lock owner must not be stolen solely by age. Ensure owner disable/kill-switch behavior during a long run is explicit; the existing one-time enabled snapshot cannot serve as an immediate kill switch.

**Acceptance:** two real processes on one store, add/enable during acquisition, interruption before/after doc/state publication, stale/dead/ambiguous lock recovery and disk failure preserve accepted work and reservations. Test a real Windows process-kill/restart in an isolated store; do not substitute only a mocked exception.

### HR15 — P2 — “Disagreement” does not establish contradiction or distinct creators

Source: [lib/query.mjs:97](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/query.mjs:97).
Probe: one creator saying “always preserve texture…” and “be careful preserve texture…” produces a Disagreement section. The implementation compares modality labels under the first topic word.

**Fix:** remove categorical disagreement claims until a supported contradiction relation exists. Preserve separate evidence for compatible cautions, disagreements between creators and changes in one creator's stance. Tie comparison to action, object, condition and polarity, not modality alone.

**Acceptance:** compatible caution/directive produces no contradiction; different subjects sharing a keyword do not conflict; true opposing stances retain both citations and explicitly identify the creator/time relation.

### HR16 — P2 — The scheduled entry point omits run records on startup failures

Source: [run-daily.mjs:59](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/run-daily.mjs:59), [lib/run.mjs:172](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/run.mjs:172).
Probe: missing executable gives exit 2 with **no run record or digest**. No-enabled-creators also returns before recording. State-save/digest-save throws and hard interruptions are outside the phase wrapper's guarantee.

**Fix:** start a durable run journal before preflight and give the top-level runner ownership of finalization. Persist each completed operation/phase. Record startup/no-op/lock-blocked/interrupted outcomes; recover unfinished journals on startup. For an unwritable primary store, use an explicit bounded fallback log and nonzero exit. Keep the last successful acquisition time separately from last attempt; an independent status/staleness check must detect that no scheduler invocation happened at all.

**Acceptance:** missing tool, empty catalog, invalid registry, disk-full/write refusal, thrown callbacks, process kill and missed schedule all have truthful observable outcomes. A digest file by itself is not delivery to Hermes or proof of a scheduler.

### HR17 — P2 — Invalid documents disappear from the coverage-gap report

Source: [lib/extract.mjs:68](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/extract.mjs:68), [lib/extract.mjs:94](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/extract.mjs:94).
Probe: a present document with `cues: []` yields **docCount=1, covered=0, gaps=0**. Its ID is counted before validation.

**Fix:** compute coverage only from validated usable documents; record missing, unreadable, malformed and unsupported docs separately. Validate document channel/video identity against its namespace. Feed gap/error counts into phase and run health as well as Markdown.

**Acceptance:** empty cues, bad IDs, invalid text/hash/timing and unreadable files produce explicit coverage gaps, never “every discovered video has a transcript.”

### HR18 — P2 — Discovery guard checks ID existence but not channel or enable authority

Source: [lib/fetch.mjs:69](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/fetch.mjs:69).
Probe: B's discovered video supplied with creator A is fetched and saved under A. The guard accepts the video ID anywhere in the map.

**Fix:** bind the supplied video and creator to the authoritative state/registry row and enabled selection; validate IDs and contained paths before any network or file action. Require explicit, separate canary authority rather than defaulting the public fetch boundary to unrestricted mode. Do not trust caller-constructed `creator` objects as proof of ownership.

**Acceptance:** mismatched video ID/key/channel, disabled creator, forged map, invalid identifiers, path traversal and missing authority produce no network calls or writes. This probe demonstrates a library-boundary failure; it is not evidence of a public unauthenticated API.

### HR19 — P1 — The real probe still turns empty output into “no captions”

Source: [lib/probe.mjs:73](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/probe.mjs:73).
Probe uses the actual `probeSubs` and `fetchVideo` with a synthetic exit-0 empty subprocess: probe returns `ok:true, languages:[]`; two attempts reach terminal `unavailable`. T-26 catches an absent field, but the real adapter always creates the field.

**Fix:** parse a structured, explicit positive/negative answer. Empty, truncated or unrecognized output is `failed_transient/shape_error`, never no-track. Preserve original/manual/translated provenance and select a concrete proven track; an absent original marker must stay unverified in derived output too.

**Acceptance:** exit-0 empty output, banners-only, table-format changes, explicit no-track, valid track list, manual-only originals and translated-only choices pass through the real adapter/parser/runner boundary with the intended state.

### HR20 — P1 — Central subprocess controls do not establish the promised effects boundary

Source: [lib/ytdlp.mjs:155](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/ytdlp.mjs:155), [lib/enumerate.mjs:49](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/enumerate.mjs:49).
Probes: enumeration argv has neither `--ignore-config` nor central `--skip-download`; `runYtDlp(... '--format=best')` passes the guard. The explicit argv array prevents shell-string interpolation, but default yt-dlp configuration can still add effects. No ambient config exploitation or actual media download was performed.

**Fix:** construct commands from an allowlisted operation model; ignore ambient config, control plugin/config locations, pin the supported runtime and enforce skip/simulate semantics appropriate to each operation. Restrict output locations and accepted IDs/languages. Keep diagnostic execution bounded and preserve warning information. A blacklist of four exact spellings does not enforce a complete effect policy.

**Acceptance:** isolated test config with unrelated write/exec/cookie/proxy options has no effect; inline/combined media flags and unapproved output/config arguments are refused; no operation writes media or accesses ambient account material. Test actual pinned yt-dlp against local fixtures without downloading user content.

yt-dlp documents automatic configuration loading, `--ignore-config`, and tab-specific URLs. [Official yt-dlp documentation](https://github.com/yt-dlp/yt-dlp/blob/master/README.md#configuration).

### HR21 — P2 — Run IDs still collide across processes

Source: [lib/ledger.mjs:125](C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts/creator-brains/lib/ledger.mjs:125).
Probe: two separate Node processes at the same clock each emit `1970-01-01T00-00-00-000Z-001`. The counter fixes only same-process calls.

**Fix:** use a sortable timestamp plus cryptographically random UUID, exclusive creation and a preserved run identity from start through recovery. Locking alone does not make a timestamp/counter globally unique after a restart.

**Acceptance:** same clock in distinct processes and after restart cannot overwrite records or digests; repeated finalization of one known run remains idempotent.

## Additional source/contract repairs

### HR22 — P1 — “Every video / resumable high-water mark” is not implemented as claimed

Every canonical registry URL ends in `/videos`; that selects one channel tab and misses Shorts and live-stream history. The stored high-water mark is never used to resume or bound enumeration; each run walks the entire tab. The official tool documentation distinguishes a full channel URL from a tab URL. [yt-dlp YouTube behavior](https://github.com/yt-dlp/yt-dlp/blob/master/README.md#differences-in-default-behavior).

**Fix:** enumerate the full agreed upload corpus using a validated channel-wide/uploads mechanism or explicitly merge videos/shorts/streams. Preserve source channel identity and deduplicate by video ID. Implement resumable checkpoints and incremental discovery separately from periodic authoritative reconciliation, or explicitly rename the v1 scope and remove the “full/resumable” acceptance claim.

**Test:** fixtures with uploads spread across all three content types and >200 entries; interruption/resume with no gaps or duplicate work; actual supported-tool smoke for a public mixed-content channel. Merely finding 979 rows is not proof of completeness.

### HR23 — P1 — Backfill can starve daily updates; published timing is wrong for the documented schedule

`fetchPhase` sorts by oldest `discoveredAt`, so yesterday's newly discovered upload queues behind the entire old backlog. A once-daily run fetching up to 20 does not process 20 every hour: **4,000 videos takes roughly 200 daily runs**, ignoring retries, not 8.5 days. An enabled large channel can monopolize the cap. `runDaily` also continues network phases after the canary fails; there is no shared throttle/circuit breaker.

**Fix:** define separate bounded priorities for fresh uploads, retries and backfill, with fairness across creators. Persist budgets; implement an explicit per-run duration/work bound and shared response to throttling/system-wide failure. Decide an authorized scheduling cadence without silently increasing spend or rate. Provide operator-visible backlog age, oldest pending/newest processed, expected completion at the actual cadence and retry exhaustion/repair actions.

**Test:** a new upload plus a 4,000-item backlog is served within the stated freshness objective; every enabled creator advances; a global 429/bot-check blocks/defer subsequent traffic; manual/scheduled invocations cannot bypass the cap. Benchmark the real intended store size. Source includes no configurable 48-hour setting at the public runner/CLI despite that acceptance criterion; implement it or correct the contract.

### HR24 — P2 — The machine contract lacks the provenance needed to safely rebuild/query

`renderRules` writes unversioned rows without source generation hash, supported span end/offsets, validation status, original-track provenance or citation liveness. Query reads any parseable row; malformed JSONL lines/read errors become empty results, and removed source generations are not checked. The declared “chapter/topic map” is only a computed count of 90-second windows; actual chapters and topic windows are not emitted.

**Fix:** version and validate the derived contract. Include stable assertion identity, source doc revision, complete support coordinates, extractor version, original-language/provenance, validation state and citation status. Carry authority across the boundary without exposing transcript text. Readers consume only a validated manifest and report corruption explicitly. Add chapter/source segmentation if required by the accepted scope. Escape Markdown/YAML/HTML contexts correctly; all creator material remains untrusted data, never authority for an agent.

**Test:** malformed/truncated JSONL, schema upgrade, mixed generations, dead citations, transcript revision, partial export, malicious metadata and wrong-language tracks cannot become ordinary trusted hits or silent “no match.” Use source-bound fidelity tests plus local recall tests before building embeddings.

### HR25 — P1 — Rollback instructions delete the durable archive

The blueprint's rollback says to delete the entire store even though it contains the only durable transcripts. Hash-only revisions do not preserve old text, and source tests cannot reconstruct untracked source or lost archive bytes. The four-file render is not a transaction; export uses direct `copyFileSync`.

**Fix:** separate code rollback, derived-index rebuild and explicit owner-requested source purge. Preserve verified private-data backups and prove restore into an isolated destination. Roll back the generator/version pointer while retaining raw documents, registry, reservations and history. Publish derived generations atomically. Document temp-file boundaries truthfully: yt-dlp writes private text in OS temp and uv directories may be outside the named store.

**Test:** kill between each publication step, restore from backup into a new root and compare source/generation hashes. Never execute the current destructive rollback against the real archive during repair.

### HR26 — P2 — The completion/readiness receipt needs evidence reconciliation

The blueprint still has `status: plan-ready`, S1→S8 as “next” in one receipt and “IMPLEMENTATION VERIFIED/no next slice” in another. It claims a final 18 modules + 5 tests and max 287 lines, while the actual files include additional modules/tests and `unit.test.mjs` exceeds 300 lines. The new plan declares itself to supersede a spec it never saw. Its missing-credential unblock instructions contradict source. The upstream plan explicitly retains semantic search, grounded rules, deletion/kill controls; the deviation table does not reconcile all omitted requirements.

**Fix:** preserve the current plan first; use one authoritative version/status/receipt with a complete applicability and requirement-to-test mapping. Classify unseen source spec as MISSING/unreconciled, never superseded by reconstruction alone. Separate implemented acquisition, partial extraction, deferred semantic retrieval and unimplemented OAuth. Attach reproducible mutation definitions, exact source hashes, real test logs, review identities/outputs/adjudications and any actual native workflow evidence. Do not label past or missing reviews as passed. Change “zero dependencies” to “zero npm dependencies; Node plus supported yt-dlp/Python/uv runtime required” if that is what is intended.

**Test/evidence:** run the installed readiness integrity gate against the actual receipt once repaired; inspect underlying evidence, not just structure. If fixed reviewer routes are unavailable, preserve that pending/blocker state. No provider call or paid fallback is needed to accept the concrete defects reproduced here.

## Mega Blueprints completeness audit

| Category | Review judgment and required repair |
|---|---|
| Baseline/preservation | VERIFIED current branch, dirty state and 35-file snapshot. Historical baseline differs; attach current receipt. Original native hook execution unproven. |
| Requirements | PRESENT, INCOMPLETE/CONFLICTING: OAuth, all uploads, daily freshness, semantic fidelity and safety/recovery are not satisfied. Reconcile HR01–HR26. |
| Architecture/boundaries | PRESENT, INCORRECT single-writer assumption and import-graph trust claim. Define lock, authority and publication generation ownership. |
| Wireframes/surface states | Headless UI N/A is justified. CLI/Markdown states need repair; listed `--retry`, `--repair`, `--rebuild-index` behaviors are not implemented commands. |
| Mermaid/flows | PRESENT source. No rendered preview evidence inspected. Update failure, lock, partial enumeration, corrupt store, cancellation, restore and publication flows. |
| Contracts/diagrams | PRESENT but missing validation/version/liveness contracts. “No concurrent actors” is contradicted by interactive and scheduled writers; add a lock/publication sequence diagram. |
| Tests | 54 green with version stub; 24 new RED violations. Live rerun, real process-kill storage recovery, actual OAuth, scheduler and vault copy NOT RUN. |
| Traceability | Existing PASS labels cover helpers/fixtures, not several actual caller boundaries. Link every repaired invariant to its correct entry point and evidence. |
| Slices/operations | PRESENT but unsafe rollback, wrong throughput assumptions, missing resumption/fairness/kill policy and backup proof. |
| Hostile review/readiness | REVISE. Historical claims are preserved; this review is not retroactive proof of a complete provider review chain, native guard or deployment. |

## Builder execution order

1. **Preserve and reconcile.** Snapshot exact live source/plan/private-state metadata; confirm current Git identity and ownership. Adopt these findings into the existing canonical packet. Do not overwrite unrelated dirty files.
2. **Store integrity and ownership.** HR04, HR05, HR07, HR11, HR14, HR17, HR21, HR25. Establish lock/schema/revision and generation contracts first so later repairs can rely on them.
3. **Admission and acquisition.** HR01–HR03, HR12, HR13, HR16, HR18–HR20, HR22, HR23. Fix real CLI/caller boundaries, persistence and completeness before unattended backfill.
4. **Derived truth.** HR06, HR08, HR09, HR15, HR24. Rebuild only after semantic fidelity, source-binding and final-output validation pass. Preserve the prior valid generation until publication succeeds.
5. **OAuth as an explicit slice.** HR10; implement the adapter and its offline contracts, then perform authorized live consent/sync when credentials and owner interaction are available. Keep pending boundaries honest.
6. **Combined review/receipt.** HR26. Re-run old tests plus new regression tests, actual process/concurrency/interrupt boundaries, constrained live acquisition and restoration. Preserve the configured reviewer/call history; resolve all findings on the same final source revision before claiming implementation verified.

No new engine implementation, automatic commit, push, scheduling, paid model calls or real archive cleanup is authorized by this review artifact.

## Reproduction and handoff

The snapshot includes the complete import dependency set. All fixtures are synthetic and created under a unique OS-temp root. Diagnostic scripts intentionally return exit 1 on the reviewed version, with machine-readable observations; they are review probes, not a substitute for full acceptance suites. Convert each repaired invariant into a focused RED→GREEN regression at the real boundary. Extend them with the acceptance cases above.

```powershell
$review = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13'
node "$review/reproduce.mjs"
node "$review/transport-probes.mjs"

# To evaluate a repaired candidate without modifying the preserved snapshot:
$env:REVIEW_SOURCE_ROOT = 'C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT'
node "$review/reproduce.mjs"
node "$review/transport-probes.mjs"
```

When using an alternate candidate, the default-OAuth probe HR10 is explicitly SKIPPED to avoid starting a newly implemented authorization flow with synthetic credentials. Replace it with the fully mocked OAuth acceptance tests above. A changed public contract may also require adapting these diagnostic callers; report such setup failures separately from RED behavior.

Fix the defined contracts rather than only satisfying these exact fixtures. In particular, adding a dictionary for always/never does not solve attribution/conditional fidelity; a process-local mutex does not solve cross-process ownership; and skipping broken input silently does not solve corruption handling.

**Paste-ready instruction to the builder:**

> Treat this Creator Brains review as REVISE. Read the complete report and both JSON result files. Preserve the existing source and canonical blueprint, reproduce the 24 failures, and repair HR01–HR26 in the ordered slices with requirement-linked tests. Fix the actual CLI, parser, persistent store and exported-generation boundaries; do not substitute mock-only success or relabel missing OAuth/semantic/live checks. Keep the current role/review authority and spend rules. Return exact diff scope, per-finding disposition, RED→GREEN evidence, source hashes, restore/concurrency/process-interruption proof and an honest readiness receipt. Do not delete the archive, broad-stage the dirty tree, push, deploy, register scheduling or publish the real vault as part of these repairs.
