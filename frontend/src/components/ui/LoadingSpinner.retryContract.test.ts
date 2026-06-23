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
const clientsViewSource = readFileSync(
  resolve(srcDir, './components/TrainerDashboard/ClientManagement/MyClientsView.tsx'),
  'utf8'
);

describe('LoadingSpinner retry contract', () => {
  it('restarts its own timeout state instead of reloading the page', () => {
    expect(workoutLoggerSource).toContain("import EnhancedWorkoutLoggerView from './EnhancedWorkoutLogger.view'");
    expect(workoutLoggerSource).toContain('onRetry={loadClientData}');
    expect(workoutLoggerViewSource).toContain("import { LoadingSpinner } from '../../ui/LoadingSpinner'");
    expect(clientsViewSource).toContain('aria-busy="true"');
    expect(clientsViewSource).toContain('aria-label="Loading your clients"');
    expect(clientsViewSource).toContain('onClick={handleRefresh}');

    expect(spinnerSource).not.toContain('window.location.reload()');
    expect(spinnerSource).toContain('const [retryNonce, setRetryNonce] = useState(0);');
    expect(spinnerSource).toContain('const [loadStartTime, setLoadStartTime] = useState(() => Date.now());');
    expect(spinnerSource).toContain('setLoadStartTime(Date.now());');
    expect(spinnerSource).toContain('setRetryNonce(prevNonce => prevNonce + 1);');
    expect(spinnerSource).toContain('}, [timeout, retryNonce]);');
  });
});
