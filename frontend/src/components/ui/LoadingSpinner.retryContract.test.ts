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

  it('announces client-roster loading from a persistent live region', () => {
    // A pulse with no live region is invisible to a screen reader: the user hears
    // nothing between "clients" being requested and the grid appearing.
    expect(clientsWorkspaceViewSource).toContain('<RosterAnnouncer role="status" aria-live="polite">');
  });

  it('keeps the live region out of the aria-busy subtree', () => {
    // ARIA 1.2 lets AT defer changes inside an aria-busy subtree until busy clears.
    // ContentArea is busy while the roster loads, so a live region nested inside it
    // can have its announcement deferred and then lost when the pulse unmounts.
    // RosterAnnouncer therefore sits directly under HubContainer, above ContentArea.
    expect(clientsWorkspaceViewSource).toContain('<ContentArea aria-busy={props.loading}>');
    // Structural, not substring: the comments here discuss aria-busy and role=status,
    // so a bare not.toContain() would fail on the documentation rather than the defect.
    expect(clientsWorkspaceViewSource).not.toMatch(/<LoadingPulse[^>]*aria-(busy|live)/);
    expect(clientsWorkspaceViewSource).not.toMatch(/<LoadingPulse[^>]*role=/);
    // The announcer must appear BEFORE ContentArea in the tree, i.e. not nested in it.
    const announcerAt = clientsWorkspaceViewSource.indexOf('<RosterAnnouncer');
    const contentAreaAt = clientsWorkspaceViewSource.indexOf('<ContentArea aria-busy');
    expect(announcerAt).toBeGreaterThan(-1);
    expect(announcerAt).toBeLessThan(contentAreaAt);
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
