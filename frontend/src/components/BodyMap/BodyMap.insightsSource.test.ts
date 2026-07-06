import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/BodyMap/index.tsx'), 'utf8');

describe('BodyMap pain chart insight wiring', () => {
  it('loads all pain entries so resolved history can render on the canonical surface', () => {
    expect(source).toContain("import PainChartInsightPanel from './PainChartInsightPanel';");
    expect(source).toContain('const result = await painService.getAll(userId);');
    expect(source).not.toContain('const result = await painService.getActive(userId);');
    expect(source).toContain('const activeEntries = useMemo(');
    expect(source).toContain('painEntries={activeEntries}');
    expect(source).toContain('<PainChartInsightPanel');
    expect(source).toContain('entries={entries}');
  });
});