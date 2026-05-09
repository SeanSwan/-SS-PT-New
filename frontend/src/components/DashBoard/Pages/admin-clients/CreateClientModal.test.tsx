import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateClientModal from './CreateClientModal';

describe('CreateClientModal', () => {
  it('does not close when the backdrop is clicked', () => {
    const onClose = vi.fn();

    render(
      <CreateClientModal
        open
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('create-client-modal-overlay'));

    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses USA measurement labels for new client height and weight', () => {
    render(
      <CreateClientModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/weight \(lbs\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height \(ft\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height \(in\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/weight \(kg\)/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/height \(cm\)/i)).not.toBeInTheDocument();
  });

  it('submits pounds and total height inches', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateClientModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Reed' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'taylor@example.com' } });
    fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: 'taylor.reed' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Client123' } });
    fireEvent.change(screen.getByLabelText(/weight \(lbs\)/i), { target: { value: '185' } });
    fireEvent.change(screen.getByLabelText(/height \(ft\)/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/height \(in\)/i), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      weight: 185,
      height: 70,
    }));
  });
});
