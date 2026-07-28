import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { mocks, resetChallengeWorkspaceMocks } from './ChallengeCommandWorkspace.renderTestHarness';
import ChallengeCommandWorkspace from './ChallengeCommandWorkspace';

describe('ChallengeCommandWorkspace', () => {
  beforeEach(resetChallengeWorkspaceMocks);

  const clickFirstTemplateDraftButton = () => {
    fireEvent.click(screen.getAllByRole('button', { name: /^Create draft from /i })[0]);
  };

  const clickDraftNext = (label: string) => {
    const draftForm = screen.getByLabelText('Create challenge draft');
    fireEvent.click(within(draftForm).getByRole('button', { name: `Next: ${label}` }));
  };

  const advanceDraftToPublish = () => {
    ['Goal', 'Validation', 'Schedule', 'Rewards', 'Preview', 'Publish'].forEach(clickDraftNext);
  };
  it('renders backend challenge templates as selectable command cards', () => {
    render(<ChallengeCommandWorkspace />);

    expect(screen.getByRole('heading', { name: 'Challenge Command Deck' })).toBeTruthy();
    expect(screen.getByText('7-Day Flexibility Rhythm')).toBeTruthy();
    expect(screen.getByText('7 Days')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();
  });


  it('labels assigned-session templates on command cards', () => {
    render(<ChallengeCommandWorkspace />);

    const card = screen.getByText('Three Planned Sessions').closest('article');
    expect(card).toBeTruthy();
    const templateCard = within(card as HTMLElement);
    expect(templateCard.getByText('Assigned sessions only')).toBeTruthy();
    expect(templateCard.getByText('Counts planned or trainer-assigned workout completions.')).toBeTruthy();
    expect(templateCard.getByRole('button', { name: 'Create draft from Three Planned Sessions' })).toBeTruthy();
  });
  it('opens the draft builder from a template card', () => {
    render(<ChallengeCommandWorkspace />);

    clickFirstTemplateDraftButton();

    expect(screen.getByLabelText('Participant cap')).toBeTruthy();
    expect(screen.queryByLabelText('Draft title')).toBeNull();
    clickDraftNext('Goal');

    const titleInput = screen.getByLabelText('Draft title') as HTMLInputElement;
    expect(titleInput.value).toBe('7-Day Flexibility Rhythm Draft');
  });

  it('keeps the draft builder visible after creation feedback and refreshes managed challenges', async () => {
    render(<ChallengeCommandWorkspace />);

    clickFirstTemplateDraftButton();
    advanceDraftToPublish();
    const draftForm = screen.getByLabelText('Create challenge draft');
    fireEvent.click(within(draftForm).getByRole('button', { name: 'Create Draft' }));

    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Draft created.')).toBeTruthy();
    expect(screen.getByLabelText('Create challenge draft')).toBeTruthy();
    expect(mocks.reloadManaged).toHaveBeenCalledTimes(1);
  });

  it('renders managed challenge records in the live tab without fixtures', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));

    const livePanel = within(screen.getByRole('tabpanel'));
    expect(livePanel.getByText('July Squad Spark')).toBeTruthy();
    expect(livePanel.getByText('Draft')).toBeTruthy();
    expect(livePanel.getByText('4 / 16')).toBeTruthy();
    expect(livePanel.getByText('12 Sessions')).toBeTruthy();
  });


  it('shows live-list errors without hiding loaded campaigns', () => {
    mocks.managed.error = 'Publish window expired';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));

    const livePanel = within(screen.getByRole('tabpanel'));
    expect(livePanel.getByRole('alert').textContent).toContain('Publish window expired');
    expect(livePanel.getByText('July Squad Spark')).toBeTruthy();
  });

  it('shows publish success feedback without hiding loaded campaigns', () => {
    mocks.managed.notice = 'July Squad Spark published for public discovery.';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));

    const livePanel = within(screen.getByRole('tabpanel'));
    expect(livePanel.getByRole('status').textContent).toContain('July Squad Spark published for public discovery.');
    expect(livePanel.getByText('July Squad Spark')).toBeTruthy();
  });
  it('uses visible audience rows for live-list counts and private publish readiness', () => {
    mocks.managed.challenges[0].currentParticipants = 0;

    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));

    const livePanel = within(screen.getByRole('tabpanel'));
    expect(livePanel.getByText('2 / 16')).toBeTruthy();
    expect(livePanel.queryByText('0 / 16')).toBeNull();
    expect(livePanel.getByRole('button', { name: 'Publish Private' })).toBeTruthy();
    expect(livePanel.queryByRole('button', { name: 'Add Audience First' })).toBeNull();
  });
  it('renders managed challenge result snapshots from real progress rows', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Results/i }));

    const resultsPanel = within(screen.getByRole('tabpanel'));
    expect(resultsPanel.getByLabelText('Challenge result summary')).toBeTruthy();
    expect(resultsPanel.getByText('Best Completion')).toBeTruthy();
    expect(resultsPanel.getAllByText('50%').length).toBeGreaterThan(0);
    expect(resultsPanel.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(resultsPanel.getByText('2 of 4')).toBeTruthy();
    expect(resultsPanel.getByText('Avery Stone')).toBeTruthy();
    const endpointLeaders = resultsPanel.getByLabelText('July Squad Spark endpoint participant leaders');
    expect(within(endpointLeaders).getByText('Avery Stone 100%')).toBeTruthy();
    expect(resultsPanel.queryByText('No result snapshots yet')).toBeNull();
  });

  it('normalizes string numeric result totals before rendering summaries', () => {
    const challenge = mocks.managed.challenges[0] as unknown as {
      currentParticipants: unknown;
      completionRate: unknown;
    };
    challenge.currentParticipants = '4';
    challenge.completionRate = '50';

    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Results/i }));

    const resultsPanel = within(screen.getByRole('tabpanel'));
    const summary = resultsPanel.getByLabelText('Challenge result summary');
    const participantTile = within(summary).getByText('Participants').parentElement;

    expect(participantTile?.textContent).toBe('Participants4');
    expect(resultsPanel.getByText('2 of 4')).toBeTruthy();
    expect(resultsPanel.queryByText('2 of 04')).toBeNull();
  });

  it('uses visible participant rows when the managed total is stale or missing', () => {
    const challenge = mocks.managed.challenges[0] as unknown as {
      currentParticipants: unknown;
      completionRate?: unknown;
    };
    challenge.currentParticipants = 0;
    challenge.completionRate = undefined;

    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Results/i }));

    const resultsPanel = within(screen.getByRole('tabpanel'));
    const summary = resultsPanel.getByLabelText('Challenge result summary');
    const participantTile = within(summary).getByText('Participants').parentElement;

    expect(participantTile?.textContent).toBe('Participants2');
    expect(resultsPanel.getByText('1 of 2')).toBeTruthy();
    expect(resultsPanel.queryByText('1 of 0')).toBeNull();
  });
  it('saves the real-client audience to a selected draft challenge', async () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Audience/i }));

    const audiencePanel = within(screen.getByRole('tabpanel'));
    expect(audiencePanel.getByText('Build the starting cohort')).toBeTruthy();
    expect(audiencePanel.getByText('Persistent Draft Audience')).toBeTruthy();
    expect(audiencePanel.getByLabelText('Draft challenge target')).toBeTruthy();
    expect(audiencePanel.getByText('Assigned clients')).toBeTruthy();
    expect(audiencePanel.getByText('Avery Stone')).toBeTruthy();
    expect(audiencePanel.getByText('Mika Rivera')).toBeTruthy();

    fireEvent.click(audiencePanel.getByRole('button', { name: /Select Visible/i }));
    expect(audiencePanel.getByText(/2 visible selected in Cohort mode\./)).toBeTruthy();
    fireEvent.click(audiencePanel.getByRole('button', { name: /Save Audience/i }));

    await waitFor(() => expect(mocks.saveManaged).toHaveBeenCalledWith('challenge-1', ['11', '12']));
    expect(await screen.findByText('2 clients saved to July Squad Spark.')).toBeTruthy();
  });
  it('switches to policy settings without leaving the workspace', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Settings/i }));

    const settingsPanel = within(screen.getByRole('tabpanel'));
    expect(settingsPanel.getByRole('heading', { name: 'Client challenge policy' })).toBeTruthy();
    const policyMatrix = within(settingsPanel.getByRole('region', { name: 'Client challenge creation policy' }));
    expect(policyMatrix.getByText('Private self-challenges')).toBeTruthy();
    expect(policyMatrix.getByText('Auto-publish')).toBeTruthy();
    expect(policyMatrix.getByText('Admin + Trainer')).toBeTruthy();
  });

  it('shows the governed client-submission gate in the submissions tab', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Submissions/i }));

    const submissionsPanel = within(screen.getByRole('tabpanel'));
    expect(submissionsPanel.getByRole('heading', { name: 'Client submission gate' })).toBeTruthy();
    expect(submissionsPanel.getByText('Off until entitlement')).toBeTruthy();
    expect(submissionsPanel.getByText('Review queue empty by policy')).toBeTruthy();
    expect(submissionsPanel.getByText('Backend queue confirms client-created submissions are closed.')).toBeTruthy();
    expect(submissionsPanel.queryByText('No submissions awaiting review')).toBeNull();
  });

  it('links workspace tabs to the mounted active panel for assistive technology', () => {
    render(<ChallengeCommandWorkspace />);

    const initialPanel = screen.getByRole('tabpanel');
    expect(initialPanel.getAttribute('id')).toBe('challenge-workspace-panel');

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.getAttribute('aria-controls')).toBe('challenge-workspace-panel');
    }

    const liveTab = screen.getByRole('tab', { name: /Live Challenges/i });
    expect(liveTab.getAttribute('id')).toBe('challenge-workspace-tab-live');

    fireEvent.click(liveTab);

    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('id')).toBe('challenge-workspace-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('challenge-workspace-tab-live');
  });

  it('supports keyboard navigation across workspace tabs', () => {
    render(<ChallengeCommandWorkspace />);

    const templatesTab = screen.getByRole('tab', { name: /Templates/i });
    const liveTab = screen.getByRole('tab', { name: /Live Challenges/i });
    const settingsTab = screen.getByRole('tab', { name: /Settings/i });

    templatesTab.focus();
    expect(document.activeElement).toBe(templatesTab);
    expect(templatesTab.getAttribute('tabindex')).toBe('0');
    expect(liveTab.getAttribute('tabindex')).toBe('-1');

    fireEvent.keyDown(templatesTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(liveTab);
    expect(liveTab.getAttribute('aria-selected')).toBe('true');
    expect(templatesTab.getAttribute('tabindex')).toBe('-1');
    expect(liveTab.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('challenge-workspace-tab-live');

    fireEvent.keyDown(liveTab, { key: 'End' });
    expect(document.activeElement).toBe(settingsTab);
    expect(settingsTab.getAttribute('aria-selected')).toBe('true');
    expect(settingsTab.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(settingsTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(templatesTab);
    expect(templatesTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(templatesTab, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(settingsTab);
    expect(settingsTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(settingsTab, { key: 'Home' });
    expect(document.activeElement).toBe(templatesTab);
    expect(templatesTab.getAttribute('aria-selected')).toBe('true');
  });

  it('keeps workspace refresh disabled while the submissions queue is loading', () => {
    mocks.submissions.loading = true;
    render(<ChallengeCommandWorkspace />);

    const refreshButton = screen.getByLabelText('Refresh challenge workspace') as HTMLButtonElement;
    expect(refreshButton.disabled).toBe(true);
  });

  it('refreshes the authenticated catalog and managed challenge list on command', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByLabelText('Refresh challenge workspace'));

    expect(mocks.reload).toHaveBeenCalledTimes(1);
    expect(mocks.reloadManaged).toHaveBeenCalledTimes(1);
    expect(mocks.reloadSubmissions).toHaveBeenCalledTimes(1);
  });
});

