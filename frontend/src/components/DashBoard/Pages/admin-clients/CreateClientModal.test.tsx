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

  it('requires confirmation before discarding a partially entered client draft', () => {
    const onClose = vi.fn();

    render(
      <CreateClientModal
        open
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Taylor' } });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /discard client draft/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    expect(screen.queryByRole('dialog', { name: /discard client draft/i })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    fireEvent.click(screen.getByRole('button', { name: /discard client draft/i }));

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

  it('normalizes padded mixed-case emails before validation and submit', async () => {
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
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: '  Taylor@Example.COM  ' } });
    fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: 'taylor.reed' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Client123' } });

    fireEvent.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      email: 'taylor@example.com',
    }));
  });

  it('omits hidden username and password fields for Move Fitness clients', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateClientModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /move fitness/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jordan' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Miles' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'jordan@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toMatchObject({
      clientSource: 'move_fitness',
      availableSessions: 0,
    });
    expect(submitted).not.toHaveProperty('username');
    expect(submitted).not.toHaveProperty('password');
  });

  it('offers External clients as free-tracking manual creates with no paid sessions', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateClientModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /external/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ari' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lane' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'ari@example.com' } });

    expect(screen.queryByLabelText(/^username/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toMatchObject({
      clientSource: 'external',
      availableSessions: 0,
    });
    expect(submitted).not.toHaveProperty('username');
    expect(submitted).not.toHaveProperty('password');
  });
});
