import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useAdminSessionsDialogState from './useAdminSessionsDialogState';

const DialogStateProbe = ({ initialNewSessionClientId }: { initialNewSessionClientId?: string }) => {
  const state = useAdminSessionsDialogState({ initialNewSessionClientId });

  return (
    <>
      <span data-testid="new-session-open">{String(state.openNewDialog)}</span>
      <span data-testid="new-session-client">{state.newSessionClient}</span>
    </>
  );
};

describe('useAdminSessionsDialogState deep links', () => {
  it('opens the new-session dialog with the paid activation client selected', () => {
    render(<DialogStateProbe initialNewSessionClientId="42" />);

    expect(screen.getByTestId('new-session-open')).toHaveTextContent('true');
    expect(screen.getByTestId('new-session-client')).toHaveTextContent('42');
  });
});
