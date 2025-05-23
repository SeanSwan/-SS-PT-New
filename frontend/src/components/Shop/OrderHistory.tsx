// OrderHistory Component
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';

const OrderHistoryContainer = styled.div`
  padding: 2rem;
  background: rgba(30, 30, 60, 0.4);
  border-radius: 12px;
  color: white;
`;

const OrderTitle = styled.h2`
  color: white;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 300;
`;

const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const OrderCard = styled.div`
  background: rgba(20, 20, 40, 0.6);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
`;

const OrderId = styled.span`
  font-weight: bold;
  color: #00ffff;
`;

const OrderDate = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const OrderStatus = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  background: ${props => 
    props.status === 'completed' ? 'rgba(76, 175, 80, 0.2)' :
    props.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' :
    'rgba(244, 67, 54, 0.2)'
  };
  color: ${props => 
    props.status === 'completed' ? '#4caf50' :
    props.status === 'pending' ? '#ffc107' :
    '#f44336'
  };
  border: 1px solid ${props => 
    props.status === 'completed' ? '#4caf50' :
    props.status === 'pending' ? '#ffc107' :
    '#f44336'
  };
`;

const OrderItems = styled.div`
  margin-top: 1rem;
`;

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.7);
`;

interface Order {
  id: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

const OrderHistory: React.FC = () => {
  const { user, authAxios } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !authAxios) {
        setIsLoading(false);
        return;
      }

      try {
        // This would normally fetch from your orders API
        // For now, using mock data
        const mockOrders: Order[] = [
          {
            id: 'ORDER-001',
            date: '2024-01-15',
            status: 'completed',
            total: 299.99,
            items: [
              { name: 'Gold Premium Package', quantity: 1, price: 299.99 }
            ]
          },
          {
            id: 'ORDER-002',
            date: '2024-01-10',
            status: 'completed',
            total: 149.99,
            items: [
              { name: 'Silver Training Package', quantity: 1, price: 149.99 }
            ]
          }
        ];

        // Simulate API delay
        setTimeout(() => {
          setOrders(mockOrders);
          setIsLoading(false);
        }, 1000);

      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError('Failed to load order history');
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, authAxios]);

  const formatPrice = (price: number): string => {
    return price.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <OrderHistoryContainer>
        <OrderTitle>Order History</OrderTitle>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading order history...</div>
        </div>
      </OrderHistoryContainer>
    );
  }

  if (error) {
    return (
      <OrderHistoryContainer>
        <OrderTitle>Order History</OrderTitle>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#ff6b6b' }}>
          {error}
        </div>
      </OrderHistoryContainer>
    );
  }

  if (orders.length === 0) {
    return (
      <OrderHistoryContainer>
        <OrderTitle>Order History</OrderTitle>
        <EmptyState>
          <p>You haven't placed any orders yet.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            Explore our training packages to get started.
          </p>
        </EmptyState>
      </OrderHistoryContainer>
    );
  }

  return (
    <OrderHistoryContainer>
      <OrderTitle>Order History</OrderTitle>
      <OrderList>
        {orders.map((order) => (
          <OrderCard key={order.id}>
            <OrderHeader>
              <div>
                <OrderId>#{order.id}</OrderId>
                <OrderDate style={{ marginLeft: '1rem' }}>
                  {formatDate(order.date)}
                </OrderDate>
              </div>
              <OrderStatus status={order.status}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </OrderStatus>
            </OrderHeader>
            
            <OrderItems>
              {order.items.map((item, index) => (
                <OrderItem key={index}>
                  <span>{item.name} (x{item.quantity})</span>
                  <span>{formatPrice(item.price)}</span>
                </OrderItem>
              ))}
            </OrderItems>
            
            <div style={{ 
              marginTop: '1rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#00ffff'
            }}>
              Total: {formatPrice(order.total)}
            </div>
          </OrderCard>
        ))}
      </OrderList>
    </OrderHistoryContainer>
  );
};

export default OrderHistory;
