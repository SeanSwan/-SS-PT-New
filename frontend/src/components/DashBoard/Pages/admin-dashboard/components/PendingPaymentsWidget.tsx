/**
 * PendingPaymentsWidget
 * =====================
 * Admin widget showing orders with pending offline payments (check, zelle, venmo).
 * Allows admin to confirm receipt of payment.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  Badge,
  ConfirmBtn,
  EmptyState,
  ErrorState,
  Header,
  HeaderLeft,
  InlineError,
  MethodBadge,
  OrderAmount,
  OrderInfo,
  OrderList,
  OrderMeta,
  OrderNumber,
  OrderRow,
  RefreshBtn,
  RetryBtn,
  Title,
  WidgetCard,
} from './PendingPaymentsWidget.styles';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      // Admin endpoint returns all orders; filter to pending offline methods
      const res = await authAxios.get('/api/orders', {
        params: { status: 'pending', limit: 50 },
      });
      if (res.data?.orders) {
        const offline = res.data.orders.filter((o: PendingOrder) =>
          ['check', 'zelle', 'venmo'].includes(o.paymentMethod)
        );
        setOrders(offline);
      }
    } catch {
      setOrders([]);
      setLoadError('Pending payments unavailable.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleConfirm = async (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    setConfirming(orderId);
    setConfirmError(null);
    try {
      // Use apply-payment endpoint: idempotent, sets paymentAppliedBy, triggers session allocation
      await authAxios.post(`/api/orders/${orderId}/apply-payment`, {
        method: order?.paymentMethod || 'other',
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch {
      setConfirmError('Payment confirmation failed.');
    } finally {
      setConfirming(null);
    }
  };

  if (orders.length === 0 && !loading && !loadError) return null;

  return (
    <WidgetCard>
      <Header>
        <HeaderLeft>
          <DollarSign size={18} />
          <Title>Pending Payments</Title>
          {orders.length > 0 && <Badge>{orders.length}</Badge>}
        </HeaderLeft>
        <RefreshBtn
          onClick={fetchPending}
          disabled={loading}
          aria-label="Refresh pending payments"
          title="Refresh pending payments"
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
        </RefreshBtn>
      </Header>

      {loadError ? (
        <ErrorState role="alert">
          <AlertCircle size={16} />
          <span>{loadError}</span>
          <RetryBtn type="button" onClick={fetchPending} aria-label="Retry pending payments">
            <RefreshCw size={14} />
            Retry
          </RetryBtn>
        </ErrorState>
      ) : loading && orders.length === 0 && (
        <EmptyState>Loading pending payments...</EmptyState>
      )}

      {confirmError && (
        <InlineError role="alert">
          <AlertCircle size={14} />
          <span>{confirmError}</span>
        </InlineError>
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

export default PendingPaymentsWidget;
