import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../../services/api';
import type { UserSummary } from './adminWaivers.types';
import {
  Modal, ModalContent, ModalTitle, SearchInput, UserSearchList, UserSearchItem,
  ActionButton, ButtonRow, CloseButton, LoadingState,
} from './adminWaivers.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface Props {
  recordId: number | null;
  onClose: () => void;
  onAttach: (recordId: number, userId: number) => void;
}

const DEBOUNCE_MS = 300;

const AdminManualLinkModal: React.FC<Props> = ({ recordId, onClose, onAttach }) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recordId == null) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [recordId]);

  const fetchUsers = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (term.trim()) params.set('search', term.trim());
      const res = await apiService.get(`/api/admin/clients?${params}`);
      const list = res.data?.data?.clients || res.data?.data || [];
      setUsers(
        list.map((u: any) => ({
          id: u.id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
        })),
      );
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open (initial list) and debounce on search change
  useEffect(() => {
    if (recordId == null) return;
    setSelectedUserId(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(search), search ? DEBOUNCE_MS : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [recordId, search, fetchUsers]);

  if (recordId == null) return null;

  return (
    <Modal onClick={onClose}>
      <StyledBox as={ModalContent} onClick={(e) => e.stopPropagation()} $style={{ maxWidth: 500 }}>
        <ModalTitle>Attach User to Waiver #{recordId}</ModalTitle>

        <StyledBox as={SearchInput}
          ref={searchInputRef}
          placeholder="Search clients by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          $style={{ width: '100%' }}
        />

        {loading ? (
          <LoadingState>Loading clients...</LoadingState>
        ) : (
          <UserSearchList>
            {users.length === 0 && (
              <StyledBox as="div" $style={{ padding: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                {search.trim() ? 'No matching clients.' : 'No clients found.'}
              </StyledBox>
            )}
            {users.map((u) => (
              <UserSearchItem
                key={u.id}
                $selected={selectedUserId === u.id}
                onClick={() => setSelectedUserId(u.id)}
              >
                <div>
                  <StyledBox as="div" $style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</StyledBox>
                  <StyledBox as="div" $style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{u.email}</StyledBox>
                </div>
                {selectedUserId === u.id && (
                  <StyledBox as="span" $style={{ color: '#60C0F0', fontWeight: 600 }}>Selected</StyledBox>
                )}
              </UserSearchItem>
            ))}
          </UserSearchList>
        )}

        <ButtonRow>
          <ActionButton
            $variant="link"
            disabled={selectedUserId == null}
            onClick={() => selectedUserId != null && onAttach(recordId, selectedUserId)}
          >
            Attach User
          </ActionButton>
          <CloseButton onClick={onClose}>Cancel</CloseButton>
        </ButtonRow>
      </StyledBox>
    </Modal>
  );
};

export default AdminManualLinkModal;
