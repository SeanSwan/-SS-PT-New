import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./AdminProgressChartsGrid', () => ({
  default: ({ clientId }: { clientId: number }) => (
    <div data-testid="admin-progress-grid">Client {String(clientId)}</div>
  ),
}));

import ProgressTabContent from './ProgressTabContent';

describe('ProgressTabContent client id boundary', () => {
  it('blocks malformed client ids before progress charts receive NaN', async () => {
    render(<ProgressTabContent clientId="fixture-424242" clientName="Fixture Client" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid client/i);
    expect(screen.queryByTestId('admin-progress-grid')).not.toBeInTheDocument();
  });
});
