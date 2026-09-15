import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AdminPackagesView from './admin-packages-view';

const mocks = vi.hoisted(() => ({
  authAxios: { get: vi.fn() },
  navigate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

vi.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx'),
  'utf8',
);

describe('admin package special action contract', () => {
  beforeEach(() => {
    mocks.authAxios.get.mockReset();
    mocks.navigate.mockReset();
    mocks.toast.mockReset();
    mocks.authAxios.get.mockResolvedValue({
      data: {
        success: true,
        items: [{
          id: 7,
          name: 'Starter package',
          packageType: 'fixed',
          description: 'Eight sessions',
          price: 1400,
          pricePerSession: 175,
          sessions: 8,
          isActive: true,
          itemKind: 'training_package',
        }],
      },
    });
  });

  it('routes the mounted action from a rendered package row', async () => {
    render(<AdminPackagesView />);
    const action = await screen.findByRole('button', { name: 'Create client special' });

    fireEvent.click(action);

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/admin/admin-specials'));
  });

  it('routes the mounted action to the existing Create Special workflow', () => {
    // The existing role registry mounts AdminCreateSpecialManager at this
    // concrete path; the package action must enter that workflow directly.
    expect(source).toContain("'/dashboard/admin/admin-specials'");
    expect(source).toContain('Create client special');
    expect(source).toContain('useNavigate');
    expect(source).not.toContain('/api/admin/special-offers');
  });

  it('removes the obsolete percentage-discount send flow', () => {
    expect(source).not.toContain('openSendOfferDialog');
    expect(source).not.toContain('handleSendSpecialOffer');
    expect(source).not.toContain('offerDiscount');
    expect(source).not.toContain('discountPercentage');
    expect(source).not.toContain('Personal Message');
  });

  it('keeps package CRUD endpoints in place', () => {
    expect(source).toContain("'/api/admin/storefront'");
    expect(source).toContain("`/api/admin/storefront/${selectedPackage.id}`");
    expect(source).toContain('handleSaveEditedPackage');
    expect(source).toContain('handleCreateNewPackage');
  });
});
