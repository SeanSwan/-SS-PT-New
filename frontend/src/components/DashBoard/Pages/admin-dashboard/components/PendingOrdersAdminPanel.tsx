/**
 * PendingOrdersAdminPanel.tsx - SwanStudios Manual Payment Management
 * ===================================================================
 * Admin interface for managing pending manual payments and orders
 * Integrated with PaymentService manual strategy
 * 
 * Features:
 * - View all pending manual payments
 * - Customer details and order information
 * - "Mark as Paid" functionality
 * - Payment method tracking
 * - Real-time status updates
 * - Export capabilities
 * 
 * Master Prompt v33 Alignment:
 * - Galaxy-themed professional aesthetics
 * - Production-ready error handling
 * - Mobile-first responsive design
 * - WCAG AA accessibility compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ShoppingBag, User, DollarSign, Calendar, Clock, CheckCircle,
  AlertTriangle, RefreshCw, Download, Eye, EyeOff, Filter,
  CreditCard, Banknote, Building, Phone, Mail, Package,
  ArrowRight, ExternalLink, Search, SortAsc, SortDesc,
  FileText, MessageSquare, Star, Award, Shield, Zap
} from 'lucide-react';

// Styled Components following galaxy theme
const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const OrdersContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(10, 10, 26, 0.9) 0%, rgba(30, 58, 138, 0.1) 100%);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PanelTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(0, 255, 255, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(0, 255, 255, 0.2));
    border-color: rgba(59, 130, 246, 0.6);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  flex: 1;
  min-width: 200px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
    animation: ${cosmicPulse} 2s infinite;
  }
`;

const FilterSelect = styled.select`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
  }
  
  option {
    background: #1e3a8a;
    color: white;
  }
`;

const OrdersGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const OrderCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.priority) {
        case 'high': return 'linear-gradient(90deg, #ef4444, #f59e0b)';
        case 'medium': return 'linear-gradient(90deg, #f59e0b, #10b981)';
        case 'low': return 'linear-gradient(90deg, #10b981, #3b82f6)';
        default: return 'linear-gradient(90deg, #00ffff, #3b82f6)';
      }
    }};
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const OrderInfo = styled.div`
  flex: 1;
`;

const OrderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    align-self: stretch;
    justify-content: stretch;
  }
`;

const OrderId = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #00ffff;
  margin-bottom: 0.5rem;
`;

const CustomerInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
`;

const OrderDetails = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
`;

const OrderItems = styled.div`
  margin-bottom: 1rem;
`;

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const PaymentInstructions = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'pending': return 'rgba(245, 158, 11, 0.2)';
      case 'paid': return 'rgba(16, 185, 129, 0.2)';
      case 'expired': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#f59e0b';
      case 'paid': return '#10b981';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'pending': return 'rgba(245, 158, 11, 0.3)';
      case 'paid': return 'rgba(16, 185, 129, 0.3)';
      case 'expired': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(107, 114, 128, 0.3)';
    }
  }};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #ef4444;
  text-align: center;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.6);
`;

// Interface definitions
interface PendingOrder {
  id: string;
  orderReference: string;
  paymentReference: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  amount: number;
  currency: string;
  status: 'pending_manual_payment' | 'paid' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    sessions?: number;
  }>;
  paymentInstructions: {
    title: string;
    methods: Array<{
      method: string;
      title: string;
      description: string;
      details: any;
    }>;
  };
  priority: 'high' | 'medium' | 'low';
}

const PendingOrdersAdminPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch pending orders
  const fetchPendingOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 🚀 REAL API CALL: Using new enterprise admin orders endpoint
      const response = await authAxios.get('/api/admin/orders/pending', {
        params: {
          sortBy,
          sortOrder,
          limit: 50,
          search: searchTerm || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter
        }
      });

      if (response.data.success) {
        // Use real order data from PostgreSQL and Stripe
        const pendingOrders = response.data.orders.map(order => ({
          id: order.id,
          orderReference: order.id,
          paymentReference: order.checkoutSessionId || 'N/A',
          customer: {
            id: order.user?.id || 0,
            name: order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : 'Unknown Customer',
            email: order.user?.email || 'N/A',
            phone: order.user?.phone || undefined
          },
          amount: parseFloat(order.totalAmount || 0),
          currency: 'USD',
          status: order.status === 'pending' ? 'pending_manual_payment' : order.status,
          createdAt: order.createdAt,
          expiresAt: order.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now if no expiry
          items: order.cartItems?.map(item => ({
            id: item.id,
            name: item.storefrontItem?.name || 'Unknown Item',
            quantity: item.quantity,
            price: parseFloat(item.price),
            sessions: item.storefrontItem?.sessions || undefined
          })) || [],
          paymentInstructions: {
            title: 'Complete Payment',
            methods: [
              {
                method: 'stripe',
                title: 'Credit/Debit Card',
                description: 'Pay securely with your credit or debit card',
                details: { processor: 'Stripe' }
              },
              {
                method: 'manual',
                title: 'Manual Payment',
                description: 'Contact admin to complete payment manually',
                details: { contact: 'admin@swanstudios.com' }
              }
            ]
          },
          priority: parseFloat(order.totalAmount || 0) > 200 ? 'high' : parseFloat(order.totalAmount || 0) > 100 ? 'medium' : 'low'
        }));
        
        setOrders(pendingOrders);
        console.log(`✅ Loaded ${pendingOrders.length} pending orders from real data`);
      } else {
        setError(response.data.message || 'Failed to load pending orders');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load pending orders';
      setError(errorMessage);
      console.error('❌ Failed to load pending orders:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [authAxios, statusFilter, sortBy, sortOrder, searchTerm]);

  // Mark order as paid
  const markAsPaid = useCallback(async (orderId: string) => {
    try {
      const response = await authAxios.post('/api/payments/confirm-payment', {
        paymentIntentId: orderId,
        adminNotes: 'Manually verified payment',
        verifiedBy: 'Admin'
      });

      if (response.data.success) {
        // Refresh orders list
        fetchPendingOrders();
        
        // Show success notification (you can add a toast notification here)
        console.log('Payment marked as paid successfully');
      } else {
        setError(response.data.message || 'Failed to mark payment as paid');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark payment as paid');
    }
  }, [authAxios, fetchPendingOrders]);

  // Initial data load
  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPendingOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchPendingOrders]);

  // Filter orders based on search term
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderReference.toLowerCase().includes(searchLower) ||
      order.paymentReference.toLowerCase().includes(searchLower) ||
      order.customer.name.toLowerCase().includes(searchLower) ||
      order.customer.email.toLowerCase().includes(searchLower)
    );
  });

  if (loading && orders.length === 0) {
    return (
      <OrdersContainer>
        <LoadingSpinner />
        <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading pending orders...
        </div>
      </OrdersContainer>
    );
  }

  if (error) {
    return (
      <OrdersContainer>
        <ErrorMessage>
          <AlertTriangle size={20} />
          {error}
        </ErrorMessage>
        <ActionButton onClick={fetchPendingOrders}>
          <RefreshCw size={16} />
          Retry
        </ActionButton>
      </OrdersContainer>
    );
  }

  return (
    <OrdersContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Controls */}
      <PanelHeader>
        <PanelTitle>
          <ShoppingBag size={24} />
          Pending Orders Management
        </PanelTitle>
        
        <ControlsContainer>
          <ActionButton
            onClick={fetchPendingOrders}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </ActionButton>
          
          <ActionButton
            onClick={() => setAutoRefresh(!autoRefresh)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: autoRefresh 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 255, 255, 0.1))'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(0, 255, 255, 0.1))'
            }}
          >
            {autoRefresh ? <Eye size={16} /> : <EyeOff size={16} />}
            {autoRefresh ? 'Live' : 'Manual'}
          </ActionButton>
        </ControlsContainer>
      </PanelHeader>

      {/* Search and Filters */}
      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by order ID, customer name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending_manual_payment">Pending Payment</option>
          <option value="paid">Paid</option>
          <option value="expired">Expired</option>
        </FilterSelect>
        
        <FilterSelect
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="createdAt">Created Date</option>
          <option value="amount">Amount</option>
          <option value="customer">Customer</option>
        </FilterSelect>
        
        <ActionButton
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
        </ActionButton>
      </SearchContainer>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState>
          <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>No Pending Orders</h3>
          <p>All orders are processed or no manual payments are pending.</p>
        </EmptyState>
      ) : (
        <OrdersGrid>
          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <OrderCard
                key={order.id}
                priority={order.priority}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <OrderHeader>
                  <OrderInfo>
                    <OrderId>{order.orderReference}</OrderId>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <StatusBadge status={order.status}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </StatusBadge>
                      <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>
                        ${order.amount.toLocaleString()}
                      </span>
                    </div>
                  </OrderInfo>
                  
                  <OrderActions>
                    {order.status === 'pending_manual_payment' && (
                      <ActionButton
                        onClick={() => markAsPaid(order.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 255, 255, 0.1))',
                          borderColor: 'rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <CheckCircle size={16} />
                        Mark Paid
                      </ActionButton>
                    )}
                  </OrderActions>
                </OrderHeader>

                <CustomerInfo>
                  <InfoItem>
                    <User size={16} />
                    {order.customer.name}
                  </InfoItem>
                  <InfoItem>
                    <Mail size={16} />
                    {order.customer.email}
                  </InfoItem>
                  <InfoItem>
                    <Calendar size={16} />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </InfoItem>
                  <InfoItem>
                    <Clock size={16} />
                    Expires: {new Date(order.expiresAt).toLocaleDateString()}
                  </InfoItem>
                </CustomerInfo>

                <OrderDetails>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#00ffff', fontSize: '1rem' }}>
                    Order Items
                  </h4>
                  <OrderItems>
                    {order.items.map((item, itemIndex) => (
                      <OrderItem key={itemIndex}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{item.name}</div>
                          {item.sessions && (
                            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                              {item.sessions} sessions
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 500 }}>
                            ${item.price.toLocaleString()} × {item.quantity}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                            ${(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      </OrderItem>
                    ))}
                  </OrderItems>
                </OrderDetails>

                {order.status === 'pending_manual_payment' && (
                  <PaymentInstructions>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#00ffff', fontSize: '0.875rem' }}>
                      Payment Instructions Sent to Customer
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Customer has been provided with payment instructions including:
                    </div>
                    <ul style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      <li>Bank transfer details</li>
                      <li>Support contact information</li>
                      <li>Payment reference: {order.paymentReference}</li>
                    </ul>
                  </PaymentInstructions>
                )}
              </OrderCard>
            ))}
          </AnimatePresence>
        </OrdersGrid>
      )}
    </OrdersContainer>
  );
};

export default PendingOrdersAdminPanel;