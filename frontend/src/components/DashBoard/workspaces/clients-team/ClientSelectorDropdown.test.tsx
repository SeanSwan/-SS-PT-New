import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientSelectorDropdown from './ClientSelectorDropdown';

describe('ClientSelectorDropdown', () => {
  it('uses source-aware session policy labels in the all-clients list', () => {
    localStorage.clear();

    render(
      <ClientSelectorDropdown
        clients={[
          {
            id: 1,
            firstName: 'Mia',
            lastName: 'Move',
            email: 'mia@example.test',
            clientSource: 'move_fitness',
            availableSessions: 8,
          },
          {
            id: 2,
            firstName: 'Sean',
            lastName: 'Swan',
            email: 'sean@example.test',
            clientSource: 'swanstudios',
            availableSessions: 4,
          },
        ]}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /select a client/i }));

    expect(screen.getByText(/free tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/4 paid sessions/i)).toBeInTheDocument();
    expect(screen.queryByText(/8 sessions/i)).not.toBeInTheDocument();
  });

  it('labels a selected external client as external, not SwanStudios', () => {
    render(
      <ClientSelectorDropdown
        clients={[
          {
            id: 1,
            firstName: 'Eli',
            lastName: 'External',
            email: 'eli@example.test',
            clientSource: 'external',
          },
        ]}
        selectedId={1}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('External')).toBeInTheDocument();
    expect(screen.getByText(/External\s*-\s*free tracking/i)).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.getAllByText('EXT')).toHaveLength(2);
    expect(screen.queryByText('SwanStudios')).not.toBeInTheDocument();
    expect(screen.queryByText('SS')).not.toBeInTheDocument();
  });

  it('falls back to email identity when selected client names are missing', () => {
    localStorage.clear();

    render(
      <ClientSelectorDropdown
        clients={[
          {
            id: 7,
            firstName: '',
            lastName: '',
            email: 'fallback.client@example.test',
            clientSource: 'swanstudios',
            availableSessions: 2,
          },
        ]}
        selectedId={7}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /selected: fallback.client@example.test/i })).toBeInTheDocument();
    expect(screen.getAllByText('fallback.client@example.test')).toHaveLength(2);
    expect(screen.getAllByText('FA')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /selected: fallback.client@example.test/i }));

    expect(screen.getByRole('option', { name: /fallback.client@example.test/i })).toBeInTheDocument();
  });

  it('keeps selector, row, clear-search, and new-client actions as explicit buttons', () => {
    localStorage.clear();

    render(
      <ClientSelectorDropdown
        clients={[
          {
            id: 9,
            firstName: 'Fixture',
            lastName: 'Client',
            email: 'fixture@example.test',
            clientSource: 'swanstudios',
          },
        ]}
        selectedId={null}
        onSelect={vi.fn()}
        onNewClient={vi.fn()}
      />
    );

    const selector = screen.getByRole('button', { name: /select a client/i });
    expect(selector).toHaveAttribute('type', 'button');

    fireEvent.click(selector);

    const row = screen.getByRole('option', { name: /fixture client/i });
    expect(row).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /onboard new client via swan coach/i })).toHaveAttribute('type', 'button');

    fireEvent.change(screen.getByLabelText(/search clients/i), {
      target: { value: 'fixture' },
    });

    expect(screen.getByRole('button', { name: /clear client search/i })).toHaveAttribute('type', 'button');
  });

  it('selects a client even when recent-client storage is corrupted', () => {
    localStorage.setItem('ss-recent-clients', '{bad-json');
    const onSelect = vi.fn();

    render(
      <ClientSelectorDropdown
        clients={[
          {
            id: 11,
            firstName: 'Storage',
            lastName: 'Safe',
            email: 'storage.safe@example.test',
            clientSource: 'swanstudios',
          },
        ]}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /select a client/i }));
    const row = screen.getByRole('option', { name: /storage safe/i });

    expect(() => fireEvent.click(row)).not.toThrow();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ss-recent-clients')).toBe('[11]');
  });

  it('closes the client list with Escape', () => {
    render(
      <ClientSelectorDropdown
        clients={[
          {
            id: 12,
            firstName: 'Escape',
            lastName: 'Ready',
            email: 'escape.ready@example.test',
            clientSource: 'swanstudios',
          },
        ]}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /select a client/i }));
    expect(screen.getByRole('listbox', { name: /client list/i })).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('listbox', { name: /client list/i })).not.toBeInTheDocument();
  });
});
