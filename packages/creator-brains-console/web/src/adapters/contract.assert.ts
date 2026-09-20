/*
 * ============================================================================
 * FILE: web/src/adapters/contract.assert.ts
 * PURPOSE: Make the DEFERRED contract compiler-enforced, not test-enforced.
 * PART OF: Creator Brains Console (05-contracts.md §2b; R4-04)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS (Astra round 4, R4-04). `T-B27m` compares the FIELD NAMES
 * a declaration lists against the field names `05-contracts.md` §2b lists. Names
 * are not a contract. The round-4 probe changed `runId` from `string | null` to
 * `number` in `types.ts` and every check in the suite stayed green, because
 * `runId` was still spelled `runId`. The suite could see a renamed field and was
 * blind to a RETYPED one.
 *
 * WHY THE CHECK IS IN THE COMPILER. A text comparison of two type expressions is
 * a comparison of SPELLING: `string|null`, `string | null` and `(string | null)`
 * are one type written three ways, and `Record<string,string>` and
 * `{ [k: string]: string }` are one type written two ways. Only the type checker
 * compares meaning. So the expected shape is written once here as a literal, and
 * `Exact<>` makes any difference a COMPILE ERROR:
 *
 *     error TS2344: Type 'false' does not satisfy the constraint 'true'.
 *
 * THE THREE SOURCES ARE NAMED DELIBERATELY. `types.ts` is the declared contract
 * the app programs against; `LocalEngineAdapter` and `MockAdapter` are the two
 * implementations. An adapter that `implements` the interface is checked by
 * assignability, which PERMITS a wider return type — an extra property would pass
 * `implements` and still be a drift. `Exact<>` refuses it, so all three are
 * pinned rather than the interface alone.
 *
 * HOW THIS FILE IS KEPT HONEST. Nothing here is derived, so nothing here can
 * silently agree with a stale document: `T-B27m2` reads these literals back out
 * as text and requires them to match §2b field for field AND TYPE FOR TYPE. The
 * document is the source; this file is the compiler's copy of it; the test is the
 * link between them. Change the contract in one place and something fails.
 *
 * NO RUNTIME CODE. Every export is a type alias, so the module erases completely
 * and is never bundled.
 *
 * @module creator-brains-console/web/adapters/contract.assert
 */

import type { ConsoleDataAdapter } from './types';
import type { LocalEngineAdapter } from './LocalEngineAdapter';
import type { MockAdapter } from './MockAdapter';

/**
 * Exactly equal — mutually assignable, and neither side wider than the other.
 *
 * The tuple brackets are load-bearing: `[A] extends [B]` stops the conditional
 * from DISTRIBUTING over a union member, so `string | null` is compared as one
 * type instead of being tested member by member.
 */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** A compile-time assertion. `false` here is TS2344, which fails the build. */
type Assert<T extends true> = T;

/** The resolved return shape of one interface method. */
type Returns<M extends keyof ConsoleDataAdapter> = Awaited<ReturnType<ConsoleDataAdapter[M]>>;

/**
 * The resolved return shape of one method on an implementation class.
 *
 * The conditional is not decoration: `C[M]` is not known to be callable, so
 * `ReturnType` rejects it outright (TS2344). A member that is somehow NOT a
 * function resolves to `never`, which then fails `Exact<>` — so the failure
 * direction stays closed rather than silently comparing nothing.
 */
type ImplReturns<C, M extends keyof C> =
  C[M] extends (...args: never[]) => infer R ? Awaited<R> : never;

/* ── POST /api/run/daily — `202 {requestId: string, runId: string | null}` ── */

export type StartDailyRunContract = Assert<Exact<
  Returns<'startDailyRun'>,
  { requestId: string; runId: string | null }
>>;

export type StartDailyRunLocalImpl = Assert<Exact<
  ImplReturns<LocalEngineAdapter, 'startDailyRun'>,
  { requestId: string; runId: string | null }
>>;

export type StartDailyRunMockImpl = Assert<Exact<
  ImplReturns<MockAdapter, 'startDailyRun'>,
  { requestId: string; runId: string | null }
>>;

/* ── POST /api/repair — `200 {repaired: number, built: number, emptied: number}` ── */

export type RepairContract = Assert<Exact<
  Returns<'repair'>,
  { repaired: number; built: number; emptied: number }
>>;

export type RepairLocalImpl = Assert<Exact<
  ImplReturns<LocalEngineAdapter, 'repair'>,
  { repaired: number; built: number; emptied: number }
>>;

export type RepairMockImpl = Assert<Exact<
  ImplReturns<MockAdapter, 'repair'>,
  { repaired: number; built: number; emptied: number }
>>;
