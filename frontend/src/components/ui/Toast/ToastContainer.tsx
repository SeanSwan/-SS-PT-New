/**
 * SwanStudios Glassmorphic Toast System
 * =====================================
 * Crystalline Swan themed toast notifications with:
 * - Max 3 visible, oldest auto-dismissed when 4th arrives
 * - Success: 3s auto-dismiss, Error: 5s or manual
 * - Swipe-to-dismiss on touch devices
 * - Top-right desktop, top-center mobile
 * - safe-area-inset-top respected on mobile
 * - z-index: 2000
 */

import React, { createContext, useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Dumbbell,
  CalendarCheck,
  ShoppingCart,
  MessageSquare,
  Trophy,
  Shield,
} from 'lucide-react';

// ─── Design Tokens ───────────────────────────────────────────────
const TOKENS = {
  midnightSapphire: '#002060',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  frozenEmber: '#D97706',
} as const;

// ─── Types ───────────────────────────────────────────────────────

export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'session'
  | 'workout'
  | 'social'
  | 'achievement'
  | 'admin'
  | 'system'
  | 'order'
  | 'message';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  errorCode?: string; // Machine-readable error code (displayed in Fira Code)
  duration?: number; // ms, 0 = manual dismiss only
}

export interface ToastContextValue {
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// ─── Accent Color Map ───────────────────────────────────────────

const ACCENT_MAP: Record<ToastType, string> = {
  success: '#10B981',
  error: '#EF4444',
  warning: TOKENS.frozenEmber,
  info: TOKENS.arcticCyan,
  session: TOKENS.iceWing,
  workout: TOKENS.iceWing,
  social: TOKENS.wingPurple,
  achievement: TOKENS.wingPurple,
  admin: TOKENS.frozenEmber,
  system: TOKENS.frozenEmber,
  order: TOKENS.gildedFern,
  message: TOKENS.arcticCyan,
};

// ─── Duration Defaults ──────────────────────────────────────────

const DEFAULT_DURATIONS: Record<string, number> = {
  success: 3000,
  error: 12000, // Crystalline Vault: 12s for errors — adequate reading time
  warning: 4000,
  info: 3000,
};

const getDuration = (type: ToastType, custom?: number): number => {
  if (custom !== undefined) return custom;
  return DEFAULT_DURATIONS[type] ?? 3000;
};

// ─── Icon Resolver ──────────────────────────────────────────────

const getToastIcon = (type: ToastType) => {
  const size = 18;
  switch (type) {
    case 'success':
      return <CheckCircle size={size} />;
    case 'error':
      return <AlertCircle size={size} />;
    case 'warning':
      return <AlertTriangle size={size} />;
    case 'info':
      return <Info size={size} />;
    case 'session':
      return <CalendarCheck size={size} />;
    case 'workout':
      return <Dumbbell size={size} />;
    case 'social':
    case 'achievement':
      return <Trophy size={size} />;
    case 'admin':
    case 'system':
      return <Shield size={size} />;
    case 'order':
      return <ShoppingCart size={size} />;
    case 'message':
      return <MessageSquare size={size} />;
    default:
      return <Info size={size} />;
  }
};

// ─── Keyframes ──────────────────────────────────────────────────

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInTop = keyframes`
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideOutRight = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(120%);
  }
`;

const slideOutTop = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-100%);
  }
`;

const progressShrink = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

// ─── Styled Components ──────────────────────────────────────────

const ToastViewport = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 400px;
  width: 100%;

  @media (max-width: 767px) {
    top: env(safe-area-inset-top, 16px);
    right: 0;
    left: 0;
    max-width: 100%;
    padding: 0 12px;
    align-items: center;
  }
`;

