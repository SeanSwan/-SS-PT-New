import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { formatDistanceToNow } from 'date-fns';

import {
  Bell,
  BellOff,
  CheckCircle,
  Dumbbell,
  CalendarCheck,
  ShoppingCart,
  Info,
  Trash2,
  MessageSquare,
  Trophy,
  Shield,
  Settings,
  X,
} from 'lucide-react';

import { Notification } from '../../store/slices/notificationSlice';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import HeaderNotificationActions, { isSafeInternalHref } from './EnhancedNotificationSection.actions';
import HeaderNotificationSettingsControl, { HeaderNotificationPreferencesModal } from './EnhancedNotificationSection.settings';

// ─── Design Tokens ───────────────────────────────────────────────
const TOKENS = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  frozenEmber: '#D97706',
} as const;

// Notification type → accent color mapping
const TYPE_COLORS: Record<string, string> = {
  session: TOKENS.iceWing,
  workout: TOKENS.iceWing,
  client: TOKENS.iceWing,
  social: TOKENS.wingPurple,
  achievement: TOKENS.wingPurple,
  orientation: TOKENS.wingPurple,
  admin: TOKENS.frozenEmber,
  system: TOKENS.frozenEmber,
  order: TOKENS.gildedFern,
  message: TOKENS.arcticCyan,
};

const getTypeColor = (type: string): string =>
  TYPE_COLORS[type] ?? TOKENS.iceWing;

// ─── Keyframes ───────────────────────────────────────────────────

const swanPulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 20px 8px rgba(139, 92, 246, 0.4);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 20px rgba(139, 92, 246, 0);
  }
`;

const badgePop = keyframes`
  0% { transform: scale(0.5); }
  60% { transform: scale(1.3); }
  100% { transform: scale(1); }
`;

const dropdownEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const slideUpEnter = keyframes`
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// ─── Styled Components ──────────────────────────────────────────

