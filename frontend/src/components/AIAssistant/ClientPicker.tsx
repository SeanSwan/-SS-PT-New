/**
 * ClientPicker
 * ============
 * Searchable client dropdown for trainer/admin use in the AI drawer.
 * Fetches client list and allows selection of a target client for AI context.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Search, X, User, ChevronDown } from 'lucide-react';
import { CS } from '../../styles/crystallineSwanTheme';

// ── Styled Components ──
const PickerWrapper = styled.div`
  position: relative;
  padding: 8px 12px;
  border-bottom: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.4);

  @media (min-width: 480px) {
    padding: 8px 16px;
  }
`;

const SelectedClient = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.5);
  color: ${CS.textPrimary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { border-color: ${CS.borderActive}; background: ${CS.hoverBg}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

const ClientName = styled.span`
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClientMeta = styled.span`
  font-size: 0.75rem;
  color: ${CS.textMuted};
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  z-index: 10;
  background: ${CS.glassBg};
  border: 1px solid ${CS.borderActive};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  max-height: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid ${CS.borderSubtle};
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${CS.textPrimary};
  font-size: 0.88rem;
  outline: none;
  &::placeholder { color: rgba(255, 255, 255, 0.4); }
`;

const ClientList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.2); border-radius: 2px; }
`;

const ClientItem = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  background: ${({ $selected }) => $selected ? CS.activePillBg : 'transparent'};
  border: none;
  border-radius: 8px;
  color: ${CS.textPrimary};
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover { background: ${CS.hoverBg}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: -2px; }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid ${CS.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${CS.wingPurple};
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

const NoResults = styled.div`
  padding: 20px;
  text-align: center;
  color: ${CS.textMuted};
  font-size: 0.85rem;
`;

// ── Types ──
export interface ClientInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

interface ClientPickerProps {
  selectedClient: ClientInfo | null;
  onSelectClient: (client: ClientInfo | null) => void;
  userRole: 'trainer' | 'admin';
}

const ClientPicker: React.FC<ClientPickerProps> = ({ selectedClient, onSelectClient, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusedItemRef = useRef<HTMLButtonElement>(null);

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/clients', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Normalize — API may return { clients: [...] } or { data: [...] } or [...]
          const list = data.clients || data.data || (Array.isArray(data) ? data : []);
          setClients(list.map((c: any) => ({
            id: c.id,
            firstName: c.firstName || c.first_name || '',
            lastName: c.lastName || c.last_name || '',
            email: c.email || '',
            profileImageUrl: c.profileImageUrl || c.profile_image_url || undefined,
          })));
        }
      } catch {
        // Silently fail — picker just shows empty
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Reset focused index when search changes
  useEffect(() => { setFocusedIndex(-1); }, [search]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && focusedItemRef.current) {
      focusedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  const handleSelect = useCallback((client: ClientInfo) => {
    onSelectClient(client);
    setIsOpen(false);
    setSearch('');
    setFocusedIndex(-1);
  }, [onSelectClient]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && filtered[focusedIndex]) {
      e.preventDefault();
      handleSelect(filtered[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [filtered, focusedIndex, handleSelect]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectClient(null);
  }, [onSelectClient]);

  return (
    <PickerWrapper ref={wrapperRef}>
      <SelectedClient onClick={() => setIsOpen(!isOpen)} aria-label="Select client" aria-expanded={isOpen}>
        {selectedClient ? (
          <>
            <Avatar>
              {selectedClient.profileImageUrl ? (
                <img src={selectedClient.profileImageUrl} alt="" />
              ) : (
                <User size={16} />
              )}
            </Avatar>
            <ClientName>{selectedClient.firstName} {selectedClient.lastName}</ClientName>
            <X size={16} style={{ color: CS.textMuted, cursor: 'pointer' }} onClick={handleClear} />
          </>
        ) : (
          <>
            <User size={16} style={{ color: CS.textMuted }} />
            <ClientName style={{ color: CS.textMuted }}>Select a client...</ClientName>
            <ChevronDown size={16} style={{ color: CS.textMuted }} />
          </>
        )}
      </SelectedClient>

      {isOpen && (
        <Dropdown>
          <SearchBar>
            <Search size={16} style={{ color: CS.textMuted }} />
            <SearchInput
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search clients..."
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="client-listbox"
              aria-activedescendant={focusedIndex >= 0 && filtered[focusedIndex] ? `client-item-${filtered[focusedIndex].id}` : undefined}
              aria-label="Search clients"
            />
          </SearchBar>
          <ClientList role="listbox" id="client-listbox">
            {loading ? (
              <NoResults>Loading clients...</NoResults>
            ) : filtered.length === 0 ? (
              <NoResults>No clients found</NoResults>
            ) : (
              filtered.map((client, index) => (
                <ClientItem
                  key={client.id}
                  id={`client-item-${client.id}`}
                  ref={index === focusedIndex ? focusedItemRef : null}
                  role="option"
                  aria-selected={selectedClient?.id === client.id}
                  $selected={selectedClient?.id === client.id || focusedIndex === index}
                  onClick={() => handleSelect(client)}
                >
                  <Avatar>
                    {client.profileImageUrl ? (
                      <img src={client.profileImageUrl} alt="" />
                    ) : (
                      <User size={14} />
                    )}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.firstName} {client.lastName}
                    </div>
                    <ClientMeta>{client.email}</ClientMeta>
                  </div>
                </ClientItem>
              ))
            )}
          </ClientList>
        </Dropdown>
      )}
    </PickerWrapper>
  );
};

export default ClientPicker;
