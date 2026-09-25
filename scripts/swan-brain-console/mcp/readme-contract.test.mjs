/**
 * readme-contract.test.mjs — the README's tool list must be the code's tool list.
 *
 * WHY THIS FILE EXISTS
 * Round 12's hostile review (Astra G23) found the boundary section saying "its four tools" and
 * a table listing four, while `TOOL_NAMES` has five — `swan_get_gate_health`, the tool that
 * most directly serves this console's stated purpose, was missing. The same README, forty
 * lines further down, explains that the count is five and that a previous version of the file
 * had been wrong about it. So the file contradicted itself, and nothing failed.
 *
 * A count restated in two places is a defect the moment the two can disagree. The fix is not
 * a better count — it is to have no count and make the TABLE the list, with a guard that ties
 * it to `TOOL_NAMES`. A tool cannot now be added, renamed or dropped without this going RED.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_NAMES } from './tools.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const README = readFileSync(join(HERE, 'README.md'), 'utf8');

/**
 * Every tool name documented in the `## Tools` table, in order.
 *
 * ROUND 13 (2026-09-21) — THE PARSER WAS NARROWER THAN ITS CLAIM (Astra H13).
 * The first version matched only `` ^\|\s*`(swan_[a-z_]+)` `` — backtick-wrapped, lowercase
 * and underscore only. Astra appended two perfectly ordinary table rows and the extracted list
 * did not change:
 *
 *     | swan_get_phantom | none | nonexistent |
 *     | `swan_get_state_v2` | none | nonexistent |
 *
 * So the guard that exists to prove "the table IS the list" could not see two rows of the
 * table. That is the same defect class it was written to close, in the guard itself — which is
 * the most useful reminder in this file: a parser written to satisfy a finding is the most
 * likely place for the finding to survive.
 *
 * It now reads EVERY first-column cell and strips backticks, so spelling convention cannot
 * decide what is visible. Header and separator rows are the only things skipped, and they are
 * recognised structurally rather than by name.
 *
 * ROUND 14 (2026-09-21) — AND THE OUTER PIPES ARE OPTIONAL IN MARKDOWN (Astra J07).
 * The round-13 parser still required a LEADING `|`, so a body row written without the outer
 * pipes — which is valid Markdown, and which several renderers emit — stayed invisible. Astra
 * appended exactly that and the extracted list did not change:
 *
 *     swan_get_phantom | none | nonexistent
 *
 * A guard whose whole claim is "the table IS the list" cannot decide membership by a
 * punctuation convention that Markdown itself treats as optional. A row is now any line in the
 * section carrying a pipe and yielding at least two cells, with the outer pipes stripped when
 * they are present.
 */
