/**
 * WorkoutClientDrawer — Client Selection for Workout Workspace
 * Side drawer on desktop (1024px+), bottom sheet on mobile.
 * Per Gemini 3.1 Pro design authority specs.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Search, User, Dumbbell, Calendar, Activity } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// ---- Types ----

interface ClientInfo {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  photo?: string;
  availableSessions?: number;
  lastWorkoutDate?: string;
}

interface WorkoutClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: ClientInfo) => void;
}

// ---- Framer Motion Physics (per Gemini spec) ----

const drawerSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 30,
  mass: 1,
};

const desktopVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: drawerSpring },
  exit: { x: '100%', transition: drawerSpring },
};

const mobileVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: drawerSpring },
  exit: { y: '100%', transition: drawerSpring },
};

// ---- Component ----

const WorkoutClientDrawer: React.FC<WorkoutClientDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { authAxios } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAxios.get('/api/admin/users', {
        params: { role: 'client', limit: 100 },
      });
      const data = res.data?.users || res.data?.data || res.data || [];
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      // Try alternate endpoint
      try {
        const res2 = await authAxios.get('/api/users', {
          params: { role: 'client', limit: 100 },
        });
        const data2 = res2.data?.users || res2.data?.data || res2.data || [];
        setClients(Array.isArray(data2) ? data2 : []);
      } catch {
        setClients([]);
      }
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Reset & fetch on open
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      fetchClients();
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [isOpen, fetchClients]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Filter clients
  const filtered = clients.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const full = `${c.firstName} ${c.lastName}`.toLowerCase();
    return full.includes(term) || (c.email && c.email.toLowerCase().includes(term));
  });

  const handleSelect = (client: ClientInfo) => {
    onSelect(client);
    onClose();
  };

  // Mobile swipe-to-close
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No workouts yet';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <DrawerContainer
            $isMobile={isMobile}
            variants={isMobile ? mobileVariants : desktopVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={isMobile ? handleDragEnd : undefined}
          >
            {/* Mobile drag handle */}
            {isMobile && <DragHandle />}

            {/* Header */}
            <DrawerHeader>
              <DrawerTitle>Select Client</DrawerTitle>
              <CloseBtn onClick={onClose} aria-label="Close client drawer">
                <X size={20} />
              </CloseBtn>
            </DrawerHeader>

            {/* Search */}
            <SearchSection>
              <SearchWrapper>
                <Search size={16} color="#8892b0" />
                <SearchInput
                  ref={searchRef}
                  type="text"
                  placeholder="Search clients..."
                  aria-label="Search clients"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchWrapper>
            </SearchSection>

            {/* Client List */}
            <ClientListArea>
              {loading ? (
                <EmptyState>
                  <LoadingDot />
                  Loading clients...
                </EmptyState>
              ) : filtered.length === 0 ? (
                <EmptyState>
                  {searchTerm
                    ? `No clients match "${searchTerm}"`
                    : 'No clients found'}
                </EmptyState>
              ) : (
                filtered.map((client) => (
                  <ClientRow
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    aria-label={`Select ${client.firstName} ${client.lastName}`}
                    whileHover={{ scale: 1.01, boxShadow: '0 0 12px rgba(120, 81, 169, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ClientAvatar $src={client.photo}>
                      {!client.photo &&
                        `${(client.firstName || '?')[0]}${(client.lastName || '?')[0]}`}
                    </ClientAvatar>
                    <ClientDetails>
                      <ClientName>
                        {client.firstName} {client.lastName}
                      </ClientName>
                      <ClientMeta>
                        <Calendar size={12} />
                        {formatDate(client.lastWorkoutDate)}
                      </ClientMeta>
                    </ClientDetails>
                    {client.availableSessions != null && (
                      <SessionPill $low={(client.availableSessions ?? 0) <= 2}>
                        <Activity size={12} />
                        {client.availableSessions}
                      </SessionPill>
                    )}
                  </ClientRow>
                ))
              )}
            </ClientListArea>
          </DrawerContainer>
        </>
      )}
    </AnimatePresence>
  );
};

export default WorkoutClientDrawer;

// ---- Styled Components (Gemini 3.1 Pro exact specs) ----

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 999;
`;

const DrawerContainer = styled(motion.div)<{ $isMobile: boolean }>`
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(10, 10, 26, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  ${(p) =>
    p.$isMobile
      ? `
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 85vh;
    border-radius: 24px 24px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  `
      : `
    top: 0;
    right: 0;
    bottom: 0;
    width: 400px;
    max-width: 100vw;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  `}
`;

const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  margin: 12px auto;
  flex-shrink: 0;
`;

const DrawerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
`;

const DrawerTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #f0f0ff;
  margin: 0;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #8892b0;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #f0f0ff;
  }
`;

const SearchSection = styled.div`
  padding: 16px 24px 12px;
  flex-shrink: 0;
`;

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.2s;

  &:focus-within {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.1);
  }
`;

const SearchInput = styled.input`
  background: none;
  border: none;
  outline: none;
  color: #f0f0ff;
  font-size: 14px;
  flex: 1;
  min-height: 24px;

  &::placeholder {
    color: #8892b0;
  }
`;

const ClientListArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ClientRow = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-height: 72px;
  transition: all 0.15s;
  color: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(120, 81, 169, 0.2);
  }

  &:focus-visible {
    outline: 2px solid #00FFFF;
    outline-offset: 2px;
  }
`;

const ClientAvatar = styled.div<{ $src?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${(p) =>
    p.$src
      ? `url(${p.$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, #7851A9, #00FFFF)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #0a0a1a;
  flex-shrink: 0;
  text-transform: uppercase;
`;

const ClientDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ClientMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
`;

const SessionPill = styled.div<{ $low: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  background: ${(p) =>
    p.$low ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 255, 255, 0.15)'};
  color: ${(p) => (p.$low ? '#fca5a5' : '#67e8f9')};
  border: 1px solid
    ${(p) =>
      p.$low ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 255, 255, 0.3)'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  font-size: 14px;
  color: #8892b0;
  text-align: center;
`;

const LoadingDot = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
