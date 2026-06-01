import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scheduleDir = __dirname;
const srcDir = resolve(scheduleDir, '../..');

const boundarySource = readFileSync(resolve(scheduleDir, './ScheduleErrorBoundary.tsx'), 'utf8');
const enhancedWrapperSource = readFileSync(resolve(scheduleDir, './EnhancedScheduleWrapper.tsx'), 'utf8');
const adminSessionsSource = readFileSync(
  resolve(srcDir, './components/DashBoard/Pages/admin-sessions/AdminSessionsMainCard.tsx'),
  'utf8'
);

describe('ScheduleErrorBoundary retry contract', () => {
  it('retries schedule rendering locally without forcing a full page reload', () => {
    expect(enhancedWrapperSource).toContain('<ScheduleErrorBoundary>');
    expect(adminSessionsSource).toContain("import ScheduleErrorBoundary from '../../../Schedule/ScheduleErrorBoundary'");
    expect(adminSessionsSource).toContain('<ScheduleErrorBoundary>');

    expect(boundarySource).not.toContain('window.location.reload()');
    expect(boundarySource).toContain('handleRetry = (): void => {');
    expect(boundarySource).toContain('this.setState({ hasError: false, error: null });');
  });
});
