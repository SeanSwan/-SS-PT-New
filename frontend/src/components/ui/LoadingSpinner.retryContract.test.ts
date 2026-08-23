import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const uiDir = __dirname;
const srcDir = resolve(uiDir, '../..');

const spinnerSource = readFileSync(resolve(uiDir, './LoadingSpinner.tsx'), 'utf8');
const workoutLoggerSource = readFileSync(
  resolve(srcDir, './components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx'),
  'utf8'
);
const workoutLoggerViewSource = readFileSync(
  resolve(srcDir, './components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.view.tsx'),
  'utf8'
);
// The trainer client-roster assertions previously read
// components/TrainerDashboard/ClientManagement/MyClientsView.tsx — an unmounted legacy tree deleted
// 2026-08-23 (audit F3). Those assertions covered `aria-busy="true"`,
// `aria-label="Loading your clients"` and `onClick={handleRefresh}`.
//
// They are NOT re-pointed at the live client hub, because the live hub does not yet satisfy them:
// ClientsWorkspace.view.tsx:236 renders `<LoadingPulse>Loading clients...</LoadingPulse>` with no
// aria-busy/role=status, and its load-error path (line ~270) tells the user to "reload the page"
// instead of offering an in-place retry — the exact anti-pattern this very contract exists to ban.
// Re-pointing would land a red test on main; deleting silently would retire the guarantee.
// Tracked instead as a real defect on SWA-64. Restore assertions here once the hub is fixed.

describe('LoadingSpinner retry contract', () => {
  it('restarts its own timeout state instead of reloading the page', () => {
    expect(workoutLoggerSource).toContain("import EnhancedWorkoutLoggerView from './EnhancedWorkoutLogger.view'");
    expect(workoutLoggerSource).toContain('onRetry={loadClientData}');
    expect(workoutLoggerViewSource).toContain("import { LoadingSpinner } from '../../ui/LoadingSpinner'");
    expect(spinnerSource).not.toContain('window.location.reload()');
    expect(spinnerSource).toContain('const [retryNonce, setRetryNonce] = useState(0);');
    expect(spinnerSource).toContain('const [loadStartTime, setLoadStartTime] = useState(() => Date.now());');
    expect(spinnerSource).toContain('setLoadStartTime(Date.now());');
    expect(spinnerSource).toContain('setRetryNonce(prevNonce => prevNonce + 1);');
    expect(spinnerSource).toContain('}, [timeout, retryNonce]);');
  });
});
