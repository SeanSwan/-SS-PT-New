import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin enterprise session utilization truth', () => {
  it('excludes unscheduled available inventory from the utilization denominator', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminEnterpriseRoutes.mjs'), 'utf8');
    expect(source).toContain("COUNT(CASE WHEN status IN ('completed', 'cancelled', 'scheduled') THEN 1 END) as utilization_sessions");
    expect(source).toContain('const utilizationTotal = parseInt(row.utilization_sessions) || 0;');
    expect(source).toContain('utilizationRate: utilizationTotal > 0 ? Math.round((completed / utilizationTotal) * 100) : 0,');
  });
});
