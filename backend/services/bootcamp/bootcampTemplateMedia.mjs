/**
 * ============================================================================
 * FILE: bootcampTemplateMedia.mjs — H09 / R-H09 + template media rejoin.
 *
 * Extracted from `bootcampCrud.mjs` (rule 4 cap). This is a cohesive unit: joining saved
 * template exercises to the CURRENT Exercise record, and refusing to let a substitution
 * borrow the identity of the movement it replaced.
 *
 * THE H09 RULE — and what it deliberately does NOT do
 *   `hydrateTemplateExerciseMedia` joins by `exerciseLibraryId` and used to SKIP any row
 *   whose id did not resolve. For an ordinary row that is right — the saved snapshot stands.
 *   For a SUBSTITUTION it was not: if the replacement's identity never resolved, the row
 *   kept media copied from the movement it replaced, so the app presented the SOURCE
 *   movement's demonstration and instructions as the replacement's.
 *
 *   Register: "Alternative has its own verified identity or a clear unverified state; never
 *   inherits original demo/instructions."
 *
 *   This module enforces ONLY the "unresolved rename has no source demo" half of that
 *   (contract `13-server-repair-contract.md:295`): a substitution that recorded a catalog
 *   UUID which then FAILED to resolve keeps no demo. The other half — "never inherits" — is
 *   enforced at CONSTRUCTION, at BOTH places that turn a row into a substitution:
 *   `classStyleModifiers.mjs` `buildAlternativeExercise` (no longer hands a generated
 *   alternative the source's `exerciseLibraryId` or media) and `painAwareGating.mjs` (records
 *   `sourceExerciseName` and clears the same fields when severe-pain gating renames a Board-1
 *   row IN PLACE). An earlier version of this comment named only the first; an external review
 *   then showed the renamed row still inherited the replaced movement's identity and demo,
 *   and that this comment was false about its own coverage.
 *
 *   WHY THE JOIN CANNOT BE WIDENED. A substitution with a RESOLVING id is genuinely
 *   ambiguous at read time: the alternative-authoring picker writes a real catalog id for a
 *   chosen substitute (`frontend/src/components/BootcampBuilder/BootcampExerciseAlternatives.ts:216`,
 *   `board: 'main'`), while a PRE-FIX generated alternative carried the SOURCE's id — and both
 *   resolve. No column distinguishes them, so guessing here would either strip a legitimate
 *   substitute's own verified media or bless an inherited one. Rows already persisted with the
 *   source's id therefore need a data repair, not a heuristic; this module does not pretend
 *   otherwise. Clearing on the mere `sourceExerciseName` marker was tried and reverted — it
 *   destroyed a hand-authored alternative's own demo (external review, round 97, F3).
 *
 *   ROUND 113 ADDENDUM. One case IS identifiable after all, and the module now refuses it
 *   instead of guessing: a PRE-FIX row that inherited the source's id carries the source's NAME
 *   in `sourceExerciseName`, so when the live catalog row's name equals it AND the row was
 *   renamed, the join is resolving to the movement that was replaced (see
 *   `LIVE_EXERCISE_LOOKUP_FIELDS` below). That narrows the window; it does not close it — a
 *   renamed catalog row defeats the comparison, so the data repair above is STILL required.
 * ============================================================================
 */
import { getExercise } from '../../models/index.mjs';
// The ONE UUID rule (integration review, round 104). Imported for this module's own use AND
// re-exported, because `bootcampCrud.mjs` has always reached it through this module. The H09
// extraction left a private copy here, which both broke that import — the bootcamp module graph
// failed to LINK, which no vitest run can see — and duplicated a rule that already existed.
import { normalizeExerciseLibraryId } from './bootcampTemplateRules.mjs';

export { normalizeExerciseLibraryId };

const LIVE_EXERCISE_FIELDS = ['videoUrl', 'previewVideoUrl', 'thumbnailUrl', 'imageUrl', 'description', 'instructions'];