const ToastCard = styled.div<{
  $accent: string;
  $exiting: boolean;
  $swipeX: number;
}>`
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  width: 100%;
  max-width: 380px;
  overflow: hidden;

  background: rgba(0, 16, 48, 0.72);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 32, 96, 0.5),
    0 16px 48px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(224, 236, 244, 0.1);

  transform: translateX(${({ $swipeX }) => $swipeX}px);
  opacity: ${({ $swipeX }) => {
    const abs = Math.abs($swipeX);
    return abs > 0 ? Math.max(0, 1 - abs / 200) : 1;
  }};
  transition: ${({ $swipeX }) =>
    $swipeX === 0 ? 'opacity 0.15s ease' : 'none'};
  touch-action: pan-y;

  ${({ $exiting }) =>
    $exiting
      ? css`
          animation: ${slideOutRight} 0.25s ease forwards;
          @media (max-width: 767px) {
            animation: ${slideOutTop} 0.25s ease forwards;
          }
        `
      : css`
          animation: ${slideInRight} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          @media (max-width: 767px) {
            animation: ${slideInTop} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
        `}

  @media (max-width: 767px) {
    max-width: calc(100vw - 24px);
  }
`;

const IconWrap = styled.div<{ $color: string }>`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
`;

const ToastBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ToastTitle = styled.p`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 650;
  color: ${TOKENS.frostWhite};
  line-height: 1.3;
`;

const ToastMessage = styled.p`
  margin: 2px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 400;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ErrorCode = styled.span`
  display: inline-block;
  margin-top: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 500;
  color: #F4D58D;
  letter-spacing: 0.1em;
  opacity: 0.85;
`;

const CloseBtn = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(224, 236, 244, 0.35);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 2px;

  &:hover {
    color: ${TOKENS.frostWhite};
    background: rgba(224, 236, 244, 0.08);
  }
`;

const ProgressBar = styled.div<{ $duration: number; $color: string; $paused: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: ${({ $color }) => $color};
  opacity: 0.6;
  border-radius: 0 0 0 12px;

  animation: ${progressShrink} ${({ $duration }) => $duration}ms linear forwards;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
`;

// ─── Context ────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);



// ─── Single Toast Item ──────────────────────────────────────────

interface ToastItemProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const accent = ACCENT_MAP[toast.type] || TOKENS.iceWing;
  const duration = getDuration(toast.type, toast.duration);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 260);
  }, [onRemove, toast.id]);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration <= 0) return;
    remainingRef.current = duration;
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(dismiss, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, dismiss]);

  // Pause/resume on hover
  const handleMouseEnter = useCallback(() => {
    if (duration <= 0) return;
    setPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startTimeRef.current;
  }, [duration]);

  const handleMouseLeave = useCallback(() => {
    if (duration <= 0) return;
    setPaused(false);
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, Math.max(remainingRef.current, 500));
  }, [duration, dismiss]);

  // Touch swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    setPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startTimeRef.current;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.touches[0].clientX - touchStartRef.current;
    setSwipeX(diff);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(swipeX) > 100) {
      dismiss();
    } else {
      setSwipeX(0);
      setPaused(false);
      if (duration > 0) {
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(
          dismiss,
          Math.max(remainingRef.current, 500)
        );
      }
    }
    touchStartRef.current = null;
  }, [swipeX, dismiss, duration]);

  return (
    <ToastCard
      $accent={accent}
      $exiting={exiting}
      $swipeX={swipeX}
      role="alert"
      aria-live="assertive"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <IconWrap $color={accent}>{getToastIcon(toast.type)}</IconWrap>

      <ToastBody>
        <ToastTitle>{toast.title}</ToastTitle>
        {toast.message && <ToastMessage>{toast.message}</ToastMessage>}
        {toast.errorCode && <ErrorCode>{toast.errorCode}</ErrorCode>}
      </ToastBody>

      <CloseBtn onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </CloseBtn>

      {duration > 0 && (
        <ProgressBar $duration={duration} $color={accent} $paused={paused} />
      )}
    </ToastCard>
  );
};

// ─── Provider + Container ───────────────────────────────────────

const MAX_VISIBLE = 3;

export const SwanToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (data: Omit<ToastData, 'id'>): string => {
      const id = `swan-toast-${++idCounter.current}-${Date.now()}`;
      const newToast: ToastData = { ...data, id };

      setToasts((prev) => {
        const next = [...prev, newToast];
        // If we exceed max, remove the oldest
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE);
        }
        return next;
      });

      return id;
    },
    []
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = { addToast, removeToast, clearAll };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          <ToastViewport>
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onRemove={removeToast} />
            ))}
          </ToastViewport>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export default SwanToastProvider;
