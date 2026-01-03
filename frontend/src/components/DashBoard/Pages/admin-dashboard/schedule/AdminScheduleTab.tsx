/**
 * AdminScheduleTab.tsx
 * 
 * Enhanced Admin Schedule Tab with full space utilization
 * - Revolutionary layout design following Digital Alchemist principles
 * - Mobile-first responsive approach with sensational aesthetics
 * - Full viewport height utilization
 * - Minimal footer integration
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../../../../redux/hooks';
import { Calendar, Crown, TrendingUp, Users, Search, AlertCircle, ArrowUp, ArrowDown, History, Edit, Save, XCircle, Book } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import { theme, prefersReducedMotion } from '../../../../../theme/tokens';
import { fetchEvents, selectAllSessions } from '../../../../../redux/slices/scheduleSlice';

// Import components
import ClientSessionHistory from '../../client-dashboard/schedule/ClientSessionHistory';
import UnifiedCalendar from '../../../../Schedule/schedule';
import DashboardFooter from '../../../../Footer/DashboardFooter';
import ScheduleInitializer from '../../../../Schedule/ScheduleInitializer';
import ScheduleErrorBoundary from '../../../../Schedule/ScheduleErrorBoundary';

// Revolutionary container following Digital Alchemist principles
const AdminScheduleContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: 
    radial-gradient(circle at 10% 20%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(120, 81, 169, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow: hidden;
  
  /* Sensational background effects */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        rgba(0, 255, 255, 0.01) 1px,
        transparent 2px,
        transparent 40px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        rgba(120, 81, 169, 0.01) 1px,
        transparent 2px,
        transparent 40px
      );
    pointer-events: none;
    z-index: 0;
  }
`;

// Revolutionary header with premium aesthetics
const AdminScheduleHeader = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  min-height: 60px;
  background: rgba(15, 12, 41, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);

  /* Signature gradient underline */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #00ffff 25%,
      #7851a9 75%,
      transparent 100%
    );
  }

  /* Mobile-first responsive */
  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md} 20px;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: 12px ${theme.spacing.md};
  }

  ${prefersReducedMotion} {
    animation: none !important;
    transition: none !important;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AdminIcon = styled(motion.div)`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 16px rgba(0, 255, 255, 0.3);
  position: relative;

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  ${prefersReducedMotion} {
    animation: none !important;
    transition: none !important;
  }
`;

const TitleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const MainTitle = styled(motion.h1)`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 1.5rem;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: 1.25rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-weight: 400;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 0.8rem;
  }
`;

const StatsBar = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
  }
`;

const StatItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} 12px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: ${theme.spacing.sm};
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);

  svg {
    color: #00ffff;
    font-size: 0.9rem;
  }

  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: rgba(0, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: 6px 10px;
    font-size: 0.8rem;

    svg {
      font-size: 0.8rem;
    }
  }

  ${prefersReducedMotion} {
    &:hover {
      transform: none;
    }
  }
`;

// New styled components for the client credits list
const ClientCreditsContainer = styled(motion.div)`
  margin: 0 ${theme.spacing.lg} ${theme.spacing.md};
  background: rgba(20, 17, 40, 0.7);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  overflow: hidden;
`;

const ClientCreditsHeader = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};

  h3 {
    margin: 0;
    font-size: ${theme.typography.scale.lg};
    font-weight: ${theme.typography.weight.semibold};
    color: ${theme.colors.brand.cyan};
  }
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  
  svg {
    position: absolute;
    left: 10px;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
    width: 16px;
    height: 16px;
  }
`;

