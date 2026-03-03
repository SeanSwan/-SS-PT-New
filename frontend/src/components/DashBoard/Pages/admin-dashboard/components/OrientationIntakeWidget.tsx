import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { BellRing, Link2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../admin-dashboard-view';

interface OrientationQueueItem {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  userId?: number | null;
  matchedUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  color: #00ffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(14, 165, 233, 0.2);
  border: 1px solid rgba(14, 165, 233, 0.4);
  color: #7dd3fc;
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Button = styled.button`
  min-height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.14);
  color: #dbeafe;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;

  &:hover {
    background: rgba(59, 130, 246, 0.22);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ItemRow = styled(motion.div)`
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.45);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const ItemText = styled.div`
  min-width: 0;
`;

const Name = styled.div`
  color: #e2e8f0;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Meta = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Tag = styled.span<{ $tone?: 'default' | 'ok' | 'warn' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid;
  color: ${({ $tone }) =>
    $tone === 'ok' ? '#86efac' : $tone === 'warn' ? '#fcd34d' : '#cbd5e1'};
  border-color: ${({ $tone }) =>
    $tone === 'ok' ? 'rgba(34,197,94,0.45)' : $tone === 'warn' ? 'rgba(245,158,11,0.45)' : 'rgba(148,163,184,0.35)'};
  background: ${({ $tone }) =>
    $tone === 'ok' ? 'rgba(34,197,94,0.12)' : $tone === 'warn' ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.12)'};
`;

const Empty = styled.div`
  color: #94a3b8;
  font-size: 0.86rem;
  text-align: center;
  padding: 14px 0;
`;

const AlertStrip = styled.div`
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.12);
  color: #fcd34d;
  font-size: 0.78rem;
  font-weight: 600;
`;

const OrientationIntakeWidget: React.FC = () => {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [items, setItems] = useState<OrientationQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<number | null>(null);

  const fetchOrientationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAxios.get('/api/orientation/all');
      const allRows = (res.data?.data || []) as OrientationQueueItem[];
      const pendingRows = allRows
        .filter((row) => (row.status || 'pending') === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(pendingRows.slice(0, 6));
    } catch (error) {
      console.error('Failed to load orientation intake queue:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchOrientationQueue();
    const intervalId = window.setInterval(fetchOrientationQueue, 30000);
    return () => window.clearInterval(intervalId);
  }, [fetchOrientationQueue]);

  const handleApproveAndLink = useCallback(async (orientation: OrientationQueueItem) => {
    if (!orientation.matchedUser?.id) return;

    setLinkingId(orientation.id);
    try {
      await authAxios.post(`/api/orientation/${orientation.id}/link-user`, {
        userId: orientation.matchedUser.id,
      });
      await fetchOrientationQueue();
    } catch (error) {
      console.error('Failed to link orientation to user account:', error);
    } finally {
      setLinkingId(null);
    }
  }, [authAxios, fetchOrientationQueue]);

  const formatSubmitted = (createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return 'Unknown submit time';
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <CommandCard style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <HeaderRow>
        <Title>
          <BellRing size={18} />
          Orientation Intake
          <CountBadge>{items.length}</CountBadge>
        </Title>
        <ActionRow>
          <Button onClick={fetchOrientationQueue} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/dashboard/people/orientations')}>
            Open Queue
          </Button>
        </ActionRow>
      </HeaderRow>

      {items.length > 0 && (
        <AlertStrip>
          {items.length} pending orientation submission{items.length === 1 ? '' : 's'} awaiting admin review and account linking.
        </AlertStrip>
      )}

      {items.length === 0 ? (
        <Empty>{loading ? 'Loading orientation queue...' : 'No pending orientation submissions.'}</Empty>
      ) : (
        <List>
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <ItemText>
                <Name>{item.fullName}</Name>
                <Meta>{item.email}</Meta>
                <Meta>Submitted: {formatSubmitted(item.createdAt)}</Meta>
              </ItemText>

              <ActionRow>
                {item.userId ? (
                  <Tag $tone="ok">Linked</Tag>
                ) : item.matchedUser ? (
                  <>
                    <Tag $tone="warn">Match Found</Tag>
                    <Button
                      onClick={() => handleApproveAndLink(item)}
                      disabled={linkingId === item.id}
                    >
                      <Link2 size={14} />
                      {linkingId === item.id ? 'Linking...' : 'Approve & Link'}
                    </Button>
                  </>
                ) : (
                  <Tag>No Match Yet</Tag>
                )}
              </ActionRow>
            </ItemRow>
          ))}
        </List>
      )}
    </CommandCard>
  );
};

export default OrientationIntakeWidget;
