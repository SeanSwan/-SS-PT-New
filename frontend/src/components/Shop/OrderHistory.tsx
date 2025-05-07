import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { formatDate } from '../../utils/formatters';

// Types
interface OrderItem {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  imageUrl: string | null;
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  completedAt: string | null;
  createdAt: string;
  orderItems: OrderItem[];
}

// Styled components
const OrderHistoryContainer = styled.div`
  padding: 2rem;
  background: rgba(20, 20, 40, 0.5);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  color: white;
  font-size: 2rem;
  margin-bottom: 2rem;
  text-align: center;
  font-weight: 300;
  letter-spacing: 1px;
`;

const EmptyMessage = styled.p`
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  font-style: italic;
  padding: 2rem;
`;

const OrdersList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const OrderCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(20, 20, 40, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const OrderNumber = styled.h3`
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
`;

const OrderMeta = styled.div`
  display: flex;
  gap: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ status }) => {
    switch (status) {
      case 'completed': return 'rgba(40, 167, 69, 0.2)';
      case 'processing': return 'rgba(255, 193, 7, 0.2)';
      case 'pending': return 'rgba(108, 117, 125, 0.2)';
      case 'refunded': return 'rgba(220, 53, 69, 0.2)';
      default: return 'rgba(108, 117, 125, 0.2)';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'processing': return '#ffc107';
      case 'pending': return '#6c757d';
      case 'refunded': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  border: 1px solid ${({ status }) => {
    switch (status) {
      case 'completed': return 'rgba(40, 167, 69, 0.3)';
      case 'processing': return 'rgba(255, 193, 7, 0.3)';
      case 'pending': return 'rgba(108, 117, 125, 0.3)';
      case 'refunded': return 'rgba(220, 53, 69, 0.3)';
      default: return 'rgba(108, 117, 125, 0.3)';
    }
  }};
`;

const OrderContent = styled.div`
  padding: 1.5rem;
`;

const OrderItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const OrderItem = styled.div`
  display: flex;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const ItemImage = styled.div`
  width: 80px;
  height: 80px;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: 100%;
    height: 120px;
  }
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled.h4`
  color: white;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 500;
`;

const ItemDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
`;

const ItemMeta = styled.div`
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
`;

const OrderSummary = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const OrderTotal = styled.div`
  color: white;
  font-size: 1.2rem;
  font-weight: 500;
  
  span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    font-weight: 400;
    margin-right: 0.5rem;
  }
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Main component
const OrderHistory: React.FC = () => {
  const { authAxios, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) return;

      setLoading(true);
      try {
        const response = await authAxios.get('/api/orders');
        
        if (response.data && response.data.success) {
          setOrders(response.data.orders);
        } else {
          toast({
            title: "Error",
            description: response.data?.message || "Failed to load order history",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to load order history",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [authAxios, isAuthenticated, toast]);

  // Toggle order details
  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    return (
      <StatusBadge status={status}>{status}</StatusBadge>
    );
  };

  // Format price
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <OrderHistoryContainer>
      <Title>Order History</Title>
      
      {loading ? (
        <LoadingSpinner aria-label="Loading orders" />
      ) : orders.length === 0 ? (
        <EmptyMessage>You haven't placed any orders yet.</EmptyMessage>
      ) : (
        <OrdersList
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {orders.map(order => (
            <OrderCard
              key={order.id}
              variants={itemVariants}
              onClick={() => toggleOrderDetails(order.id)}
              tabIndex={0}
              role="button"
              aria-expanded={expandedOrderId === order.id}
            >
              <OrderHeader>
                <OrderNumber>Order #{order.orderNumber}</OrderNumber>
                <OrderMeta>
                  <div>Date: {formatDate(order.createdAt)}</div>
                  {renderStatusBadge(order.status)}
                </OrderMeta>
              </OrderHeader>
              
              {expandedOrderId === order.id && (
                <OrderContent>
                  <OrderItemsList>
                    {order.orderItems.map(item => (
                      <OrderItem key={item.id}>
                        <ItemImage 
                          style={{ backgroundImage: `url(${item.imageUrl || '/placeholder-product.png'})` }}
                          aria-hidden="true"
                        />
                        <ItemInfo>
                          <ItemName>{item.name}</ItemName>
                          {item.description && (
                            <ItemDescription>{item.description.length > 100 
                              ? `${item.description.substring(0, 100)}...` 
                              : item.description}
                            </ItemDescription>
                          )}
                          <ItemMeta>
                            <div>Quantity: {item.quantity}</div>
                            <div>{formatPrice(item.price)} each</div>
                          </ItemMeta>
                        </ItemInfo>
                      </OrderItem>
                    ))}
                  </OrderItemsList>
                  
                  <OrderSummary>
                    <OrderTotal>
                      <span>Total:</span> {formatPrice(order.totalAmount)}
                    </OrderTotal>
                  </OrderSummary>
                </OrderContent>
              )}
            </OrderCard>
          ))}
        </OrdersList>
      )}
    </OrderHistoryContainer>
  );
};

export default OrderHistory;