// F3/F4 residual (hostile review, round 113). A substitution persisted BEFORE
// `buildAlternativeExercise` stopped withholding the source's identity still carries the
// SOURCE's `exerciseLibraryId`, so this module's join RESOLVES and the resolving branch below
// would copy the REPLACED movement's demo onto the substitute. Such a row is identifiable in
// one case: its `sourceExerciseName` (the replaced movement's name, written at construction —
// `classStyleModifiers.mjs:103`, `painAwareGating.mjs:164`) equals the live catalog row's
// `name` AND the row's own name differs from it. This is a read-time refusal for that case
// only — it reduces how often the wrong demo is served, and it does NOT discharge the data
// repair the file header describes, because a renamed catalog row defeats the comparison.
//
// `name` is deliberately NOT part of LIVE_EXERCISE_FIELDS: that array drives BOTH the clear
// loop (which nulls every field in it) and the copy loop. This module's rows are identified by
// `exerciseName` (`bootcampTemplateSave.mjs:188`) and carry no `name` field — the frontend code
// that reads `.name` works on `RolodexLikeExercise`, a catalog shape. Putting `name` in that
// array would therefore WRITE the live catalog name onto rows that have no such field (copy
// branch) or null it (clear branch), leaking a catalog value into serialized rows. It is
// fetched only to make the comparison below.
const LIVE_EXERCISE_LOOKUP_FIELDS = [...LIVE_EXERCISE_FIELDS, 'name'];

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getRecordValue(record, key) {
  if (!record) return undefined;
  if (typeof record.get === 'function') return record.get(key);
  return record[key];
}

function setRecordValue(record, key, value) {
  if (typeof record?.setDataValue === 'function') {
    record.setDataValue(key, value);
    return;
  }
  if (record) record[key] = value;
}

function arrayValue(record, key) {
  const value = getRecordValue(record, key);
  return Array.isArray(value) ? value : [];
}

function collectTemplateExerciseRows(templates) {
  const rows = [];
  for (const template of templates ?? []) {
    rows.push(...arrayValue(template, 'exercises'));
    for (const station of arrayValue(template, 'stations')) {
      rows.push(...arrayValue(station, 'exercises'));
    }
  }
  return rows;
}

async function loadLiveExercises(exerciseIds) {
  const Exercise = getExercise();
  if (!Exercise || exerciseIds.length === 0) return [];
  return Exercise.findAll({
    where: { id: exerciseIds },
    attributes: ['id', ...LIVE_EXERCISE_LOOKUP_FIELDS],
    raw: true,
  });
}

