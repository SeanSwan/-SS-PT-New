import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

    expect(applyTemplate).toHaveBeenCalledWith('session_manager', [101, 102]);
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
