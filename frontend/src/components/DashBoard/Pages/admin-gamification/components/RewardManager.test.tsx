import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RewardManager from './RewardManager';
import type { RewardManagerProps } from './RewardManager.types';

const baseProps = (): RewardManagerProps => ({
  rewards: [
    {
      id: 'reward-1',
      name: 'Recovery Hoodie',
      description: 'Premium recovery reward',
      icon: 'Gift',
      pointCost: 500,
      tier: 'bronze',
      stock: 10,
      isActive: true,
      redemptionCount: 2,
    },
  ],
  onCreateReward: vi.fn(),
  onUpdateReward: vi.fn(),
  onDeleteReward: vi.fn(),
  onToggleStatus: vi.fn(),
  onUpdateStock: vi.fn(),
});

describe('RewardManager', () => {
  it('saves edited reward drafts through the existing update callback contract', () => {
    const props = baseProps();

    render(<RewardManager {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /edit recovery hoodie/i }));
    fireEvent.change(screen.getByLabelText('Reward Name *'), { target: { value: 'Recovery Jacket' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    expect(props.onUpdateReward).toHaveBeenCalledWith(
      'reward-1',
      expect.objectContaining({ name: 'Recovery Jacket', pointCost: 500, stock: 10 })
    );
  });

  it('updates stock through the stock dialog callback contract', () => {
    const props = baseProps();

    render(<RewardManager {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /stock: 10/i }));
    fireEvent.change(screen.getByLabelText('Stock Quantity'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /^update$/i }));

    expect(props.onUpdateStock).toHaveBeenCalledWith('reward-1', 7);
  });

  it('opens the edit dialog when a legacy reward has a malformed expiration date', () => {
    const props = baseProps();
    props.rewards[0].expiresAt = 'legacy-bad-date';

    render(<RewardManager {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /edit recovery hoodie/i }));

    expect((screen.getByLabelText('Expiration Date (Optional)') as HTMLInputElement).value).toBe('');
  });
});
