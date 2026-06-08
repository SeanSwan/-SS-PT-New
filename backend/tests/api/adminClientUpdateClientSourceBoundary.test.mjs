import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/adminClientController.mjs'), 'utf8');

describe('admin client update clientSource boundary', () => {
  it('validates clientSource updates before writing the client row', () => {
    const start = controllerSource.indexOf('async updateClient');
    const end = controllerSource.indexOf('async restoreClient', start);
    const source = controllerSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(controllerSource).toContain('parseClientSource');
    expect(source).toContain('const normalizedClientSource = parseClientSource(updates.clientSource);');
    expect(source).toContain('Invalid clientSource. Must be one of:');
    expect(source).toContain('updates.clientSource = normalizedClientSource;');
    expect(source.indexOf('parseClientSource(updates.clientSource)')).toBeLessThan(
      source.indexOf('await client.update(safeUpdates')
    );
  });
});
