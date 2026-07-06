import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalClientContext, { type ActiveClient } from '../../context/GlobalClientContext';
import BodyMap from './index';

const authState = vi.hoisted(() => ({
  value: null as null | { user: { id: number; role: string }; authAxios: { get: ReturnType<typeof vi.fn> } },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState.value,
}));

const clients: ActiveClient[] = [
  { id: 101, firstName: 'Ava', lastName: 'Rivera', email: 'ava@example.test', role: 'client' },
  { id: 202, firstName: '', lastName: '', email: 'client202@example.test', role: 'client' },
];

function renderBodyMapWithClients(initialActiveClient: ActiveClient | null = null) {
  const authAxios = {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [], count: 0 } }),
  };
  authState.value = { user: { id: 1, role: 'admin' }, authAxios };

  const Harness = () => {
    const [activeClient, setActiveClient] = useState<ActiveClient | null>(initialActiveClient);

    return (
      <GlobalClientContext.Provider
        value={{
          activeClient,
          setActiveClient,
          clearActiveClient: () => setActiveClient(null),
          clientList: clients,
          loadingClients: false,
          refreshClients: vi.fn(),
        }}
      >
        <BodyMap />
      </GlobalClientContext.Provider>
    );
  };

  render(<Harness />);
  return { authAxios };
}

describe('BodyMap standalone staff route interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.value = null;
  });

  it('selects a client then opens the pain-entry panel from a desktop region click', async () => {
    const { authAxios } = renderBodyMapWithClients();

    fireEvent.click(await screen.findByRole('button', { name: 'Select Left Shoulder' }));
    expect(screen.getByRole('status')).toHaveTextContent('Select a client before adding pain details.');
    expect(screen.queryByLabelText('Close panel')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Select a client for Pain Charts'), {
      target: { value: '101' },
    });

    await waitFor(() => expect(authAxios.get).toHaveBeenCalledWith('/api/pain-entries/101'));
    expect(await screen.findByText('Left Shoulder')).toBeInTheDocument();
    expect(screen.getByLabelText('Pain Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Pain Type')).toBeInTheDocument();
  });

  it('keeps the mobile-sized staff path functional when a client is already selected', async () => {
    window.innerWidth = 390;
    renderBodyMapWithClients(clients[0]);

    fireEvent.click(await screen.findByRole('button', { name: 'Select Left Knee' }));

    expect(await screen.findByText('Left Knee')).toBeInTheDocument();
    expect(screen.getByLabelText('Side')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});