const SearchInput = styled.input`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  color: white;
  font-size: 0.9rem;
  width: 200px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.brand.cyan};
    background: rgba(0, 0, 0, 0.4);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const ClientCreditsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: ${theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  th {
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.scale.sm};
    font-weight: ${theme.typography.weight.semibold};
    text-transform: uppercase;
    cursor: pointer;
    user-select: none;
    transition: color 0.2s;

    &:hover {
      color: ${theme.colors.brand.cyan};
    }
  }

  td {
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.scale.base};
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background-color: rgba(0, 255, 255, 0.03);

    .history-button {
      opacity: 1;
      transform: translateX(0);
    }

    .book-button {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const HistoryButton = styled.button`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  color: ${theme.colors.brand.cyan};
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease-in-out;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    transform: translateX(0) scale(1.05);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const BookButton = styled.button`
  background: rgba(120, 81, 169, 0.2);
  border: 1px solid rgba(120, 81, 169, 0.3);
  color: #c8b6ff;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease-in-out;

  &:hover {
    background: rgba(120, 81, 169, 0.3);
    transform: translateX(0) scale(1.05);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;
const CreditInput = styled.input`
  width: 60px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid ${theme.colors.brand.cyan};
  border-radius: 6px;
  color: white;
  text-align: center;
  font-size: 1rem;

  &:focus {
    outline: none;
    box-shadow: 0 0 5px ${theme.colors.brand.cyan};
  }
`;

// Revolutionary main content area
const ScheduleMainContent = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  overflow: hidden;

  /* Premium card container */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0;
  backdrop-filter: blur(10px);

  /* Inner content padding and styling */
  .schedule-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;

    /* Full height calendar container - target all nested divs to ensure UnifiedCalendar fills space */
    > div {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100% !important;
      min-height: calc(100vh - 160px) !important;

      > div {
        flex: 1;
        height: 100% !important;
      }

      @media (max-width: ${theme.breakpoints.tablet}) {
        min-height: calc(100vh - 140px) !important;
      }

      @media (max-width: ${theme.breakpoints.mobile}) {
        min-height: calc(100vh - 120px) !important;
      }
    }
  }
`;