function documentedToolsFrom(text) {
  const start = text.indexOf('## Tools');
  assert.notEqual(start, -1, 'the README has no "## Tools" section — this guard cannot run');
  const rest = text.slice(start);
  const end = rest.indexOf('\n## ', 1);
  const section = end === -1 ? rest : rest.slice(0, end);
  const names = [];
  for (const line of section.split('\n')) {
    const row = line.trim();
    /*
     * `includes('|')` and not `startsWith('|')`: the outer pipes are optional. Prose in this
     * section carries no pipe at all, so this does not start matching sentences — and a row
     * with a single pipe cannot yield two cells, which is the second condition.
     */
    if (!row.includes('|')) continue;
    // Strip the outer pipes if they are there, then split. `split('|')` on a row WITH them
    // yields ['', cell, ..., ''] — the strip is what makes both spellings produce one shape.
    const cells = row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    const first = cells[0].replace(/`/g, '').trim();
    if (first === '' || first === 'Tool' || /^:?-{2,}:?$/.test(first)) continue;
    names.push(first);
  }
  return names;
}

/** The names documented in the REAL README. */
function documentedTools() {
  return documentedToolsFrom(README);
}

describe('mcp/README.md — the documented tools ARE the implemented tools', () => {
  test('the table documents every tool and nothing else (Astra G23)', () => {
    /*
     * MUTATION: delete the `swan_get_gate_health` row from the README table. This goes RED,
     * which is the exact defect Astra found. MUTATION: rename a tool in `tools.mjs`. Also RED.
     */
    assert.deepEqual(
      documentedTools().slice().sort(),
      [...TOOL_NAMES].slice().sort(),
      'the README tool table and TOOL_NAMES disagree',
    );
  });

  test('the documented list is not empty and has no duplicates', () => {
    // Guards the guard: a parser that stopped matching would make the test above compare two
    // empty lists and pass. MUTATION: break the row split.
    const names = documentedTools();
    assert.ok(names.length >= 5, `the table parser found only ${names.length} rows`);
    assert.equal(new Set(names).size, names.length, 'a tool is documented twice');
  });

  test('RED — a table row escapes the parser on SPELLING (Astra H13)', () => {
    /*
     * Astra appended two ordinary rows — one without backticks, one with a digit — and the
     * extracted list did not change, so the exact-set assertion stayed green while the visible
     * table advertised tools that do not exist.
     *
     * MUTATION: restore the `^\|\s*`(swan_[a-z_]+)`` regex. Both rows become invisible and
     * this test goes RED.
     */
    for (const row of [
      '| swan_get_phantom | none | nonexistent |',
      '| `swan_get_state_v2` | none | nonexistent |',
      '| `swan_get_state` (alias) | none | nonexistent |',
      /*
       * ROUND 14 (Astra J07) — the SAME row with the OUTER PIPES OMITTED, which is valid
       * Markdown and which the round-13 parser could not see. Its presence in this list is the
       * whole point: a guard that decides membership by a punctuation convention has a scope
       * narrower than its name.
       *
       * MUTATION: restore `if (!line.trim().startsWith('|')) continue`. This row becomes
       * invisible and the test goes RED.
       */
      'swan_get_phantom_bare | none | nonexistent',
    ]) {
      /*
       * Inject at the END of the Tools table — immediately before the first `###` subsection
       * that follows the `## Tools` heading. An earlier draft anchored on `## Register it`,
       * which appears EARLIER in the file than `## Tools`, so the row landed outside the
       * section and the test failed for the wrong reason.
       */
      const toolsAt = README.indexOf('## Tools');
      assert.notEqual(toolsAt, -1, 'the README has no "## Tools" heading');
      const subAt = README.indexOf('\n### ', toolsAt);
      assert.notEqual(subAt, -1, 'the Tools section has no following subsection to anchor on');
      const injected = README.slice(0, subAt) + '\n' + row + README.slice(subAt);
      assert.notEqual(injected, README, 'the fixture failed to inject the row');
      const names = documentedToolsFrom(injected);
      assert.equal(names.length, TOOL_NAMES.length + 1,
        `the row ${JSON.stringify(row)} was invisible to the parser`);
    }
  });

  test('the boundary section does not restate a tool count (Astra G23)', () => {
    /*
     * The count is what drifted. This asserts the word-form counts are absent from the two
     * places that carried them, so a future edit cannot reintroduce a second source of truth
     * for a number the table already answers.
     *
     * MUTATION: put "its four tools" back into the boundary table. RED.
     */
    const boundary = README.slice(README.indexOf('### What "cannot write" is scoped to'),
      README.indexOf('## Register it'));
    assert.ok(boundary.length > 0, 'the boundary section moved — re-derive this test');
    for (const word of ['four tools', 'five tools', 'four-name', 'four ']) {
      assert.ok(
        !boundary.includes(word),
        `the boundary section restates a tool count ("${word}") — the table is the list`,
      );
    }
    // And the table must still be there to be the list.
    assert.match(boundary, /mcp\/server\.mjs` and every tool it exposes/);
  });
});
