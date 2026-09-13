# MEDIA READ-REFUSAL — the RED state, archived (round 113)

**Why this file exists.** A hostile review (round 113, F05) observed that the RED evidence for the
F3/F4 media rule rests on `hg125-media-red.log` plus **mtime ordering**, because the pre-fix file
was **untracked** in git — so there is no baseline anyone can diff against. It recommended archiving
the RED-state bytes, as `s03-red.patch` does for an earlier slice. This is that archive, with one
honesty constraint stated up front:

> **This is a RECONSTRUCTION, not a live capture.** The original pre-fix bytes were never saved. What
> follows is the exact code the RED run was measured against, transcribed from the diff of the
> change, plus a one-line reproduction that recreates the RED state on demand from the current file.
> A reader who wants certainty should run the reproduction rather than trust the transcription.

---

## 1. The change the RED run was measured against

**PRE-FIX — the resolving branch copied live media unconditionally:**

```js
    for (const field of LIVE_EXERCISE_FIELDS) {
      const liveValue = nullableText(liveExercise[field]);
      if (liveValue) setRecordValue(exercise, field, liveValue);
    }
```

**POST-FIX — a refusal sits in front of it** (`bootcampTemplateMedia.mjs`, before the copy loop):

```js
    const sourceName = nullableText(getRecordValue(exercise, 'sourceExerciseName'));
    const ownName = nullableText(getRecordValue(exercise, 'exerciseName'));
    if (isSubstitution(exercise) && sourceName && ownName && ownName !== sourceName
      && nullableText(liveExercise.name) === sourceName) {
      for (const field of LIVE_EXERCISE_FIELDS) setRecordValue(exercise, field, null);
      continue;
    }
```

Plus the fetch widening: `attributes: ['id', ...LIVE_EXERCISE_LOOKUP_FIELDS]`, where
`LIVE_EXERCISE_LOOKUP_FIELDS = [...LIVE_EXERCISE_FIELDS, 'name']` — and **not** `name` inside
`LIVE_EXERCISE_FIELDS`, because that array drives the clear and copy loops too.

## 2. The RED evidence, as measured

`hg125-media-red.log` — against the pre-fix code:

```
Test Files  1 failed (1)
     Tests  1 failed | 3 passed (4)
AssertionError: expected 'https://cdn.swanstudios.test/exercise…' to be null
MEDIA_RED_EXIT=1
```

The failing case is the new one, `clears inherited media when the recorded id resolves to the
REPLACED movement itself`: with no refusal in front of the copy loop, the substitute received the
replaced movement's demo. `hg126-media-green.log` then shows 4/4 (and `hg137-media-guard.log` 5/5
after the review-driven guard).

## 3. Reproducing RED from the current file (no transcription required)

Delete the three-line condition and the copy loop reverts to its pre-fix behaviour. From `backend/`:

```powershell
# 1. keep a copy, then delete the refusal block
Copy-Item services\bootcamp\bootcampTemplateMedia.mjs $env:TEMP\media.bak
#    (remove the `if (isSubstitution(exercise) && sourceName && ownName ...` block)
# 2. the new case must FAIL
npx vitest run tests/unit/bootcampTemplateMediaRejoin.test.mjs
# 3. restore and confirm GREEN
Copy-Item $env:TEMP\media.bak services\bootcamp\bootcampTemplateMedia.mjs
npx vitest run tests/unit/bootcampTemplateMediaRejoin.test.mjs
```

**One variant of this operation was performed in-session and it discriminated:** deleting only the
`ownName !== sourceName` guard made the false-positive case fail (`hg137`, **probe M37**), with the
production file restored **byte-identically** (SHA-256 compared and printed — the one probe pair in
this packet whose hash comparison is persisted rather than in-session only).

**`hg125` itself is the pre-fix state, not a deletion:** it was run at 10:47, before the refusal
existed, so it measures the code as it stood. That is precisely why §1's transcription is offered
together with §3's reproduction — the original bytes cannot be re-derived from git, and the
reviewer was right to say so.

## 4. What this archive does NOT establish

It does not prove the reconstruction above is byte-identical to the file `hg125` ran against; only
the reproduction in §3 establishes the behaviour on the current bytes. It also does not claim the
rule is complete — the file header records the data repair that is still required, and the code
comment records the renamed-catalog false negative.
