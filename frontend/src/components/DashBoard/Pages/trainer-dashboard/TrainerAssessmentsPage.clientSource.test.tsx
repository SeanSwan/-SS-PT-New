import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainerAssessmentsPage from './TrainerAssessmentsPage';

const { mockAuthAxios, mockUser } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    post: vi.fn(),
  },
  mockUser: { id: 9001, role: 'trainer' },
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, user: mockUser }),
}));

vi.mock('./components/NASMTeachMode', () => ({
  default: () => <div data-testid="mock-nasm-teach-mode" />,
}));

const HISTORY_RESPONSE = { data: { success: true, data: { analyses: [] } } };
const TRAINER_ASSIGNMENTS_RESPONSE = {
  data: {
    success: true,
    assignments: [
      {
        id: 77,
        status: 'active',
        client: {
          id: 424242,
          firstName: 'Assigned',
          lastName: 'Client',
          username: 'assigned-client',
        },
      },
    ],
  },
};
const ADMIN_CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [
        {
          id: 515151,
          firstName: 'Admin',
          lastName: 'Client',
          username: 'admin-client',
        },
      ],
    },
  },
};

describe('TrainerAssessmentsPage client source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.id = 9001;
    mockUser.role = 'trainer';
    mockAuthAxios.get.mockImplementation((path: string) => {
      if (path === '/api/movement-analysis') return Promise.resolve(HISTORY_RESPONSE);
      if (path === '/api/client-trainer-assignments/trainer/9001') {
        return Promise.resolve(TRAINER_ASSIGNMENTS_RESPONSE);
      }
      if (path === '/api/admin/clients') return Promise.resolve(ADMIN_CLIENTS_RESPONSE);
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
  });

  it('loads trainer clients through the trainer assignment endpoint, not the admin-only roster', async () => {
    render(<TrainerAssessmentsPage />);

    expect(await screen.findByRole('option', { name: 'Assigned Client' })).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/client-trainer-assignments/trainer/9001');
    expect(mockAuthAxios.get).not.toHaveBeenCalledWith('/api/admin/clients');
  });

  it('keeps admins on the admin roster endpoint', async () => {
    mockUser.id = 1;
    mockUser.role = 'admin';

    render(<TrainerAssessmentsPage />);

    expect(await screen.findByRole('option', { name: 'Admin Client' })).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/admin/clients');
  });
});