export async function hydrateTemplateExerciseMedia(templates, exerciseLoader = loadLiveExercises) {
  const exerciseRows = collectTemplateExerciseRows(templates);
  const exerciseIds = [...new Set(
    exerciseRows
      .map(row => normalizeExerciseLibraryId(getRecordValue(row, 'exerciseLibraryId')))
      .filter(Boolean)
  )];

  // NOTE: there is deliberately NO early return when `exerciseIds` is empty. An earlier
  // version returned here, which meant a template whose rows ALL had unresolvable ids never
  // reached the substitution rule below — so a set of unresolved substitutions kept their
  // copied source media. The empty case is now simply "no live rows to join against".
  const liveRows = exerciseIds.length === 0 ? [] : await exerciseLoader(exerciseIds);
  const liveById = new Map(
    (liveRows ?? [])
      .map(row => [normalizeExerciseLibraryId(row.id), row])
      .filter(([id]) => Boolean(id))
  );

  for (const exercise of exerciseRows) {
    const exerciseLibraryId = normalizeExerciseLibraryId(getRecordValue(exercise, 'exerciseLibraryId'));
    const liveExercise = liveById.get(exerciseLibraryId);
    if (!liveExercise) {
      // H09 / R-H09: a substitution keeps "its own verified identity or a CLEAR UNVERIFIED
      // STATE; never inherits original demo/instructions".
      //
      // Only a RECORDED identity that FAILED to resolve is cleared — the "unresolved rename".
      // A present UUID proves the row was meant to join to a catalog exercise, and a failed
      // join must not leave the replaced movement's demo standing in its place.
      //
      // A row with NO recorded id is deliberately LEFT ALONE. An earlier version cleared every
      // substitution whose id did not resolve, and a reviewer showed it destroys a legitimate
      // hand-authored alternative's OWN media: the save path permits media plus provenance, and
      // the UUID-only normalizer turns a numeric id into null — so a real row with its own demo
      // matched the "unresolved" branch and lost all six fields on read. With
      // `buildAlternativeExercise` now withholding the source's identity at CONSTRUCTION, a
      // substitution cannot inherit the source's media in the first place, so this branch does
      // not need to guess — and nothing here IS provable from the row alone.
      if (isSubstitution(exercise) && exerciseLibraryId) {
        for (const field of LIVE_EXERCISE_FIELDS) setRecordValue(exercise, field, null);
      }
      continue;
    }

    // F3/F4 residual: a PRE-FIX substitution inherited the source's id, so this join resolves
    // to the movement it replaced. Positively identified by name equality — see
    // LIVE_EXERCISE_LOOKUP_FIELDS above — it gets the clear/never-inherit treatment rather than
    // the replaced movement's demo. A legitimate substitute resolves to its own row and falls
    // through to the copy below.
    //
    // Hostile review (round 113) tightened this in three ways, and the limits are stated rather
    // than implied:
    //   1. The row must actually have been RENAMED. `generateBoard2` has no guard that an
    //      alternative's derived name differs from the movement's own (`classStyleModifiers.mjs:140-168`
    //      only compares the two alternatives to each other), while `painAwareGating.mjs:151` does
    //      guard. Without the `ownName !== sourceName` condition, such a row — same movement, same
    //      name — would have its own media cleared.
    //   2. Name equality is NOT rename-proof. If the catalog row was renamed after the template was
    //      persisted, the live name matches neither the row's name nor `sourceExerciseName`, this
    //      branch misses, and the replaced movement's demo is still served. Detecting that needs a
    //      column the row does not have.
    //   3. Therefore this is a read-time REFUSAL for the identifiable case, and it does NOT make the
    //      F3/F4 data repair unnecessary — the file header still applies.
    // ROUND 115 (review F4): the comparison is NORMALISED, and ROUND 116 (review R2) widened what
    // normalising means. Exact string equality was wrong in BOTH directions, because `Exercise.name`
    // is UNIQUE but CASE-SENSITIVE (`models/Exercise.mjs`), so two catalog rows differing only in
    // case are both legal:
    //   - MISS: a live name of "GOBLET SQUAT" against `sourceExerciseName` "Goblet Squat" failed
    //     the equality, fell through to the copy loop below, and re-served the replaced movement's
    //     demo — the very defect this branch exists to stop;
    //   - FALSE CLEAR: a substitute whose OWN catalog name differed only by case from
    //     `sourceExerciseName` satisfied every predicate and lost its own catalog identity.
    // The fold is `trim().toLowerCase()` PLUS internal-whitespace collapsing, because a stored
    // `sourceExerciseName` of "Goblet  Squat" (double space) or "Goblet\tSquat" missed the live
    // "Goblet Squat" and re-served the replaced demo — the same miss, one whitespace character wide.
    //
    // STILL NOT FOLDED, stated rather than implied: punctuation, and the Unicode special cases
    // (`'İ'.toLowerCase()` is two code units; `ß` does not fold to `ss`). A catalog entry that
    // differs from the movement only by punctuation therefore still misses, and the file header
    // records that this rule narrows the window without closing it.
    //
    // A FURTHER FALSE-CLEAR was proposed in round 116 (R1): "a legitimate substitute whose chosen
    // catalog row is named the same as the replaced movement". Analysed and NOT reachable from the
    // picker: `Exercise.name` is UNIQUE, so the row named `sourceExerciseName` IS the replaced
    // movement's row — an id pointing at it is the inherited id this branch exists to refuse, not a
    // substitute's own. The reviewer's suggested remedy (look up a second row named `ownName`) would
    // weaken exactly that detection.
    //
    // RESIDUAL CLASS, WIDENED BY THE ROUND-116 COLLAPSE ABOVE — recorded here because round 122
    // showed the list was incomplete. `Exercise.name` is a RAW-STRING unique btree index, so
    // "Goblet Squat", "Goblet  Squat" (double space) and "Goblet\u00A0Squat" (NBSP — invisible to the
    // eye) are three LEGAL rows. A substitute whose own catalog row is such a variant, while its
    // display name differs from `sourceExerciseName`, now folds to a match and loses its own media
    // AND its catalog id; the pre-collapse code missed it and kept them. So the collapse widened this
    // class rather than creating it — the case-variant twin was already here.
    //
    // Why it stays undefended, stated plainly: reaching it needs a row whose `exerciseName` disagrees
    // with the name of the catalog row its id points at. No producer writes that — the picker sets
    // the display name FROM the picked catalog name, and both alternative builders withhold the id
    // entirely (`exerciseLibraryId: null`) — so this is the shape of a hand-edited or imported row,
    // not one the product creates. Tightening the comparison further would start missing the
    // inherited-id rows this branch exists for, which is the failure that matters.
    const normalizeName = (value) => {
      const text = nullableText(value);
      return text ? text.toLowerCase().replace(/\s+/g, ' ') : null;
    };
    const sourceName = normalizeName(getRecordValue(exercise, 'sourceExerciseName'));
    const ownName = normalizeName(getRecordValue(exercise, 'exerciseName'));
    if (isSubstitution(exercise) && sourceName && ownName && ownName !== sourceName
      && normalizeName(liveExercise.name) === sourceName) {
      for (const field of LIVE_EXERCISE_FIELDS) setRecordValue(exercise, field, null);
      // Drop the catalog IDENTITY too, not just the media (hostile review, round 114 F5). Nulling
      // only the six media fields left `exerciseLibraryId` pointing at the movement that was
      // REPLACED, and nothing else in the system knows about this refusal: the frontend uses that
      // id as the plan slot's catalog reference (`BootcampClassPlanAdapter.ts:70`) and as a row
      // key (`ClassPreviewAlternatives.tsx:40`), so the substitute still carried the replaced
      // movement's identity — and a re-save PERSISTED it, which meant one catalog rename could
      // restore the wrong demo. Both producers already null it at construction
      // (`classStyleModifiers.mjs:129`, `painAwareGating.mjs:165`); this is the same treatment for
      // rows persisted before them. The column is a nullable UUID with `onDelete: 'SET NULL'`
      // (`models/BootcampExercise.mjs`), so a null is a state the schema and the UI already handle
      // — the frontend falls back to a name-based ref.
      setRecordValue(exercise, 'exerciseLibraryId', null);
      continue;
    }

    for (const field of LIVE_EXERCISE_FIELDS) {
      const liveValue = nullableText(liveExercise[field]);
      if (liveValue) setRecordValue(exercise, field, liveValue);
    }
  }

  return templates;
}

/**
 * A row that REPLACED another movement. `sourceExerciseName` is the marker the builder puts
 * on an alternative, and it is deliberately the only signal used: `board === 'alternative'`
 * would clear media for rows that legitimately are the movement, and "has media" is
 * circular since a stale copy is what must be detected.
 */
function isSubstitution(record) {
  const source = getRecordValue(record, 'sourceExerciseName');
  return typeof source === 'string' && source.trim() !== '';
}
