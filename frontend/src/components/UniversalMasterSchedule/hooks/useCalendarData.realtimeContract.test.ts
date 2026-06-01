import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/hooks/useCalendarData.ts'),
  'utf8'
);

describe('useCalendarData real-time contract', () => {
  it('uses the authenticated SocketContext schedule events instead of a raw WebSocket placeholder', () => {
    expect(SOURCE).not.toContain('TODO: Implement WebSocket connection');
    expect(SOURCE).not.toContain('new WebSocket(');
    expect(SOURCE).toContain("import { useSocket } from '../../../context/SocketContext';");
    expect(SOURCE).toContain('const { socket } = useSocket();');
    expect(SOURCE).toContain("socket.on('schedule:update', handleScheduleUpdate)");
    expect(SOURCE).toContain("socket.on('schedule:sync_required', handleScheduleUpdate)");
    expect(SOURCE).toContain("socket.off('schedule:update', handleScheduleUpdate)");
    expect(SOURCE).toContain("socket.off('schedule:sync_required', handleScheduleUpdate)");
    expect(SOURCE).toContain('refreshDataRef.current?.(false, activeFilterOptionsRef.current)');
  });
});
