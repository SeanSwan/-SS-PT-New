import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createQuickCoachCommandClientMock,
  renderPage,
  resetCoachCommandCenterMocks,
  useCoachIntakeQueueMock,
} from './CoachCommandCenterPage.test.harness';

const PLACEHOLDER = 'Talk or type to Swan Coach...';
const opsStylesSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.opsStyles.ts'), 'utf8');
const crystallineStylesSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.crystallineFocusStyles.ts'), 'utf8');
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const openOpsRail = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More coach actions$/i }));
  return screen.getByLabelText('Coach operations command surface');
};

describe('CoachCommandCenterPage Operations drawer', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('keeps the actions drawer above global assistant overlays on mobile', () => {
    expect(opsStylesSource).toMatch(/\.drawer-scrim\s*\{[\s\S]*z-index:\s*10040;/);
    expect(opsStylesSource).toMatch(/\.right-rail\s*\{[\s\S]*z-index:\s*10050;/);
    expect(opsStylesSource).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.right-rail\s*\{[\s\S]*height:\s*86vh;/);
    expect(opsStylesSource).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.right-rail\s*\{[\s\S]*max-height:\s*760px;/);
  });

  it('keeps the wide Coach Command Center layout from crowding account controls and ops cards', () => {
    expect(crystallineStylesSource).toContain("grid-template-areas: 'header header' 'tabs ops' 'content ops' 'dock ops' 'account ops'");
    expect(crystallineStylesSource).toContain('grid-template-columns: minmax(0, 1fr) minmax(336px, clamp(336px, 23vw, 392px))');
    expect(crystallineStylesSource).toContain('max-width: min(100%, 1680px)');
    expect(crystallineStylesSource).toMatch(/\.right-rail\s*\{[\s\S]*min-width:\s*0;/);
    expect(opsStylesSource).toMatch(/\.right-rail\s*\{[\s\S]*container-type:\s*inline-size;/);
    expect(opsStylesSource).toContain('repeat(auto-fit, minmax(150px, 1fr))');
    expect(opsStylesSource).toContain('@container (max-width: 330px)');
    expect(opsStylesSource).toMatch(/\.workout-command-card\s*\{[\s\S]*overflow:\s*hidden;/);
  });
  it('opens and closes the operator drawer with aria-expanded and Escape handling', () => {
    renderPage();

    const opsTrigger = screen.getByRole('button', { name: /^More coach actions$/i });
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(opsTrigger);
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the unified Coach intake queue and reaches the embedded PLAUD merge workflow', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=plaud&mergeRequestId=11111111-2222-3333-4444-555555555555');

    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12, enabled: true });
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveAttribute('data-embedded', 'true');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveTextContent('11111111-2222-3333-4444-555555555555');

    fireEvent.click(screen.getByRole('button', { name: /^Open intake review$/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toHaveTextContent('Unified actionable 9');
  });

  it('shows real queue counts in the operations rail instead of static prototype values', () => {
    renderPage();

    const operationsRail = openOpsRail();
    expect(within(operationsRail).getByText(/Coach Actions/i)).toBeInTheDocument();
    expect(within(operationsRail).queryByRole('heading', { name: /Operator controls/i })).not.toBeInTheDocument();
    expect(within(operationsRail).getByRole('heading', { name: /Queue snapshot/i })).toBeInTheDocument();
    expect(within(operationsRail).queryByText(/Use Nutrition Context/i)).not.toBeInTheDocument();
    expect(within(operationsRail).queryByRole('heading', { name: /Next operator action/i })).not.toBeInTheDocument();
    expect(within(operationsRail).getByText('Ready drafts').closest('li')).toHaveTextContent('3');
    expect(within(operationsRail).getByText('Client confirmation holds').closest('li')).toHaveTextContent('1');
    expect(within(operationsRail).getByText('Clarification holds').closest('li')).toHaveTextContent('5');
    expect(within(operationsRail).getByText('Duplicate-risk holds').closest('li')).toHaveTextContent('2');
  });

  it('makes Sean/admin self logging the first ops action when no client is selected', () => {
    renderPage('/dashboard/admin/coach-assistant');

    const operationsRail = openOpsRail();
    const priorityActions = within(operationsRail).getByLabelText('Priority coach actions');
    const targetSafety = within(operationsRail).getByLabelText('Coach Actions target and safety');
    const recommendedMove = within(operationsRail).getByLabelText('Recommended Coach Actions move');
    const logNow = within(priorityActions).getByRole('link', { name: /Log my workout now/i });

    expect(within(operationsRail).getByText(/Do this next/i)).toBeInTheDocument();
    expect(within(recommendedMove).getByText(/Log my workout/i)).toBeInTheDocument();
    expect(within(operationsRail).queryByLabelText('Coach Actions mission checklist')).not.toBeInTheDocument();
    expect(targetSafety).toHaveTextContent(/My workout log/);
    expect(targetSafety).toHaveTextContent(/Save happens in Logger/i);
    expect(within(operationsRail).getByRole('heading', { name: /Workout command center/i })).toBeInTheDocument();
    expect(within(operationsRail).getAllByText('My workout log').length).toBeGreaterThan(0);
    expect(logNow).toHaveAttribute('href', '/dashboard/admin/log-my-workout?loadPlan=today');
    expect(within(priorityActions).getByRole('link', { name: /Open workout builder/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?self=1&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday',
    );
  });

  it('makes selected-client workout logging and building one-tap ops actions', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const operationsRail = openOpsRail();
    const priorityActions = within(operationsRail).getByLabelText('Priority coach actions');
    const logNow = within(priorityActions).getByRole('link', { name: /Log workout now/i });
    const builder = within(priorityActions).getByRole('link', { name: /Open workout builder/i });

    expect(logNow).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(builder).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );
    expect(within(priorityActions).queryByRole('button', { name: /Draft in chat/i })).not.toBeInTheDocument();
    expect(within(priorityActions).getByRole('button', { name: /^Import audio$/i })).toBeInTheDocument();
    expect(within(priorityActions).queryByText(/^PLAUD$/i)).not.toBeInTheDocument();
    fireEvent.click(within(priorityActions).getByRole('button', { name: /Review next intake/i }));
    expect(screen.getByRole('button', { name: /^More coach actions$/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('mock-coach-intake-workspace')).toHaveTextContent('Unified actionable 9');
  });

  it('routes trainer pick-client launchpad actions straight into log-workout client selection', () => {
    renderPage('/dashboard/trainer/coach-assistant', 'trainer');

    const operationsRail = openOpsRail();
    const priorityActions = within(operationsRail).getByLabelText('Priority coach actions');
    const targetSafety = within(operationsRail).getByLabelText('Coach Actions target and safety');

    expect(within(operationsRail).queryByLabelText('Coach Actions mission checklist')).not.toBeInTheDocument();
    expect(targetSafety).toHaveTextContent(/No client locked/);
    expect(targetSafety).toHaveTextContent(/No workout writes until a target is chosen/i);
    expect(within(priorityActions).getByRole('link', { name: /Pick client first/i })).toHaveAttribute(
      'href',
      '/dashboard/trainer/clients?intent=log_workout',
    );
  });

  it('adds a client from the operator drawer with human-facing copy without staging canned composer text', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    const operationsRail = openOpsRail();
    const setupToggle = within(operationsRail).getByRole('button', { name: /client setup/i });

    expect(setupToggle).toHaveAttribute('aria-pressed', 'false');
    expect(setupToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(operationsRail).queryByRole('heading', { name: /Add client fast/i })).not.toBeInTheDocument();

    fireEvent.click(setupToggle);

    expect(setupToggle).toHaveAttribute('aria-pressed', 'true');
    expect(setupToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(operationsRail).getByRole('heading', { name: /Add client fast/i })).toBeInTheDocument();
    expect(within(operationsRail).queryByText(/stub/i)).not.toBeInTheDocument();
    expect(within(within(operationsRail).getByLabelText('Client source')).getByRole('option', { name: 'External' })).toBeInTheDocument();
    fireEvent.change(within(operationsRail).getByLabelText('Client name'), { target: { value: 'Ava Stone' } });
    fireEvent.change(within(operationsRail).getByLabelText('Client source'), { target: { value: 'external' } });
    fireEvent.click(within(operationsRail).getByRole('button', { name: /Add client/i }));

    await waitFor(() => {
      expect(createQuickCoachCommandClientMock).toHaveBeenCalledWith({ fullName: 'Ava Stone', clientSource: 'external' });
    });

    expect(composerInput()).toHaveValue('');
    expect(screen.getAllByText(/Ava Stone - client ready/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No workout log was written/i).length).toBeGreaterThan(0);
  });
});
