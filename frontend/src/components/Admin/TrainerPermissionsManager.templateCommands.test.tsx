import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrainerPermissionsHeader } from './TrainerPermissionsManager.Header';

const baseStats = {
  totalPermissions: 4,
  activePermissions: 4,
  revokedPermissions: 0,
  expiredPermissions: 0,
  expiringPermissions: 1,
  totalTrainers: 2,
  averagePermissionsPerTrainer: '2',
  permissionTypeDistribution: { view_progress: 2 },
};

describe('TrainerPermissionsManager template command strip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces safe starter template commands with selected trainer context', () => {
    const applyTemplate = vi.fn();

    render(
      <TrainerPermissionsHeader
        applyTemplate={applyTemplate}
        bulkProcessing={false}
        handleExportReport={vi.fn()}
        loadData={vi.fn()}
        permissionRequests={[]}
        selectedTemplate=""
        selectedTrainers={new Set([101, 102])}
        setSelectedTemplate={vi.fn()}
        setShowRequests={vi.fn()}
        showRequests={false}
        stats={baseStats}
      />
    );

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /apply new trainer starter template to selected trainers/i,
    })).toBeEnabled();
    expect(screen.getByRole('button', {
      name: /apply session manager template to selected trainers/i,
    })).toBeEnabled();
    expect(screen.getByRole('combobox', {
      name: /select a broader permission template/i,
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {
      name: /apply session manager template to selected trainers/i,
    }));

    expect(screen.getByRole('alertdialog', {
      name: /confirm session manager template/i,
    })).toBeInTheDocument();
    expect(applyTemplate).not.toHaveBeenCalled();
  });

  it('applies critical template commands only after an in-app confirmation click', () => {
    const applyTemplate = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <TrainerPermissionsHeader
        applyTemplate={applyTemplate}
        bulkProcessing={false}
        handleExportReport={vi.fn()}
        loadData={vi.fn()}
        permissionRequests={[]}
        selectedTemplate=""
        selectedTrainers={new Set([101, 102])}
        setSelectedTemplate={vi.fn()}
        setShowRequests={vi.fn()}
        showRequests={false}
        stats={baseStats}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: /apply session manager template to selected trainers/i,
    }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(applyTemplate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {
      name: /confirm session manager template/i,
    }));

    expect(applyTemplate).toHaveBeenCalledWith('session_manager', [101, 102]);
  });

  it('blocks the New Trainer critical template when in-app confirmation is cancelled', () => {
    const applyTemplate = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <TrainerPermissionsHeader
        applyTemplate={applyTemplate}
        bulkProcessing={false}
        handleExportReport={vi.fn()}
        loadData={vi.fn()}
        permissionRequests={[]}
        selectedTemplate=""
        selectedTrainers={new Set([101])}
        setSelectedTemplate={vi.fn()}
        setShowRequests={vi.fn()}
        showRequests={false}
        stats={baseStats}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: /apply new trainer starter template to selected trainers/i,
    }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', {
      name: /confirm new trainer template/i,
    })).toHaveTextContent(/Edit Client Workouts/i);

    fireEvent.click(screen.getByRole('button', {
      name: /cancel template confirmation/i,
    }));

    expect(applyTemplate).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog', {
      name: /confirm new trainer template/i,
    })).not.toBeInTheDocument();
  });

  it('requires in-app confirmation before applying elevated broader templates', () => {
    const applyTemplate = vi.fn();
    const setSelectedTemplate = vi.fn();

    render(
      <TrainerPermissionsHeader
        applyTemplate={applyTemplate}
        bulkProcessing={false}
        handleExportReport={vi.fn()}
        loadData={vi.fn()}
        permissionRequests={[]}
        selectedTemplate="senior_trainer"
        selectedTrainers={new Set([101])}
        setSelectedTemplate={setSelectedTemplate}
        setShowRequests={vi.fn()}
        showRequests={false}
        stats={baseStats}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: /apply selected broader permission template to selected trainers/i,
    }));

    expect(screen.getByRole('alertdialog', {
      name: /confirm senior trainer template/i,
    })).toHaveTextContent(/selected trainer/i);
    expect(applyTemplate).not.toHaveBeenCalled();
  });

  it('keeps starter template commands locked until a trainer is selected', () => {
    render(
      <TrainerPermissionsHeader
        applyTemplate={vi.fn()}
        bulkProcessing={false}
        handleExportReport={vi.fn()}
        loadData={vi.fn()}
        permissionRequests={[]}
        selectedTemplate=""
        selectedTrainers={new Set()}
        setSelectedTemplate={vi.fn()}
        setShowRequests={vi.fn()}
        showRequests={false}
        stats={baseStats}
      />
    );

    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /apply new trainer starter template to selected trainers/i,
    })).toBeDisabled();
    expect(screen.getByRole('button', {
      name: /apply session manager template to selected trainers/i,
    })).toBeDisabled();
  });
});
