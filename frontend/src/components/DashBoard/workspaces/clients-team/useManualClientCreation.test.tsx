import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authAxios: {},
  createClient: vi.fn(),
  createExternalClient: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

vi.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../../../services/adminClientService', () => ({
  createAdminClientService: () => ({
    createClient: mocks.createClient,
    createExternalClient: mocks.createExternalClient,
  }),
}));

import { useManualClientCreation } from './useManualClientCreation';

const Harness = ({ onClientsChanged }: { onClientsChanged: () => void }) => {
  const { handleManualCreate } = useManualClientCreation({ onClientsChanged });

  return (
    <button
      type="button"
      onClick={() => {
        void handleManualCreate({
          firstName: '',
          lastName: '',
          email: 'created.client@example.test',
          username: 'created-client',
          password: 'TempPass123!',
          clientSource: 'swanstudios',
        });
      }}
    >
      Create
    </button>
  );
};

describe('useManualClientCreation', () => {
  it('uses fallback identity in the created-client toast', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 7,
          firstName: '',
          lastName: '',
          email: 'created.client@example.test',
        },
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
        description: 'created.client@example.test is ready in Client Hub.',
      }));
    });
    expect(onClientsChanged).toHaveBeenCalledTimes(1);
  });
});
