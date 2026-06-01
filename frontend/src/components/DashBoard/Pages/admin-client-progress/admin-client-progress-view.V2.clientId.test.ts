import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseAdminProgressClientId } from './admin-client-progress-view.V2.logic';

const viewSource = readFileSync(
  resolve(__dirname, 'admin-client-progress-view.V2.tsx'),
  'utf8',
);

describe('AdminClientProgressView V2 client identity contract', () => {
  it('accepts only complete positive integer client ids for chart requests', () => {
    expect(parseAdminProgressClientId('61')).toBe(61);
    expect(parseAdminProgressClientId(' 61 ')).toBe(61);
    expect(parseAdminProgressClientId('61junk')).toBeNull();
    expect(parseAdminProgressClientId('0')).toBeNull();
    expect(parseAdminProgressClientId(null)).toBeNull();
  });

  it('uses the strict parser before fetching progress or mounting charts', () => {
    expect(viewSource).toContain("import { parseAdminProgressClientId } from './admin-client-progress-view.V2.logic';");
    expect(viewSource).toContain('const selectedClientChartId = parseAdminProgressClientId(selectedClientId);');
    expect(viewSource).toContain('if (selectedClientChartId) {');
    expect(viewSource).toContain('fetchClientProgress(String(selectedClientChartId));');
    expect(viewSource).toContain('clientProgress && selectedClient && selectedClientChartId');
    expect(viewSource).toContain('clientId={selectedClientChartId}');
    expect(viewSource).not.toContain('clientId={Number(selectedClientId)}');
  });
});
