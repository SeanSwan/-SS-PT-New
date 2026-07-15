import { describe, expect, it } from 'vitest';

import {
  CLIENT_EXPORT_FIELDS,
  escapeCsvValue,
  serializeClientsToCsv,
} from '../../utils/clientExportCsv.mjs';

describe('client export CSV safety', () => {
  it('neutralizes spreadsheet formulas before applying CSV quoting', () => {
    expect(escapeCsvValue('=HYPERLINK("https://example.test")')).toBe('"\'=HYPERLINK(""https://example.test"")"');
    expect(escapeCsvValue('  @SUM(1,1)')).toBe("\"'  @SUM(1,1)\"");
    expect(escapeCsvValue('+15555550123')).toBe("'+15555550123");
    expect(escapeCsvValue('-2+3')).toBe("'-2+3");
    expect(escapeCsvValue('safe, "quoted" value')).toBe(
      '"safe, ""quoted"" value"'
    );
  });

  it('adds an Excel-compatible UTF-8 BOM and preserves the complete field header', () => {
    const csv = serializeClientsToCsv([{
      id: 42,
      firstName: 'Ren?e',
      lastName: 'Client',
      email: 'renee@example.test',
      phone: '+15555550123',
      clientSource: 'swanstudios',
      sessionBillingMode: 'package',
      availableSessions: 4,
      fitnessGoal: '=2+2',
      isActive: true,
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    }]);

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).split(/\r?\n/)[0]).toBe(CLIENT_EXPORT_FIELDS.join(','));
    expect(csv).toContain('Ren?e');
    expect(csv).toContain("'+15555550123");
    expect(csv).toContain("'=2+2");
  });
});
