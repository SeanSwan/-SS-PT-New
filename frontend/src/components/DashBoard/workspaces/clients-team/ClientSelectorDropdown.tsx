/**
 * ┌─── SUB-COMPONENT: ClientSelectorDropdown ─────────────────┐
 * │ PARENT: ClientsWorkspace (Client Hub)                      │
 * │ PURPOSE: Searchable dropdown to select a client with       │
 * │          recent/favorites, avatar, and client source badge  │
 * │ Props: { clients, selectedId, onSelect, loading }          │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, ChevronDown, Star, Clock, UserPlus, X } from 'lucide-react';
import {
  Avatar,
  ClientRow,
  Dropdown,
  EmptyMsg,
  NewClientRow,
  SearchInput,
  SearchWrap,
  SectionLabel,
  SelectionInfo,
  SelectionMeta,
  SelectionName,
  SelectorButton,
  SelectorWrap,
  SourceBadge,
} from './ClientSelectorDropdown.styles';

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
  fitnessGoal?: string;
  trainingExperience?: string;
  dateOfBirth?: string | null;
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
            <span>Onboard New Client via Swan Coach</span>
          </NewClientRow>
        )}
      </Dropdown>
    </SelectorWrap>
  );
};

export default ClientSelectorDropdown;
