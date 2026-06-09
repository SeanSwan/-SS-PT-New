import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Link2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../AdminDashboardCards';
import type { OrientationQueueItem } from './OrientationIntakeWidget.types';
import {
  ActionRow,
  AlertStrip,
  Button,
  CountBadge,
  Empty,
  ErrorStrip,
  HeaderRow,
  ItemRow,
  ItemText,
  List,
  Meta,
  Name,
  Tag,
  Title,
} from './OrientationIntakeWidget.styles';

const formatSubmitted = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Unknown submit time';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

interface OrientationIntakeWidgetProps {
  limit?: number;
  showOpenQueueAction?: boolean;
}

const OrientationIntakeWidget: React.FC<OrientationIntakeWidgetProps> = ({
  limit = 6,
  showOpenQueueAction = true,
}) => {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [items, setItems] = useState<OrientationQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOrientationQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authAxios.get('/api/orientation/all');
      const allRows = (res.data?.data || []) as OrientationQueueItem[];
      const pendingRows = allRows
        .filter((row) => (row.status || 'pending') === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(pendingRows.slice(0, limit));
    } catch (error) {
      console.error('Failed to load orientation intake queue:', error);
      setItems([]);
      setLoadError('Orientation data unavailable');
    } finally {
      setLoading(false);
    }
  }, [authAxios, limit]);

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
          {showOpenQueueAction && (
            <Button onClick={() => navigate('/dashboard/admin/unified-onboarding')}>
              Open Queue
            </Button>
          )}
        </ActionRow>
      </HeaderRow>

      {loadError ? (
        <ErrorStrip role="alert">
          Orientation data unavailable. Refresh or open the full queue before assuming there are no submissions.
        </ErrorStrip>
      ) : items.length > 0 && (
        <AlertStrip>
          {items.length} pending orientation submission{items.length === 1 ? '' : 's'} awaiting admin review and account linking.
        </AlertStrip>
      )}

      {loadError ? null : items.length === 0 ? (
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
                    <Button onClick={() => handleApproveAndLink(item)} disabled={linkingId === item.id}>
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
