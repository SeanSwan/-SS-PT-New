import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../../services/api';
import type { UserSummary } from './adminWaivers.types';
import {
  Modal, ModalContent, ModalTitle, SearchInput, UserSearchList, UserSearchItem,
  ActionButton, ButtonRow, CloseButton, LoadingState,
} from './adminWaivers.styles';

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
      <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <ModalTitle>Attach User to Waiver #{recordId}</ModalTitle>

        <SearchInput
          placeholder="Search clients by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
          autoFocus
        />

        {loading ? (
          <LoadingState>Loading clients...</LoadingState>
        ) : (
          <UserSearchList>
            {users.length === 0 && (
              <div style={{ padding: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                {search.trim() ? 'No matching clients.' : 'No clients found.'}
              </div>
            )}
            {users.map((u) => (
              <UserSearchItem
                key={u.id}
                $selected={selectedUserId === u.id}
                onClick={() => setSelectedUserId(u.id)}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{u.email}</div>
                </div>
                {selectedUserId === u.id && (
                  <span style={{ color: '#00ffff', fontWeight: 600 }}>Selected</span>
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
      </ModalContent>
    </Modal>
  );
};

export default AdminManualLinkModal;
