/**
 * ============================================================================
 * FILE: GlobalClientSelector.tsx
 * PURPOSE: Searchable combobox for selecting active client in dashboard header
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a 44px combobox in the dashboard header that
 * lets trainers/admins search and select their active client. Filters by
 * firstName + lastName, shows avatar initials, and syncs with GlobalClientContext.
 *
 * HOW IT FITS IN THE APP: DashboardHeader → GlobalClientSelector → GlobalClientContext
 * KEY DECISIONS: styled-components with CSS custom properties for theme compat.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Users, Search, X, ChevronDown } from 'lucide-react';
import { useGlobalClient } from '../../context/GlobalClientContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first Crystalline Swan combobox with CSS custom properties
// ─────────────────────────────────────────────────────────────

const SelectorWrapper = styled.div`
  position: relative;
  width: 260px;
  font-family: 'Sora', sans-serif;
`;

const TriggerButton = styled.button<{ $isOpen: boolean; $hasValue: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  padding: 0 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $isOpen }) =>
    $isOpen ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  border-radius: 8px;
  color: ${({ $hasValue }) =>
    $hasValue ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224,236,244,0.5))'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 200ms ease, box-shadow 200ms ease;
  outline: none;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 8px rgba(96, 192, 240, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const AvatarCircle = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
`;

const TriggerLabel = styled.span`
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  padding: 0;
  margin: -8px -4px -8px 0;
  background: transparent;
  border: none;
  color: var(--text-muted, rgba(224,236,244,0.5));
  cursor: pointer;
  border-radius: 4px;
  transition: color 150ms ease;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }
`;

const Dropdown = styled.div<{ $visible: boolean }>`
  position: fixed;
  max-height: 280px;
  background-color: #141419;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8), 0 0 8px rgba(96, 192, 240, 0.15);
  z-index: var(--z-dropdown, 200);
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;

  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '-8px')});
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 200ms cubic-bezier(0.19, 1, 0.22, 1),
              transform 200ms cubic-bezier(0.19, 1, 0.22, 1);
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.12));
`;

const SearchInput = styled.input`
  flex: 1;
  height: 32px;
  background: transparent;
  border: none;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  outline: none;

  &::placeholder { color: var(--text-muted, rgba(224,236,244,0.4)); }
`;

const OptionsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  flex: 1;
`;

const OptionItem = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 44px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)' : 'transparent'};
  transition: background 120ms ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }
`;

const EmptyMessage = styled.li`
  padding: 16px 12px;
  text-align: center;
  color: var(--text-muted, rgba(224,236,244,0.4));
  font-size: 13px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Combobox logic — open/close, search, select, click-outside
// ─────────────────────────────────────────────────────────────

interface GlobalClientSelectorProps {
  closeKey?: string | number | boolean;
}

const GlobalClientSelector: React.FC<GlobalClientSelectorProps> = ({ closeKey }) => {
  const { activeClient, setActiveClient, clientList } = useGlobalClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 260 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** Close dropdown on outside click (check both trigger and portal dropdown) */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inWrapper && !inDropdown) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Position dropdown below trigger using getBoundingClientRect */
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [isOpen]);

  /** Auto-focus search input when dropdown opens */
  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  /** Close portal dropdown when the hosting sidebar closes or route changes. */
  useEffect(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, [closeKey]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientList;
    const q = searchQuery.toLowerCase();
    return clientList.filter((c) => {
      const full = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase();
      return full.includes(q);
    });
  }, [clientList, searchQuery]);

  const getInitials = useCallback((first?: string, last?: string) => {
    return `${(first ?? '?')[0]}${(last ?? '')[0] || ''}`.toUpperCase();
  }, []);

  const handleSelect = useCallback(
    (client: (typeof clientList)[number]) => {
      setActiveClient(client);
      setIsOpen(false);
      setSearchQuery('');
    },
    [setActiveClient],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveClient(null);
    },
    [setActiveClient],
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

  return (
    <SelectorWrapper ref={wrapperRef}>
      <TriggerButton
        ref={triggerRef}
        $isOpen={isOpen}
        $hasValue={!!activeClient}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        type="button"
      >
        {activeClient ? (
          <AvatarCircle>
            {getInitials(activeClient.firstName, activeClient.lastName)}
          </AvatarCircle>
        ) : (
          <Users size={16} />
        )}
        <TriggerLabel>
          {activeClient
            ? `${activeClient.firstName} ${activeClient.lastName}`
            : 'Select Client...'}
        </TriggerLabel>
        {activeClient ? (
          <ClearButton onClick={handleClear} aria-label="Clear selection" type="button">
            <X size={14} />
          </ClearButton>
        ) : (
          <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
        )}
      </TriggerButton>

      {isOpen && createPortal(
        <Dropdown
          ref={dropdownRef}
          $visible={isOpen}
          role="listbox"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          <SearchRow>
            <Search size={14} style={{ color: 'var(--text-muted, rgba(224,236,244,0.4))' }} />
            <SearchInput
              ref={searchRef}
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search clients"
            />
          </SearchRow>
          <OptionsList>
            {filteredClients.length === 0 ? (
              <EmptyMessage>No clients found</EmptyMessage>
            ) : (
              filteredClients.map((client) => (
                <OptionItem
                  key={client.id}
                  $active={activeClient?.id === client.id}
                  onClick={() => handleSelect(client)}
                  role="option"
                  aria-selected={activeClient?.id === client.id}
                >
                  <AvatarCircle>
                    {getInitials(client.firstName, client.lastName)}
                  </AvatarCircle>
                  {client.firstName} {client.lastName}
                </OptionItem>
              ))
            )}
          </OptionsList>
        </Dropdown>,
        document.body
      )}
    </SelectorWrapper>
  );
};

export default GlobalClientSelector;
