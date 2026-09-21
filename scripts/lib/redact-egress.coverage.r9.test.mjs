/**
 * redact-egress.coverage.r9.test.mjs — R9-E8 and R9-E9: coverage falsifiability, and the canary's
 * probe strength.
 *
 * WHY THESE TWO MOVED OUT OF `redact-egress.rows.r9.test.mjs`.
 * That file crossed the 300-line cap (Rule 4) when R9-E8/E9/E10 were added. Rule 4 is a HARD cap
 * that explicitly includes test files; the repair is to EXTRACT AT THE SEAM — never to raise the
 * cap, never to line-golf the comments that carry the measured reasoning. E8 and E9 are the
 * natural seam: they interrogate the *instrument* (does the coverage check fail when it should;
 * does the canary see a partial redaction), whereas E3/E4/E5 and E10 interrogate the *rows*.
 *
 * These run INSIDE the parent's reporter rather than printing their own total, so one command
 * still exercises the whole round and there is one authoritative RESULT line rather than two
 * numbers a caller has to add up.
 */
export function runE8E9({ ok, SECRET_SHAPES, SECRET_FAMILIES, uncoveredFamilies, duplicatePatterns, selfTest, redactForEgress }) {
  // --- R9-E8: FAMILY COVERAGE, from an inventory that does not live in the table ---
  //
  // R9-E3 and R9-E6 both read `SECRET_SHAPES`. That makes them blind to a DELETION: removing a
  // row removes the assertion AND the sample it asserted on, so the suite stays green and the
  // family silently stops being recognised. Reproduced against shipped source (Astra's repro):
  //
  //   SECRET_SHAPES.splice(8,1)  ->  suite GREEN, 91 passed
  //   ...and 13 of the 20 rows behaved this way.
  //
  // Worse, `selfTest()` cannot catch it either — measured, it still returns `true` with the
  // bot-token row deleted, because a deleted row simply stops being checked.
  //
  // `secret-families.mjs` is a SECOND, INDEPENDENT statement of what must be recognised. It
  // borrows no pattern and no sample, so a deletion is visible to it. This block is the assertion
  // that closes A5:
  //   - every family in the inventory is still covered by some row
  //   - no row is a duplicate of another (the shape a family-swap takes)
  //   - and the check is shown to FAIL under both mutations, since a check that cannot fail is
  //     the defect being diagnosed
  {
    const uncovered = uncoveredFamilies(SECRET_SHAPES);
    ok(
      'R9-E8: every family in the independent inventory is covered by some row',
      uncovered.length === 0,
      uncovered.length ? `UNCOVERED: ${uncovered.map((u) => u.id).join(', ')}` : '',
    );
    // The invariant is one-directional and must not be asserted the other way. Rows may OUTNUMBER
    // families: `keyed-numeric-id` alone needs four rows now (bare, single-quoted, and two escaped
    // spellings). An earlier draft of this block required `|families| >= |rows|` and failed on a
    // table that was entirely correct — asserting the wrong direction is the same class of error
    // as the defect this block exists to catch, so it is recorded rather than quietly dropped.
    ok(
      'R9-E8: the inventory is non-trivial (it is a real second opinion, not a stub)',
      SECRET_FAMILIES.length >= 10,
      `families=${SECRET_FAMILIES.length} rows=${SECRET_SHAPES.length}`,
    );
    ok(
      'R9-E8: coverage is one-directional — every family needs a row, not every row a family',
      SECRET_FAMILIES.length <= SECRET_SHAPES.length,
      `families=${SECRET_FAMILIES.length} rows=${SECRET_SHAPES.length} (rows may exceed families)`,
    );
    ok(
      'R9-E8: no two rows share a pattern (a family swapped for a duplicate)',
      duplicatePatterns(SECRET_SHAPES).length === 0,
      duplicatePatterns(SECRET_SHAPES).join(' | '),
    );

    // THE CHECK MUST BE FALSIFIABLE. Each mutation below is applied to a COPY — the shipped
    // table is untouched — and the coverage function must report the missing family. A coverage
    // assertion that survives a deletion is decoration, which is precisely what was wrong here.
    const clone = () => SECRET_SHAPES.map((r) => [...r]);

    const deleted = clone();
    const patRow = deleted.findIndex((r) => r[0].source.includes('github_pat_'));
    deleted.splice(patRow, 1);
    ok(
      'R9-E8: deleting the fine-grained-PAT row IS detected (the old defect, now caught)',
      uncoveredFamilies(deleted).some((u) => u.id === 'github-fine-grained-pat'),
      uncoveredFamilies(deleted).map((u) => u.id).join(', '),
    );
    ok(
      'R9-E8: deleting a row is NOT visible to the row count (why this block exists)',
      deleted.length === SECRET_SHAPES.length - 1,
      `${SECRET_SHAPES.length} -> ${deleted.length}`,
    );

    const swapped = clone();
    const pat = swapped.findIndex((r) => r[0].source.includes('github_pat_'));
    const gh = swapped.findIndex((r) => r[0].source.includes('gh[pousr]_'));
    ok('R9-E8: both swap anchors were located by content, not line number', pat >= 0 && gh >= 0, `pat=${pat} gh=${gh}`);
    if (pat >= 0 && gh >= 0) {
      swapped[pat] = [swapped[gh][0], swapped[gh][1], swapped[gh][2]];
      ok(
        'R9-E8: replacing a family with a DUPLICATE of another IS detected (Astra\'s repro)',
        uncoveredFamilies(swapped).some((u) => u.id === 'github-fine-grained-pat'),
        uncoveredFamilies(swapped).map((u) => u.id).join(', '),
      );
      ok(
        'R9-E8: ...and the row COUNT is unchanged by that swap (93/93 green, before this block)',
        swapped.length === SECRET_SHAPES.length,
        `${swapped.length}`,
      );
      ok(
        'R9-E8: ...and the duplicate-pattern check names it',
        duplicatePatterns(swapped).length > 0,
        duplicatePatterns(swapped).map((s) => s.slice(0, 40)).join(' | '),
      );
    }
  }

  // --- R9-E9: the canary must see a PARTIAL redaction, not merely a fired row ---
  //
  // `selfTest()` probed each sample with `sample.slice(0, 12)` — a 12-CHARACTER PREFIX OF THE
  // PLAINTEXT. So the probe disappears the moment a row redacts the first 12 characters, even
  // though the remaining 15+ characters are still in the clear. Measured against shipped source:
  //
  //   sample : "sk-CANARYCANARYCANARY123456"
  //   probe  : "sk-CANARYCAN"          <- a prefix of the plaintext
  //   mutant : "<REDACTED-KEY>ARYCANARY123456"   (redacts 12 chars, leaks 15)
  //   canary would see the probe?  FALSE  -> reports success while the key leaks
  //
  // The tail is not a prefix of the plaintext, so it only disappears when the value was covered
  // WHOLE. This is the property the module header claims and that the old probe did not check.
  {
    // A row is TRUNCATION-DETECTABLE when a 12-character-window probe can still see residue after
    // the match's first 12 characters. Most samples are long enough; one (the phone number, 14
    // chars) is not, and that is a property of the shape rather than a defect — see the note below.
    const MIN_RESIDUE = 3;
    const detectable = (head) => {
      const tail = head.slice(-12);
      const residue = head.slice(12);
      for (let L = MIN_RESIDUE; L <= residue.length; L += 1) {
        if (tail.includes(residue.slice(-L))) return true;
      }
      return false;
    };

    let probed = 0; let skipped = 0;
    for (const [re, repl, sample] of SECRET_SHAPES) {
      const head = sample.split('\n')[0];
      ok(
        `R9-E9: row (${String(re).slice(0, 22)}…) sample is long enough to carry a tail probe`,
        head.length > 12,
        `head=${JSON.stringify(head)} len=${head.length}`,
      );
      if (detectable(head)) {
        probed += 1;
        ok(
          `R9-E9: a match truncated at 12 chars leaves residue the tail probe can see (${repl})`,
          true,
          '',
        );
      } else {
        // Recorded, not silently passed: a shape this short cannot be truncation-audited by a
        // fixed-width probe, and saying so is different from claiming it passed. The canary's
        // own tail check covers it for the full match; what is unavailable is the middle case.
        skipped += 1;
        ok(
          `R9-E9: row (${repl}) is documented as too short for a truncation probe`,
          head.slice(12).length < MIN_RESIDUE,
          `residue=${JSON.stringify(head.slice(12))} (needs >= ${MIN_RESIDUE})`,
        );
      }
    }
    ok(
      'R9-E9: almost every row is truncation-detectable (the probe is not vacuous)',
      probed >= SECRET_SHAPES.length - 1,
      `probed=${probed} skipped=${skipped} of ${SECRET_SHAPES.length}`,
    );
    ok(
      'R9-E9: some row IS truncation-detectable, so the property is exercised at all',
      probed > 0,
      `probed=${probed}`,
    );
    // ...and the real canary passes on the real table, so the strengthened probe did not simply
    // become impossible to satisfy.
    let live = false;
    let why = '';
    try { live = selfTest() === true; } catch (e) { why = e.message.slice(0, 140); }
    ok('R9-E9: selfTest() still passes with the tail probe in place', live, why);

    // THE ASSERTION ABOVE IS NOT ENOUGH ON ITS OWN, AND A MUTATION PROVED IT. Reverting the canary
    // to its 12-CHARACTER PREFIX probe left every case in this block GREEN: the cases above test
    // row SAMPLES against a locally-computed tail, so they describe the property without ever
    // requiring `selfTest()` to implement it. A suite that describes a fix without exercising it
    // is the same defect as an unexecuted assertion, one level up.
    //
    // So the canary is exercised DIRECTLY: a probe that truncates a match must make it THROW.
    // `redact-egress.mjs` reads the table at module load, and `selfTest()` reads it on every call,
    // so a row whose regex redacts only its first 12 characters is planted, the canary invoked,
    // and the throw required. The row is restored from a saved copy in a `finally`.
    {
      const row = SECRET_SHAPES[0];
      const saved = [row[0], row[1], row[2]];
      let threw = false;
      let detail = '';
      try {
        // A row that redacts only the first 12 characters and LEAVES THE REST IN THE CLEAR — the
        // precise failure mode a prefix probe cannot see, because the probe is gone by then.
        //
        // THE FIRST DRAFT OF THIS MUTANT USED `(?<=^)` AND NEVER FIRED, so the case passed for the
        // wrong reason and the mutation proof reported the canary as still blind when it was not.
        // The canary builds `canary <sample>`, so `sk-` is preceded by a SPACE, not the string
        // start — and `(?<=^)` can only match at position 0. Measured both ways before fixing:
        //   after "canary "  -> (?<=^) cannot match, the row never fires, nothing is redacted
        //   at start of string -> `<R>ARYCANARY123456`, prefix gone, tail intact
        // The boundary is now `(?<!\w)`, the row's own real boundary, so the mutant fires in the
        // context the canary actually uses.
        row[0] = /(?<!\w)sk-[A-Za-z0-9]{9}/g;
        try {
          selfTest();
          detail = 'selfTest() returned true with a truncating row planted';
        } catch { threw = true; }
      } finally {
        row[0] = saved[0]; row[1] = saved[1]; row[2] = saved[2];
      }
      ok(
        'R9-E9: selfTest() CATCHES a truncating row (a prefix probe cannot)',
        threw, detail,
      );
      // ...and the mutant must be shown to ACTUALLY FIRE, or this case is vacuous for the same
      // reason the first draft was: a row that redacts nothing cannot make anything throw.
      {
        const probe = `${SECRET_SHAPES[0][2]}`;
        const fired = probe.replace(/(?<!\w)sk-[A-Za-z0-9]{9}/g, '<R>');
        ok(
          'R9-E9: the planted mutant genuinely redacts (not a silent no-op)',
          fired.startsWith('<R>') && fired.includes('ARYCANARY'),
          `${JSON.stringify(probe)} -> ${JSON.stringify(fired)}`,
        );
      }
      // And the restoration must be real, or every later case in this file runs mutated.
      ok('R9-E9: selfTest() passes again after the truncating row is restored', selfTest() === true);
    }
  }
}
