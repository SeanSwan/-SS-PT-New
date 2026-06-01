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
  ChevronIndicator,
  ClearSearchButton,
  ClientRow,
  Dropdown,
  EmptyMsg,
  MutedIconSlot,
  NewClientRow,
  SearchInput,
  SearchWrap,
  SectionLabel,
  SectionLabelIcon,
  SelectionInfo,
  SelectionMeta,
  SelectionName,
  SelectorButton,
  SelectorPlaceholder,
  SelectorWrap,
  SourceBadge,
} from './ClientSelectorDropdown.styles';
import { getClientSourceLabel, getClientSourceShortLabel } from './clientSourceDisplay';
import { getClientSessionSignal } from './clientSessionSignal';
import { getClientDisplayName, getClientInitials } from './clientIdentity';

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
  onboardingComplete?: boolean;
  isOnboardingComplete?: boolean;
  onboardingPct?: number | null;
  onboardingCompletionPercentage?: number | null;
  completionPercentage?: number | null;
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

const normalizeRecentClientIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 5);
};

const readRecentClientIds = (): number[] => {
  try {
    return normalizeRecentClientIds(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));
  } catch {
    return [];
  }
};

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
    return readRecentClientIds();
  }, [open]); // re-read when dropdown opens

  const addToRecent = useCallback((id: number) => {
    const prev = readRecentClientIds();
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
      getClientDisplayName(c).toLowerCase().includes(term) ||
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

  const selectedClientName = selectedClient ? getClientDisplayName(selectedClient) : '';

  return (
    <SelectorWrap ref={wrapRef}>
      <SelectorButton
        type="button"
        $hasSelection={!!selectedClient}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={selectedClient ? `Selected: ${selectedClientName}` : 'Select a client'}
      >
        {selectedClient ? (
          <>
            <Avatar $source={selectedClient.clientSource}>{getClientInitials(selectedClient)}</Avatar>
            <SelectionInfo>
              <SelectionName>{selectedClientName}</SelectionName>
              <SelectionMeta>
                {getClientSourceLabel(selectedClient.clientSource)}
                {selectedClient.workoutCount != null && ` - ${selectedClient.workoutCount} workouts`}
              </SelectionMeta>
            </SelectionInfo>
            <SourceBadge $source={selectedClient.clientSource || 'swanstudios'}>
              {getClientSourceShortLabel(selectedClient.clientSource)}
            </SourceBadge>
          </>
        ) : (
          <>
            <MutedIconSlot>
              <Search size={18} />
            </MutedIconSlot>
            <SelectorPlaceholder>{loading ? 'Loading clients...' : 'Select a client...'}</SelectorPlaceholder>
          </>
        )}
        <ChevronIndicator $open={open}>
          <ChevronDown size={16} />
        </ChevronIndicator>
      </SelectorButton>

      <Dropdown $open={open} role="listbox" aria-label="Client list">
        <SearchWrap>
          <MutedIconSlot>
            <Search size={16} />
          </MutedIconSlot>
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search clients"
          />
          {search && (
            <ClearSearchButton
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear client search"
            >
              <X size={14} />
            </ClearSearchButton>
          )}
        </SearchWrap>

        {/* Recent clients */}
        {!search && recentClients.length > 0 && (
          <>
            <SectionLabel><SectionLabelIcon><Clock size={10} /></SectionLabelIcon> Recent</SectionLabel>
            {recentClients.map(c => (
              <ClientRow type="button" key={`recent-${c.id}`} $active={c.id === selectedId} onClick={() => handleSelect(c)} role="option" aria-selected={c.id === selectedId}>
                <Avatar $source={c.clientSource}>{getClientInitials(c)}</Avatar>
                <SelectionInfo>
                  <SelectionName>{getClientDisplayName(c)}</SelectionName>
                  <SelectionMeta>{getClientSourceLabel(c.clientSource)}</SelectionMeta>
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
          filtered.map(c => {
            const sessionSignal = getClientSessionSignal(c);

            return (
              <ClientRow type="button" key={c.id} $active={c.id === selectedId} onClick={() => handleSelect(c)} role="option" aria-selected={c.id === selectedId}>
                <Avatar $source={c.clientSource}>{getClientInitials(c)}</Avatar>
                <SelectionInfo>
                  <SelectionName>{getClientDisplayName(c)}</SelectionName>
                  <SelectionMeta title={sessionSignal.note}>
                    {getClientSourceLabel(c.clientSource)}
                    {` - ${sessionSignal.label}`}
                  </SelectionMeta>
                </SelectionInfo>
                <SourceBadge $source={c.clientSource || 'swanstudios'}>
                  {getClientSourceShortLabel(c.clientSource)}
                </SourceBadge>
              </ClientRow>
            );
          })
        )}

        {/* New Client action */}
        {onNewClient && (
          <NewClientRow type="button" onClick={() => { onNewClient(); setOpen(false); }}>
            <UserPlus size={18} />
            <span>Onboard New Client via Swan Coach</span>
          </NewClientRow>
        )}
      </Dropdown>
    </SelectorWrap>
  );
};

export default ClientSelectorDropdown;
