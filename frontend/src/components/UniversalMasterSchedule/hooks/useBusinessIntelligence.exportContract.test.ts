import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/hooks/useBusinessIntelligence.ts'),
  'utf8'
);

describe('useBusinessIntelligence export contract', () => {
  it('exports business reports instead of leaving the action as a placeholder', () => {
    expect(SOURCE).not.toContain('TODO: Implement export functionality');
    expect(SOURCE).toContain('const downloadBusinessReport =');
    expect(SOURCE).toContain("text/csv;charset=utf-8");
    expect(SOURCE).toContain("application/vnd.ms-excel;charset=utf-8");
    expect(SOURCE).toContain("await import('jspdf')");
    expect(SOURCE).toContain("from '../../../services/pdfAutoTable'");
    expect(SOURCE).not.toContain("await import('jspdf-autotable')");
    expect(SOURCE).toContain('addAutoTable(doc');
    expect(SOURCE).toContain('doc.save(`swanstudios-business-report-${exportDate}.pdf`)');
  });
});
