import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it } from 'node:test';
import { auditCatalogIntegrity } from '../ai-workflow/world-engine-catalog-validation.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const canonical = Object.freeze({
  worlds: await fs.readFile(path.join(ROOT, 'docs/ai-workflow/design-brain/worlds.md'), 'utf8'),
  techniques: await fs.readFile(path.join(ROOT, 'docs/ai-workflow/design-brain/techniques.md'), 'utf8'),
  psychology: await fs.readFile(path.join(ROOT, 'docs/ai-workflow/design-brain/psychology.md'), 'utf8'),
});

function errorsFor(overrides) {
  return auditCatalogIntegrity({ ...canonical, ...overrides }).join('\n');
}

describe('World Engine entry-local catalog integrity', () => {
  it('accepts the canonical 18-world, 13-technique, 10-psychology catalogs', () => {
    assert.deepEqual(auditCatalogIntegrity(canonical), []);
  });

  it('rejects a duplicate WFX heading even when all IDs remain elsewhere', () => {
    const techniques = canonical.techniques.replace(
      /^## WFX-13\b/m,
      '## WFX-12',
    );
    assert.match(errorsFor({ techniques }), /technique catalog headings.*exact ordered unique/i);
  });

  it('rejects a duplicate PSY heading even when all IDs remain elsewhere', () => {
    const psychology = canonical.psychology.replace(
      /^### PSY-10\b/m,
      '### PSY-09',
    );
    assert.match(errorsFor({ psychology }), /psychology catalog headings.*exact ordered unique/i);
  });

  it('binds each canonical world ID to its own numbered entry', () => {
    const worlds = [
      'world.cinematic-reality.archive-editorial',
      canonical.worlds.replace(
        '`world.cinematic-reality.archive-editorial`',
        '`world.cinematic-reality.film-frame`',
      ),
    ].join('\n');
    assert.match(errorsFor({ worlds }), /world entry 18.*archive-editorial/i);
  });

  it('rejects duplicate or out-of-order world numbers', () => {
    const worlds = canonical.worlds.replace(
      /^### 18\. Archive Editorial/m,
      '### 17. Archive Editorial',
    );
    assert.match(errorsFor({ worlds }), /numbered exactly 1-18/i);
  });

  it('binds each gold marker to its own exemplar heading', () => {
    const worlds = canonical.worlds.replace(
      /^(### 1\. Glacier Cathedral).*$/m,
      '$1',
    );
    assert.match(errorsFor({ worlds }), /entry 1.*own Gold exemplar 1 of 2/i);
  });

  it('requires a substantive anti-cheese value in every world entry', () => {
    const worlds = canonical.worlds.replace(
      /(\*\*Anti-cheese:\*\*)[^\r\n]+/,
      '$1',
    );
    assert.match(errorsFor({ worlds }), /entry 1.*substantive anti-cheese/i);
  });

  it('rejects blank required WFX table values', () => {
    const techniques = canonical.techniques.replace(
      /^\| Job \/ payoff \|.*$/m,
      '| Job / payoff | |',
    );
    assert.match(errorsFor({ techniques }), /WFX-01.*Job \/ payoff/i);
  });

  it('rejects blank required psychology table values', () => {
    const psychology = canonical.psychology.replace(
      /^\| Falsifier \|.*$/m,
      '| Falsifier | |',
    );
    assert.match(errorsFor({ psychology }), /PSY-01.*Falsifier/i);
  });
});
