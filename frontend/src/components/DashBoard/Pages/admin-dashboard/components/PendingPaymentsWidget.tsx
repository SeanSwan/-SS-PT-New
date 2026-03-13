/**
 * PendingPaymentsWidget
 * =====================
 * Admin widget showing orders with pending offline payments (check, zelle, venmo).
 * Allows admin to confirm receipt of payment.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { DollarSign, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

interface PendingOrder {
  id: number;
  orderNumber: string;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  billingName: string | null;
  billingEmail: string | null;
  createdAt: string;
}

const PendingPaymentsWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/orders', {
        params: { status: 'pending', limit: 20 },
      });
      if (res.data?.orders) {
        // Filter to offline methods only
        const offline = res.data.orders.filter((o: PendingOrder) =>
          ['check', 'zelle', 'venmo'].includes(o.paymentMethod)
        );
        setOrders(offline);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleConfirm = async (orderId: number) => {
    setConfirming(orderId);
    try {
      await authAxios.patch(`/api/orders/${orderId}`, {
        status: 'completed',
        paymentAppliedAt: new Date().toISOString(),
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch {
      // silent
    } finally {
      setConfirming(null);
    }
  };

  if (orders.length === 0 && !loading) return null;

  return (
    <WidgetCard>
      <Header>
        <HeaderLeft>
          <DollarSign size={18} />
          <Title>Pending Payments</Title>
          {orders.length > 0 && <Badge>{orders.length}</Badge>}
        </HeaderLeft>
        <RefreshBtn onClick={fetchPending} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
        </RefreshBtn>
      </Header>

      {loading && orders.length === 0 && (
        <EmptyState>Loading pending payments...</EmptyState>
      )}

      <OrderList>
        {orders.map(order => (
          <OrderRow key={order.id}>
            <OrderInfo>
              <OrderNumber>{order.orderNumber}</OrderNumber>
              <OrderMeta>
                {order.billingName || order.billingEmail || 'Unknown'}
                {' · '}
                <MethodBadge $method={order.paymentMethod}>
                  {order.paymentMethod}
                </MethodBadge>
                {' · '}
                {new Date(order.createdAt).toLocaleDateString()}
              </OrderMeta>
            </OrderInfo>
            <OrderAmount>${Number(order.totalAmount).toFixed(2)}</OrderAmount>
            <ConfirmBtn
              onClick={() => handleConfirm(order.id)}
              disabled={confirming === order.id}
              aria-label={`Confirm payment for ${order.orderNumber}`}
            >
              {confirming === order.id ? <Clock size={14} /> : <Check size={14} />}
              {confirming === order.id ? 'Confirming...' : 'Confirm'}
            </ConfirmBtn>
          </OrderRow>
        ))}
      </OrderList>
    </WidgetCard>
  );
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const WidgetCard = styled.div`
  background: rgba(0, 32, 96, 0.45);
  backdrop-filter: blur(20px) saturate(160%);
  border-radius: 20px;
  border: 1px solid rgba(198, 168, 75, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: 24px;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #C6A84B;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const Badge = styled.span`
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(198, 168, 75, 0.2);
  border: 1px solid rgba(198, 168, 75, 0.3);
  color: #C6A84B;
  font-size: 0.7rem;
  font-weight: 700;
`;

const RefreshBtn = styled.button`
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(224, 236, 244, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover { background: rgba(198, 168, 75, 0.1); }
  .spinning { animation: ${spin} 1s linear infinite; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px;
  color: rgba(224, 236, 244, 0.4);
  font-size: 0.85rem;
`;

const OrderList = styled.div`
  padding: 8px 16px;
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(198, 168, 75, 0.3);
    border-radius: 4px;
  }
`;

const OrderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  transition: all 0.2s;

  &:hover { background: rgba(198, 168, 75, 0.05); }

  & + & { border-top: 1px solid rgba(255, 255, 255, 0.03); }
`;

const OrderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const OrderNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
  font-weight: 600;
  color: #60C0F0;
  display: block;
`;

const OrderMeta = styled.span`
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.4);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`;

const MethodBadge = styled.span<{ $method: string }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${p =>
    p.$method === 'zelle' ? 'rgba(139, 92, 246, 0.15)' :
    p.$method === 'check' ? 'rgba(96, 192, 240, 0.15)' :
    'rgba(198, 168, 75, 0.15)'
  };
  color: ${p =>
    p.$method === 'zelle' ? '#8B5CF6' :
    p.$method === 'check' ? '#60C0F0' :
    '#C6A84B'
  };
`;

const OrderAmount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: #C6A84B;
  flex-shrink: 0;
`;

const ConfirmBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: #22C55E;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px;
  flex-shrink: 0;

  &:hover { background: rgba(34, 197, 94, 0.2); border-color: #22C55E; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export default PendingPaymentsWidget;
