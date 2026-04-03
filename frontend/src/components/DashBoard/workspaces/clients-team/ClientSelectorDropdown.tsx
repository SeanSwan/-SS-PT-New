/**
 * ┌─── SUB-COMPONENT: ClientSelectorDropdown ─────────────────┐
 * │ PARENT: ClientsWorkspace (Client Hub)                      │
 * │ PURPOSE: Searchable dropdown to select a client with       │
 * │          recent/favorites, avatar, and client source badge  │
 * │ Props: { clients, selectedId, onSelect, loading }          │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Search, ChevronDown, Star, Clock, UserPlus, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface ClientOption {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  clientSource?: string;
  isActive?: boolean;
  availableSessions?: number;
  workoutCount?: number;
  photo?: string;
}

interface ClientSelectorDropdownProps {
  clients: ClientOption[];
  selectedId: number | null;
  onSelect: (client: ClientOption) => void;
  onNewClient?: () => void;
  loading?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const SelectorWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
`;

const SelectorButton = styled.button<{ $hasSelection: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  min-height: 52px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const Avatar = styled.div<{ $source?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $source }) =>
    $source === 'move_fitness'
      ? 'linear-gradient(135deg, #C6A84B 0%, #8B5CF6 100%)'
      : 'linear-gradient(135deg, #002060 0%, #60C0F0 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

const SelectionInfo = styled.div`
  flex: 1;
  text-align: left;
  min-width: 0;
`;

const SelectionName = styled.div`
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SelectionMeta = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Fira Code', monospace;
`;

const SourceBadge = styled.span<{ $source: string }>`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $source }) =>
    $source === 'move_fitness'
      ? 'rgba(198, 168, 75, 0.15)'
      : 'rgba(96, 192, 240, 0.12)'};
  color: ${({ $source }) =>
    $source === 'move_fitness'
      ? 'var(--accent-gold, #C6A84B)'
      : 'var(--accent-primary, #60C0F0)'};
`;

const Dropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 380px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: ${({ $open }) => $open ? 'block' : 'none'};

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(96, 192, 240, 0.15);
    border-radius: 2px;
  }
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  position: sticky;
  top: 0;
  background: var(--bg-surface, #1A1A24);
  z-index: 1;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }
`;

const SectionLabel = styled.div`
  padding: 8px 14px 4px;
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
`;

const ClientRow = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  min-height: 48px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

const NewClientRow = styled(ClientRow)`
  color: var(--accent-secondary, #8B5CF6);
  font-weight: 600;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

const EmptyMsg = styled.div`
  padding: 24px 14px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = 'ss-recent-clients';

const ClientSelectorDropdown: React.FC<ClientSelectorDropdownProps> = ({
  clients,
  selectedId,
  onSelect,
  onNewClient,
  loading,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Recent clients from localStorage
  const recentIds: number[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5);
    } catch { return []; }
  }, [open]); // re-read when dropdown opens

  const addToRecent = useCallback((id: number) => {
    const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const updated = [id, ...prev.filter((x: number) => x !== id)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedId), [clients, selectedId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    );
  }, [clients, search]);

  const recentClients = useMemo(
    () => recentIds.map(id => clients.find(c => c.id === id)).filter(Boolean) as ClientOption[],
    [recentIds, clients]
  );

  const handleSelect = useCallback((client: ClientOption) => {
    onSelect(client);
    addToRecent(client.id);
    setOpen(false);
    setSearch('');
  }, [onSelect, addToRecent]);

  const initials = (c: ClientOption) =>
    `${(c.firstName || '?')[0]}${(c.lastName || '?')[0]}`.toUpperCase();

  return (
    <SelectorWrap ref={wrapRef}>
      <SelectorButton
        $hasSelection={!!selectedClient}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={selectedClient ? `Selected: ${selectedClient.firstName} ${selectedClient.lastName}` : 'Select a client'}
      >
        {selectedClient ? (
          <>
            <Avatar $source={selectedClient.clientSource}>{initials(selectedClient)}</Avatar>
            <SelectionInfo>
              <SelectionName>{selectedClient.firstName} {selectedClient.lastName}</SelectionName>
              <SelectionMeta>
                {selectedClient.clientSource === 'move_fitness' ? 'Move Fitness' : 'SwanStudios'}
                {selectedClient.workoutCount != null && ` · ${selectedClient.workoutCount} workouts`}
              </SelectionMeta>
            </SelectionInfo>
            <SourceBadge $source={selectedClient.clientSource || 'swanstudios'}>
              {selectedClient.clientSource === 'move_fitness' ? 'MF' : 'SS'}
            </SourceBadge>
          </>
        ) : (
          <>
            <Search size={18} style={{ opacity: 0.4 }} />
            <span style={{ opacity: 0.5 }}>{loading ? 'Loading clients...' : 'Select a client...'}</span>
          </>
        )}
        <ChevronDown size={16} style={{ opacity: 0.4, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </SelectorButton>

      <Dropdown $open={open} role="listbox" aria-label="Client list">
        <SearchWrap>
          <Search size={16} style={{ opacity: 0.4 }} />
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search clients"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}>
              <X size={14} />
            </button>
          )}
        </SearchWrap>

        {/* Recent clients */}
        {!search && recentClients.length > 0 && (
          <>
            <SectionLabel><Clock size={10} style={{ marginRight: 4 }} /> Recent</SectionLabel>
            {recentClients.map(c => (
              <ClientRow key={`recent-${c.id}`} $active={c.id === selectedId} onClick={() => handleSelect(c)} role="option" aria-selected={c.id === selectedId}>
                <Avatar $source={c.clientSource}>{initials(c)}</Avatar>
                <SelectionInfo>
                  <SelectionName>{c.firstName} {c.lastName}</SelectionName>
                  <SelectionMeta>{c.clientSource === 'move_fitness' ? 'Move Fitness' : 'SwanStudios'}</SelectionMeta>
                </SelectionInfo>
              </ClientRow>
            ))}
          </>
        )}

        {/* All clients */}
        <SectionLabel>All Clients ({filtered.length})</SectionLabel>
        {filtered.length === 0 ? (
          <EmptyMsg>{search ? 'No clients match your search' : 'No clients found'}</EmptyMsg>
        ) : (
          filtered.map(c => (
            <ClientRow key={c.id} $active={c.id === selectedId} onClick={() => handleSelect(c)} role="option" aria-selected={c.id === selectedId}>
              <Avatar $source={c.clientSource}>{initials(c)}</Avatar>
              <SelectionInfo>
                <SelectionName>{c.firstName} {c.lastName}</SelectionName>
                <SelectionMeta>
                  {c.clientSource === 'move_fitness' ? 'Move Fitness' : 'SwanStudios'}
                  {c.availableSessions != null && c.availableSessions > 0 && ` · ${c.availableSessions} sessions`}
                </SelectionMeta>
              </SelectionInfo>
              <SourceBadge $source={c.clientSource || 'swanstudios'}>
                {c.clientSource === 'move_fitness' ? 'MF' : 'SS'}
              </SourceBadge>
            </ClientRow>
          ))
        )}

        {/* New Client action */}
        {onNewClient && (
          <NewClientRow onClick={() => { onNewClient(); setOpen(false); }}>
            <UserPlus size={18} />
            <span>Onboard New Client via AI</span>
          </NewClientRow>
        )}
      </Dropdown>
    </SelectorWrap>
  );
};

export default ClientSelectorDropdown;