const BellButton = styled.button<{ $pulsing: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${TOKENS.frostWhite};
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;

  ${({ $pulsing }) =>
    $pulsing &&
    css`
      animation: ${swanPulse} 1.2s ease-in-out 3;
      border-radius: 50%;
    `}

  &:hover {
    background: rgba(139, 92, 246, 0.12);
    transform: rotate(8deg);
  }

  &:focus-visible {
    outline: 2px solid ${TOKENS.wingPurple};
    outline-offset: 2px;
  }
`;

const UnreadBadge = styled.span<{ $animate: boolean }>`
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: ${TOKENS.wingPurple};
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;

  ${({ $animate }) =>
    $animate &&
    css`
      animation: ${badgePop} 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    `}
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1299;
  background: transparent;

  @media (max-width: 767px) {
    background: rgba(0, 0, 0, 0.45);
    animation: ${fadeIn} 0.2s ease;
  }
`;

// Desktop dropdown
const DropdownPanel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  z-index: 1300;

  background: rgba(0, 16, 48, 0.65);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 32, 96, 0.6),
    0 24px 64px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(224, 236, 244, 0.15);
  overflow: hidden;

  animation: ${dropdownEnter} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;

  @media (max-width: 767px) {
    display: none;
  }
`;

// Mobile bottom sheet
const BottomSheet = styled.div<{ $translateY: number }>`
  display: none;

  @media (max-width: 767px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 85vh;
    z-index: 1300;

    background: rgba(0, 16, 48, 0.75);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
    border: 1px solid rgba(96, 192, 240, 0.15);
    border-bottom: none;
    border-radius: 20px 20px 0 0;
    box-shadow:
      0 -8px 32px rgba(0, 32, 96, 0.6),
      0 -24px 64px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(224, 236, 244, 0.15);

    animation: ${slideUpEnter} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: translateY(${({ $translateY }) => $translateY}px);
    transition: ${({ $translateY }) =>
      $translateY === 0 ? 'none' : 'transform 0.25s ease'};
    touch-action: none;
  }
`;

const DragHandle = styled.div`
  display: none;

  @media (max-width: 767px) {
    display: flex;
    justify-content: center;
    padding: 10px 0 4px;
    cursor: grab;

    &::after {
      content: '';
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: rgba(224, 236, 244, 0.3);
    }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
  flex-shrink: 0;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${TOKENS.frostWhite};
  letter-spacing: -0.01em;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const MarkAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.12);
  color: ${TOKENS.wingPurple};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  min-height: 44px;

  &:hover {
    background: rgba(139, 92, 246, 0.22);
  }

  &:focus-visible {
    outline: 2px solid ${TOKENS.wingPurple};
    outline-offset: 2px;
  }
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;

  scrollbar-width: thin;
  scrollbar-color: ${TOKENS.wingPurple} transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${TOKENS.wingPurple};
    border-radius: 2px;
  }
`;

const NotificationRow = styled.div<{ $read: boolean; $accentColor: string }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;
  background: ${({ $read }) =>
    $read ? 'transparent' : 'rgba(139, 92, 246, 0.06)'};

  &:hover {
    background: rgba(96, 192, 240, 0.08);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  }

  /* Unread indicator dot */
  ${({ $read, $accentColor }) =>
    !$read &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${$accentColor};
        box-shadow: 0 0 6px ${$accentColor};
      }
    `}
`;

const IconCircle = styled.div<{ $color: string }>`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
`;

const NotifContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotifTitle = styled.p<{ $read: boolean }>`
  margin: 0 0 2px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: ${({ $read }) => ($read ? 500 : 650)};
  color: ${({ $read }) => ($read ? TOKENS.frostWhite : '#fff')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NotifMessage = styled.p`
  margin: 0 0 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 400;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NotifTime = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  color: rgba(224, 236, 244, 0.4);
`;

const DeleteBtn = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(224, 236, 244, 0.3);
  cursor: pointer;
  transition: all 0.15s ease;
  align-self: center;

  &:hover {
    background: rgba(236, 72, 153, 0.15);
    color: #ec4899;
  }
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
`;

const EmptyText = styled.p`
  margin: 16px 0 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.25rem;
  font-weight: 400;
  color: rgba(224, 236, 244, 0.85);
`;

const EmptySub = styled.p`
  margin: 8px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.45);
  max-width: 220px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 16, 48, 0.5);
  z-index: 10;
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top-color: ${TOKENS.wingPurple};
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// ─── Icon Resolver ──────────────────────────────────────────────

const getNotificationIcon = (type: string) => {
  const size = 18;
  switch (type) {
    case 'session':
    case 'client':
      return <CalendarCheck size={size} />;
    case 'workout':
      return <Dumbbell size={size} />;
    case 'order':
      return <ShoppingCart size={size} />;
    case 'social':
    case 'achievement':
      return <Trophy size={size} />;
    case 'orientation':
      return <CheckCircle size={size} />;
    case 'admin':
      return <Shield size={size} />;
    case 'system':
      return <Settings size={size} />;
    case 'message':
      return <MessageSquare size={size} />;
    default:
      return <Info size={size} />;
  }
};

// ─── Time Formatter ─────────────────────────────────────────────

const formatRelativeTime = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return '';
  }
};

// ─── Component ──────────────────────────────────────────────────

const EnhancedNotificationSection: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsClicked: markNotificationClicked,
    markAllAsRead: markAllNotificationsRead,
    removeNotification: deleteNotification,
    snoozeNotification,
  } = useNotificationCenter({ subscribeToSocket: true });

  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [badgeAnimate, setBadgeAnimate] = useState(false);
  const previousUnreadRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  // Swan Pulse: trigger when new unread arrives while dropdown is closed
  useEffect(() => {
    if (!isOpen && unreadCount > previousUnreadRef.current) {
      setIsPulsing(true);
      setBadgeAnimate(true);
      const timer = window.setTimeout(() => {
        setIsPulsing(false);
        setBadgeAnimate(false);
      }, 3700);
      return () => window.clearTimeout(timer);
    }
    previousUnreadRef.current = unreadCount;
  }, [unreadCount, isOpen]);
  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);
  // ── Click-outside handler ──
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── Escape key handler ──
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // ── Handlers ──
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      await markNotificationClicked(notification.id);
      const link = typeof notification.link === 'string' ? notification.link.trim() : '';
      if (isSafeInternalHref(link)) {
        navigate(link);
        setIsOpen(false);
      }
    },
    [markNotificationClicked, navigate]
  );

  const handleNotificationActionLink = useCallback(
    async (notification: Notification, href: string) => {
      await markNotificationClicked(notification.id);
      const link = href.trim();
      if (isSafeInternalHref(link)) {
        navigate(link);
        setIsOpen(false);
      }
    },
    [markNotificationClicked, navigate]
  );

  const handleNotificationSnooze = useCallback(
    async (notification: Notification, durationMinutes: number) => {
      await snoozeNotification(notification.id, durationMinutes);
    },
    [snoozeNotification]
  );

  const handleMarkAllRead = useCallback(() => {
    void markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    setIsOpen(false);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      void deleteNotification(id);
    },
    [deleteNotification]
  );

  // ── Mobile drag-to-dismiss ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartRef.current === null) return;
    const diff = e.touches[0].clientY - dragStartRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragY > 150) {
      setIsOpen(false);
    }
    setDragY(0);
    dragStartRef.current = null;
  }, [dragY]);

  // ── Shared content renderer ──
  const renderContent = () => (
    <>
      <Header>
        <HeaderTitle>Notifications</HeaderTitle>
        <HeaderControls>
          {unreadCount > 0 && (
            <MarkAllButton type="button" onClick={handleMarkAllRead}>
              <CheckCircle size={14} />
              Mark all read
            </MarkAllButton>
          )}
          <HeaderNotificationSettingsControl onOpen={handleOpenSettings} />
        </HeaderControls>
      </Header>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {loading && (
          <LoadingOverlay>
            <Spinner />
          </LoadingOverlay>
        )}

        <ScrollArea>
          {notifications.length === 0 ? (
            <EmptyStateContainer>
              <BellOff
                size={40}
                style={{ color: 'rgba(224, 236, 244, 0.3)' }}
              />
              <EmptyText>You're all caught up</EmptyText>
              <EmptySub>
                New activity will appear here when it happens
              </EmptySub>
            </EmptyStateContainer>
          ) : (
            notifications.map((notif) => {
              const color = getTypeColor(notif.type);
              return (
                <NotificationRow
                  key={notif.id}
                  $read={notif.read}
                  $accentColor={color}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notif);
                    }
                  }}
                >
                  <IconCircle $color={color}>
                    {getNotificationIcon(notif.type)}
                  </IconCircle>

                  <NotifContent>
                    <NotifTitle $read={notif.read}>{notif.title}</NotifTitle>
                    <NotifMessage>{notif.message}</NotifMessage>
                    <NotifTime>{formatRelativeTime(notif.createdAt)}</NotifTime>
                    <HeaderNotificationActions
                      notification={notif}
                      onOpenLink={handleNotificationActionLink}
                      onSnooze={handleNotificationSnooze}
                    />
                  </NotifContent>

                  <DeleteBtn
                    onClick={(e) => handleDelete(e, notif.id)}
                    aria-label="Delete notification"
                  >
                    <Trash2 size={14} />
                  </DeleteBtn>
                </NotificationRow>
              );
            })
          )}
        </ScrollArea>
      </div>
    </>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <BellButton
        $pulsing={isPulsing}
        onClick={toggleOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <UnreadBadge $animate={badgeAnimate}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </UnreadBadge>
        )}
      </BellButton>

      {isOpen && (
        <>
          <Backdrop onClick={() => setIsOpen(false)} />

          {/* Desktop dropdown */}
          <DropdownPanel>
            {renderContent()}
          </DropdownPanel>

          {/* Mobile bottom sheet */}
          <BottomSheet
            $translateY={dragY}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <DragHandle />
            {renderContent()}
          </BottomSheet>
        </>
      )}

      <HeaderNotificationPreferencesModal
        open={settingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
};

export default EnhancedNotificationSection;