// Animation variants following Digital Alchemist principles
const containerVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.95
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  hidden: { 
    opacity: 0, 
    y: -30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const contentVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: "easeOut"
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const AdminScheduleTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showClientCredits, setShowClientCredits] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const allSessions = useAppSelector(selectAllSessions);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<{ id: string; name: string } | null>(null);
  // State for client credits data
  const [clients, setClients] = useState<{ id: string; name: string; credits: number; }[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'credits'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [avgCredits, setAvgCredits] = useState(0);

  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClientForBooking, setSelectedClientForBooking] = useState<string | null>(null);

  // Fetch client credits with pagination, sorting, and search
  const fetchClients = useCallback(async () => {
    if (!showClientCredits) return;

    setClientsLoading(true);
    setClientsError(null);

    try {
      const params: any = {
        page,
        limit: pageSize,
        search: clientSearchTerm || undefined,
        sort: sortField,
        direction: sortDirection,
      };

      const response = await authAxios.get('/api/admin/clients', { params });

      const normalized = (response.data ?? []).map((c: any) => ({
        ...c,
        credits: typeof c.sessionsRemaining === 'number'
          ? c.sessionsRemaining
          : (typeof c.credits === 'number' ? c.credits : 0),
      }));

      setClients(normalized);
      const totalCount = response.total ?? normalized.length;
      setTotal(totalCount);

      const creditsSum = normalized.reduce((sum, c) => sum + (c.credits || 0), 0);
      setTotalCredits(creditsSum);
      setAvgCredits(normalized.length ? Math.round(creditsSum / normalized.length) : 0);
    } catch (error: any) {
      console.error("Error fetching client credits:", error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch client credits.';
      setClientsError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setClientsLoading(false);
    }
  }, [authAxios, clientSearchTerm, page, pageSize, showClientCredits, sortDirection, sortField, toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fetch all sessions if history modal is opened
  useEffect(() => {
    if (isHistoryModalOpen) {
      dispatch(fetchEvents());
    }
  }, [isHistoryModalOpen, dispatch]);
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      return sortDirection === 'asc'
        ? a.credits - b.credits
        : b.credits - a.credits;
    }
  });

  const displayClients = total
    ? sortedClients
    : sortedClients.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: 'name' | 'credits') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewHistory = (client: { id: string; name: string }) => {
    setSelectedClientForHistory(client);
    setIsHistoryModalOpen(true);
  };

  const handleBookForClient = (clientId: string) => {
    setSelectedClientForBooking(clientId);
    setIsBookingModalOpen(true);
  };

  const handleEditCredits = (client: { id: string; credits: number }) => {
    setEditingClient(client.id);
    setNewCreditValue(client.credits);
  };

  const handleUpdateCredits = async (clientId: string) => {
    try {
      // Assuming a new endpoint to update credits
      await authAxios.put(`/api/admin/clients/${clientId}/credits`, {
        sessionsRemaining: newCreditValue,
      });
      // Refresh client list to show updated credits
      const updatedClients = clients.map(c => 
        c.id === clientId ? { ...c, credits: newCreditValue } : c
      );
      setClients(updatedClients);
      setEditingClient(null);
      toast({
        title: "Success",
        description: "Client credits updated successfully.",
      });
      await fetchClients();
    } catch (error) {
      console.error("Failed to update client credits:", error);
      toast({
        title: "Error",
        description: "Failed to update client credits.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingClient(null);
    setNewCreditValue(0);
  };

  useEffect(() => {
    // Enhanced initialization with proper document title
    document.title = "🎯 Schedule Management | Admin Dashboard - SwanStudios";
    
    // Simulate loading delay for smooth animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AdminScheduleContainer
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {/* Revolutionary Header Section */}
        <AdminScheduleHeader variants={headerVariants}>
          <HeaderContent>
            <TitleSection>
              <AdminIcon
                whileHover={{ 
                  scale: 1.1, 
                  rotate: 5 
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown />
              </AdminIcon>
              <TitleText>
                <MainTitle variants={itemVariants}>
                  Schedule Management
                </MainTitle>
                <Subtitle variants={itemVariants}>
                  Comprehensive oversight of all training sessions across the platform
                </Subtitle>
              </TitleText>
            </TitleSection>
            
            <StatsBar variants={itemVariants}>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Calendar />
                All Sessions
              </StatItem>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <TrendingUp />
                Analytics
              </StatItem>
              <StatItem
                as={motion.button}
                onClick={() => setShowClientCredits(!showClientCredits)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                style={{ cursor: 'pointer', border: showClientCredits ? `1px solid ${theme.colors.brand.cyan}` : '1px solid rgba(0, 255, 255, 0.2)' }}
              >
                <Users />
                Client Credits
              </StatItem>
            </StatsBar>
          </HeaderContent>
        </AdminScheduleHeader>

        {/* New Client Credits List */}
        <AnimatePresence>
          {showClientCredits && (
            <ClientCreditsContainer
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ClientCreditsHeader>
                <h3>Client Session Credits</h3>
                <SearchContainer>
                  <Search />
                  <SearchInput 
                    type="text" 
                    placeholder="Search clients..." 
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                  />
                </SearchContainer>
              </ClientCreditsHeader>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                borderBottom: '1px solid rgba(0, 255, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong style={{ color: theme.colors.text.primary }}>
                    <Users size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Clients: {total || clients.length}
                  </strong>
                  <strong style={{ color: theme.colors.brand.cyan }}>
                    Total Credits: {totalCredits.toLocaleString()}
                  </strong>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Avg: {avgCredits}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    style={{
                      padding: '8px 12px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,255,255,0.2)',
                      background: page === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)',
                      color: page === 1 ? 'rgba(255,255,255,0.3)' : 'white',
                      cursor: page === 1 ? 'not-allowed' : 'pointer'
                    }}
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.7)', minWidth: '80px', textAlign: 'center' }}>
                    Page {page}
                  </span>
                  <button
                    style={{
                      padding: '8px 12px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,255,255,0.2)',
                      background: (total ? page * pageSize >= total : false) ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)',
                      color: (total ? page * pageSize >= total : false) ? 'rgba(255,255,255,0.3)' : 'white',
                      cursor: (total ? page * pageSize >= total : false) ? 'not-allowed' : 'pointer'
                    }}
                    disabled={total ? page * pageSize >= total : false}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,255,255,0.2)',
                      background: 'rgba(0,0,0,0.4)',
                      color: 'white'
                    }}
                  >
                    {[10, 25, 50, 100].map(size => (
                      <option key={size} value={size}>{size}/page</option>
                    ))}
                  </select>
                </div>
              </div>
              <ClientCreditsTable>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Client Name
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('credits')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Remaining Credits
                        {sortField === 'credits' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </div>
                    </th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientsLoading ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)' }}>Loading clients...</td>
                    </tr>
                  ) : clientsError ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: theme.colors.semantic.error, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> Error: {clientsError}
                      </td>
                    </tr>
                  ) : displayClients.length > 0 ? (
                    displayClients.map(client => (
                      <tr key={client.id}>
                        <td>{client.name}</td>
                        <td>
                          {editingClient === client.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CreditInput 
                              type="number"
                              value={newCreditValue}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewCreditValue(Number.isFinite(val) ? Math.max(0, val) : 0);
                              }}
                              autoFocus
                            />
                              <Save size={18} onClick={() => handleUpdateCredits(client.id)} style={{ cursor: 'pointer', color: theme.colors.semantic.success }} />
                              <XCircle size={18} onClick={cancelEdit} style={{ cursor: 'pointer', color: theme.colors.semantic.error }} />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => handleEditCredits(client)}>
                              {client.credits}
                              <Edit size={14} style={{ opacity: 0.5 }} />
                            </div>
                          )}
                        </td>
                        <td>
                          <HistoryButton className="history-button" onClick={() => handleViewHistory(client)}>
                            <History /> History
                          </HistoryButton>
                        </td>
                        <td>
                          {(() => {
                            const hasCredits = (client.credits ?? 0) > 0;
                            return (
                              <BookButton
                                className="book-button"
                                onClick={() => hasCredits && handleBookForClient(client.id)}
                                disabled={!hasCredits}
                                title={hasCredits ? 'Book session for client' : 'No credits remaining - Add credits first'}
                                style={!hasCredits ? {
                                  opacity: 0.4,
                                  cursor: 'not-allowed',
                                  background: 'rgba(120, 81, 169, 0.1)'
                                } : undefined}
                              >
                                <Book /> {hasCredits ? 'Book' : 'No Credits'}
                              </BookButton>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>
                        {clientSearchTerm 
                          ? `No clients found matching "${clientSearchTerm}"` 
                          : (clients.length === 0 ? 'No clients found.' : 'All clients filtered out.')
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </ClientCreditsTable>
            </ClientCreditsContainer>
          )}
        </AnimatePresence>

        {/* Revolutionary Main Content */}
        <ScheduleMainContent variants={contentVariants}>
          <div className="schedule-content">
            {/* Use the same schedule component as the header link */}
            <ScheduleInitializer>
              <ScheduleErrorBoundary>
                <UnifiedCalendar />
              </ScheduleErrorBoundary>
            </ScheduleInitializer>
          </div>
        </ScheduleMainContent>

        {/* Minimal Dashboard Footer */}
        <DashboardFooter />
      </AdminScheduleContainer>

      {selectedClientForHistory && (
        <ClientSessionHistory
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          sessions={allSessions.filter(s => s.userId === selectedClientForHistory.id)}
        />
      )}

      {isBookingModalOpen && selectedClientForBooking && (
        <UnifiedCalendar 
          initialModalState={{
            open: true,
            clientId: selectedClientForBooking,
          }}
        />
      )}
    </>
  );
};

export default AdminScheduleTab;
