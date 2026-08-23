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
// They were held out of the tree for one commit because the live hub did not yet satisfy them.
// The hub has since been fixed (role=status/aria-live/aria-busy on the loading region, and an
// in-place ErrorNote retry replacing "reload the page"), so the guarantee is restored below —
// now pointed at the component BOTH audiences actually render, rather than at a legacy view no
// user ever loaded.
const clientsWorkspaceViewSource = readFileSync(
  resolve(srcDir, './components/DashBoard/workspaces/ClientsWorkspace.view.tsx'),
  'utf8'
);
const clientsWorkspaceSource = readFileSync(
  resolve(srcDir, './components/DashBoard/workspaces/ClientsWorkspace.tsx'),
  'utf8'
);

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

  it('announces client-roster loading to assistive tech instead of rendering a silent pulse', () => {
    // A pulse with no live region is invisible to a screen reader: the user hears
    // nothing between "clients" being requested and the grid appearing.
    expect(clientsWorkspaceViewSource).toContain('<LoadingPulse role="status" aria-live="polite">');
  });

  it('keeps aria-busy on the persistent container, never on the transient pulse', () => {
    // aria-busy="true" on a live region tells AT to defer announcing until it clears.
    // The pulse unmounts instead of clearing, so a hardcoded aria-busy there can
    // swallow the announcement. It belongs on ContentArea, which persists and flips
    // back to false when the fetch settles.
    expect(clientsWorkspaceViewSource).toContain('<ContentArea aria-busy={props.loading}>');
    // Matched structurally, not as a bare substring: the comment above LoadingContent
    // explains why aria-busy="true" is wrong and therefore contains that literal. A
    // naive not.toContain() fails on the documentation rather than on the defect.
    expect(clientsWorkspaceViewSource).not.toMatch(/<LoadingPulse[^>]*aria-busy/);
  });

  it('offers an in-place client-roster retry and never tells the user to reload the page', () => {
    // "reload the page" is the anti-pattern this whole contract exists to ban —
    // it throws away app state to recover from one failed fetch.
    expect(clientsWorkspaceViewSource).not.toContain('reload the page');
    expect(clientsWorkspaceViewSource).toContain('onRetry={props.onRetryLoad}');
    // The banner is only honest if the handler is actually wired to the fetch.
    expect(clientsWorkspaceSource).toContain('onRetryLoad={loadClients}');
  });
});
