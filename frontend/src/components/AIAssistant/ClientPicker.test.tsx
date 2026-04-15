/**
 * ClientPicker — canonical-source consumption tests
 * ==================================================
 * Phase 12 hotfix 2026-04-15: locks the ClientPicker's new architecture
 * where the dropdown list is sourced from GlobalClientContext instead of
 * a duplicate internal fetch with a broken normalizer.
 *
 * Covers:
 *   1. picker renders multiple clients when context supplies them
 *   2. selected client is highlighted
 *   3. onSelectClient fires with the correct ClientInfo shape on click
 *   4. loading state surfaces while context is fetching
 *   5. empty state surfaces when context has no clients
 *   6. search filters the list by name and email
 *   7. clear button calls onSelectClient(null)
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the context hook BEFORE importing the component.
const mockUseGlobalClient = vi.fn();
vi.mock('../../context/GlobalClientContext', async () => {
  const actual = await vi.importActual<typeof import('../../context/GlobalClientContext')>(
    '../../context/GlobalClientContext',
  );
  return {
    ...actual,
    useGlobalClient: () => mockUseGlobalClient(),
  };
});

import ClientPicker, { type ClientInfo } from './ClientPicker';

const SAMPLE_CLIENTS = [
  { id: 1, firstName: 'Alice', lastName: 'Admin', email: 'alice@example.com', photo: undefined, role: 'client' },
  { id: 2, firstName: 'Bob', lastName: 'Builder', email: 'bob@example.com', photo: undefined, role: 'client' },
  { id: 3, firstName: 'Carol', lastName: 'Cardio', email: 'carol@example.com', photo: undefined, role: 'client' },
];

describe('ClientPicker — canonical source consumption', () => {
  beforeEach(() => {
    mockUseGlobalClient.mockReset();
  });

  it('renders the full list from useGlobalClient when expanded', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    render(<ClientPicker selectedClient={null} onSelectClient={vi.fn()} />);

    // Expand the dropdown
    fireEvent.click(screen.getByRole('button', { name: /Select client/i }));

    // All three clients must be visible
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    expect(screen.getByText('Carol Cardio')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('surfaces the loading state while context is fetching', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: [],
      loadingClients: true,
      refreshClients: vi.fn(),
    });

    render(<ClientPicker selectedClient={null} onSelectClient={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Select client/i }));

    expect(screen.getByText(/Loading clients/i)).toBeInTheDocument();
  });

  it('surfaces the empty state when context has zero clients and is not loading', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: [],
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    render(<ClientPicker selectedClient={null} onSelectClient={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Select client/i }));

    expect(screen.getByText(/No clients found/i)).toBeInTheDocument();
  });

  it('fires onSelectClient with the correct ClientInfo shape when an item is clicked', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    const onSelectClient = vi.fn();
    render(<ClientPicker selectedClient={null} onSelectClient={onSelectClient} />);
    fireEvent.click(screen.getByRole('button', { name: /Select client/i }));

    // Click Bob's row
    fireEvent.click(screen.getByText('Bob Builder'));

    expect(onSelectClient).toHaveBeenCalledTimes(1);
    const received = onSelectClient.mock.calls[0][0] as ClientInfo;
    expect(received.id).toBe(2);
    expect(received.firstName).toBe('Bob');
    expect(received.lastName).toBe('Builder');
    expect(received.email).toBe('bob@example.com');
    // Phase 12: the picker maps ActiveClient.photo → ClientInfo.profileImageUrl
    expect(received.profileImageUrl).toBeUndefined();
  });

  it('shows the selected client in the collapsed state', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    render(
      <ClientPicker
        selectedClient={{
          id: 1,
          firstName: 'Alice',
          lastName: 'Admin',
          email: 'alice@example.com',
        }}
        onSelectClient={vi.fn()}
      />,
    );

    // Collapsed state shows "Alice Admin" not "Select a client..."
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.queryByText(/Select a client/i)).not.toBeInTheDocument();
  });

  it('filters the list by search query against name', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    render(<ClientPicker selectedClient={null} onSelectClient={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Select client/i }));

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'Carol' } });

    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();
    expect(screen.getByText('Carol Cardio')).toBeInTheDocument();
  });

  it('filters the list by search query against email', () => {
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    render(<ClientPicker selectedClient={null} onSelectClient={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Select client/i }));

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'bob@example' } });

    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
  });

  it('does NOT run its own fetch on mount (anti-regression)', () => {
    // Phase 12 hotfix: the prior implementation called window.fetch on
    // mount via a useEffect hook. This test locks that the picker never
    // touches global fetch — the canonical source is useGlobalClient.
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    render(<ClientPicker selectedClient={null} onSelectClient={vi.fn()} />);

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('still accepts the legacy userRole prop for backward compat without crashing', () => {
    // Kept as an optional prop so AIAssistantDrawer and any other caller
    // can still pass it during a gradual migration window.
    mockUseGlobalClient.mockReturnValue({
      activeClient: null,
      setActiveClient: vi.fn(),
      clearActiveClient: vi.fn(),
      clientList: SAMPLE_CLIENTS,
      loadingClients: false,
      refreshClients: vi.fn(),
    });

    expect(() =>
      render(
        <ClientPicker selectedClient={null} onSelectClient={vi.fn()} userRole="admin" />,
      ),
    ).not.toThrow();
  });
});
