import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scheduleSource = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx'),
  'utf8',
);
const serviceSource = readFileSync(
  resolve(process.cwd(), 'src/services/universal-master-schedule-service.ts'),
  'utf8',
);

describe('UniversalMasterSchedule admin booking credit contract', () => {
  it('routes client-assigned create and quick-book actions through the atomic admin booking endpoint', () => {
    expect(scheduleSource).toContain("const canQuickBook = mode === 'admin';");
    expect(scheduleSource).not.toContain("const canQuickBook = mode === 'client';");
    expect(serviceSource).toContain("this.api.post('/api/sessions/admin/book'");

    const createHandler = scheduleSource.slice(
      scheduleSource.indexOf('const handleCreateSession'),
      scheduleSource.indexOf('const handleBookSession'),
    );
    expect(createHandler).toContain('bookSessionForClient');
    expect(createHandler).toContain('createAvailableSessions');

    const quickBookHandler = scheduleSource.slice(
      scheduleSource.indexOf('const handleQuickBookConfirm'),
      scheduleSource.indexOf('const handleOpenConflictPanel'),
    );
    expect(quickBookHandler).toContain('bookSessionForClient');
    expect(quickBookHandler).not.toContain('createAvailableSessions');
  });
});
