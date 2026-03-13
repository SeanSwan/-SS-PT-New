/**
 * AdminGalleryManager.tsx
 * ======================
 * Admin workspace for managing photo gallery events, uploads,
 * enhancement requests, donations, referrals, and visitor leads.
 * Gemini 3.1 Pro Command Center design.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────
interface GalleryStats {
  totalEvents: number;
  totalPhotos: number;
  totalVisitors: number;
  newsletterSubscribers: number;
  totalEnhancements: number;
  pendingEnhancements: number;
  totalDonationAmount: number;
  totalReferrals: number;
  unconvertedReferrals: number;
  storageType?: 'cloudflare-r2' | 'base64-fallback';
}

interface GalleryEvent {
  id: number;
  name: string;
  slug: string;
  sport: string | null;
  eventDate: string | null;
  location: string | null;
  photoCount: number;
  isPublished: boolean;
  description: string | null;
  createdAt: string;
}

interface Enhancement {
  id: number;
  status: string;
  createdAt: string;
  visitor: { id: number; email: string; firstName: string | null; lastName: string | null };
  photo: { id: number; photoNumber: number; displayName: string; url: string; thumbnailUrl: string | null; eventId: number };
}

interface Donation {
  id: number;
  amount: string;
  method: string;
  zelleConfirmed: boolean;
  note: string | null;
  createdAt: string;
  visitor: { id: number; email: string; firstName: string | null };
  event: { id: number; name: string };
}

interface Referral {
  id: number;
  referralName: string;
  referralPhone: string;
  referralEmail: string | null;
  contacted: boolean;
  converted: boolean;
  createdAt: string;
  visitor: { id: number; email: string; firstName: string | null };
  event: { id: number; name: string };
}

interface GalleryMessage {
  id: number;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  eventName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── Styled Components ─────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const progressPulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
`;

const PulsingDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => p.$color};
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

const ProgressBarContainer = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
`;

const ProgressBarFill = styled.div<{ $percent: number; $error?: boolean }>`
  height: 100%;
  width: ${p => p.$percent}%;
  background: ${p => p.$error
    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
    : 'linear-gradient(90deg, #60C0F0, #8B5CF6)'};
  border-radius: 4px;
  transition: width 0.3s ease;
  animation: ${p => !p.$error && p.$percent > 0 && p.$percent < 100 ? progressPulse : 'none'} 1.5s ease-in-out infinite;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
`;

const Notification = styled.div<{ $type: 'success' | 'error' }>`
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  ${p => p.$type === 'success'
    ? 'background: rgba(76, 175, 80, 0.12); border: 1px solid rgba(76, 175, 80, 0.3); color: #4caf50;'
    : 'background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;'}
`;

const Wrapper = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', system-ui, sans-serif;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const KPICard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
`;

const KPIValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: #60C0F0;
  line-height: 1.1;
`;

const KPILabel = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: ${p => p.$active ? '#60C0F0' : 'rgba(255,255,255,0.5)'};
  font-size: 14px;
  font-weight: ${p => p.$active ? 600 : 500};
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: ${p => p.$active ? '100%' : '0'};
    height: 2px;
    background: #60C0F0;
    transition: width 0.3s;
  }
  &:hover { color: ${p => p.$active ? '#60C0F0' : '#fff'}; }
`;

const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { padding: 10px 12px; text-align: left; font-size: 13px; }
  th { color: rgba(255,255,255,0.5); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08); }
  td { color: rgba(255,255,255,0.8); border-bottom: 1px solid rgba(255,255,255,0.04); }
  tr:hover td { background: rgba(255,255,255,0.02); }
  @media (max-width: 768px) {
    display: block;
    th { display: none; }
    tr { display: block; margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; }
    td { display: flex; justify-content: space-between; padding: 4px 0; border: none; }
    td::before { content: attr(data-label); font-weight: 600; color: rgba(255,255,255,0.5); }
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  ${p => {
    switch (p.$status) {
      case 'requested': return 'background: rgba(255,193,7,0.15); color: #ffc107;';
      case 'in_progress': return 'background: rgba(139, 92, 246,0.15); color: #60C0F0;';
      case 'completed': return 'background: rgba(76,175,80,0.15); color: #4caf50;';
      case 'delivered': return 'background: rgba(139,92,246,0.15); color: #b794f6;';
      default: return 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);';
    }
  }}
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  padding: 6px 14px;
  min-height: 36px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.12);
  ${p => p.$variant === 'primary' && 'background: linear-gradient(135deg, #60C0F0, #8B5CF6); color: #002060; border: none;'}
  ${p => p.$variant === 'danger' && 'background: rgba(220,38,38,0.15); color: #ef4444; border-color: rgba(220,38,38,0.3);'}
  ${p => (!p.$variant || p.$variant === 'ghost') && 'background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);'}
  &:hover { opacity: 0.85; }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const Input = styled.input`
  padding: 10px 14px;
  min-height: 44px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  width: 100%;
  &:focus { border-color: rgba(139, 92, 246,0.5); }
  &::placeholder { color: rgba(255,255,255,0.3); }
`;

const TextArea = styled.textarea`
  padding: 10px 14px;
  min-height: 80px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
  &:focus { border-color: rgba(139, 92, 246,0.5); }
`;

const DropZone = styled.div<{ $dragging?: boolean }>`
  border: 2px dashed ${p => p.$dragging ? '#60C0F0' : 'rgba(255,255,255,0.15)'};
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
  background: ${p => p.$dragging ? 'rgba(139, 92, 246,0.05)' : 'transparent'};
  &:hover { border-color: rgba(139, 92, 246,0.3); }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 16px;
`;

const PhotoThumbWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PhotoThumb = styled.div`
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  &:hover img { transform: scale(1.03); }
`;

const PhotoThumbName = styled.div`
  text-align: center;
  color: #fff;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2px;
`;

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: pointer;
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
`;

const LightboxCaption = styled.div`
  color: #fff;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
  text-align: center;
`;

const LightboxClose = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.2); }
`;

const ToggleSwitch = styled.button<{ $on: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: ${p => p.$on ? '#60C0F0' : 'rgba(255,255,255,0.15)'};
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${p => p.$on ? '22px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${p => p.$on ? '#002060' : '#fff'};
    transition: left 0.3s;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(255,255,255,0.4);
  font-size: 14px;
`;

// ── Messages Table Styled Components ──────────────────────────────────────
const MessagesTableContainer = styled.div`
  background: #0a0a1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow-x: auto;
`;

const MessagesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;

  th {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #A0AABF;
    letter-spacing: 0.05em;
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  td {
    font-family: 'Sora', system-ui, sans-serif;
    font-size: 0.875rem;
    color: #FFFFFF;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: top;
  }

  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  @media (max-width: 768px) {
    display: block;
    min-width: unset;
    th { display: none; }
    tr { display: block; margin-bottom: 12px; padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 8px; }
    td { display: flex; justify-content: space-between; padding: 4px 0; border: none; }
    td::before { content: attr(data-label); font-weight: 600; color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; }
  }
`;

const MessageRow = styled.tr<{ $unread: boolean }>`
  border-left: 3px solid ${p => p.$unread ? '#60C0F0' : 'transparent'};
`;

const MessageCell = styled.td<{ $expanded?: boolean }>`
  max-width: 300px;
  ${p => !p.$expanded && `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
  cursor: pointer;
  &:hover { color: #60C0F0; }
`;

const ReadBadge = styled.span<{ $read: boolean }>`
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  ${p => p.$read
    ? 'background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.4);'
    : 'background: rgba(96, 192, 240, 0.15); color: #60C0F0;'}
`;

const UnreadBadgeCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #60C0F0;
  color: #002060;
  font-size: 11px;
  font-weight: 700;
  margin-left: 6px;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

// ── Component ─────────────────────────────────────────────────────────────
const AdminGalleryManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'enhancements' | 'donations' | 'referrals' | 'leads' | 'messages'>('events');
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [events, setEvents] = useState<GalleryEvent[]>([]);
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [messages, setMessages] = useState<GalleryMessage[]>([]);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const [messagesUnreadOnly, setMessagesUnreadOnly] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Create event form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', sport: '', location: '', password: '', description: '', eventDate: '', isPublished: true });

  // Event message editor
  const [messageEventId, setMessageEventId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messageSaving, setMessageSaving] = useState(false);

  // Upload state
  const [uploadEventId, setUploadEventId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [uploadMode] = useState<'jpeg'>('jpeg');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileCount, setUploadFileCount] = useState(0);
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>('');
  const [uploadCompletedBatches, setUploadCompletedBatches] = useState(0);
  const [uploadTotalBatches, setUploadTotalBatches] = useState(0);
  const [uploadCompletedPhotos, setUploadCompletedPhotos] = useState(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; displayName: string } | null>(null);
  // Per-file upload status tracking
  const [fileStatuses, setFileStatuses] = useState<Array<{ name: string; status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'; error?: string; displayName?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const cancelledRef = useRef(false);
  const failedFilesRef = useRef<File[]>([]);

  useEffect(() => { loadStats(); loadEvents(); loadMessagesUnreadCount(); }, []);
  useEffect(() => {
    if (activeTab === 'enhancements') loadEnhancements();
    if (activeTab === 'donations') loadDonations();
    if (activeTab === 'referrals') loadReferrals();
    if (activeTab === 'leads') loadVisitors();
    if (activeTab === 'messages') loadMessages();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/stats`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch { /* best effort */ }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/events`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch { /* */ }
    setLoading(false);
  };

  const loadEnhancements = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/enhancements?status=all`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setEnhancements(data.requests);
    } catch { /* */ }
  };

  const loadDonations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/donations`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setDonations(data.donations);
    } catch { /* */ }
  };

  const loadReferrals = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/referrals`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setReferrals(data.referrals);
    } catch { /* */ }
  };

  const loadVisitors = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/visitors`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setVisitors(data.visitors);
    } catch { /* */ }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/messages`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        // Map nested backend response to flat GalleryMessage interface
        const mapped = (data.messages || []).map((m: any) => ({
          id: m.id,
          visitorName: m.firstName || m.visitor?.firstName || '—',
          visitorEmail: m.email || m.visitor?.email || '—',
          visitorPhone: m.phone || null,
          eventName: m.event?.name || null,
          message: m.message,
          isRead: m.isRead,
          createdAt: m.createdAt,
        }));
        setMessages(mapped);
      }
    } catch { /* */ }
  };

  const loadMessagesUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/messages/count`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setMessagesUnreadCount(data.count || 0);
    } catch { /* */ }
  };

  const markMessageRead = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/messages/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
        setMessagesUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch { /* */ }
  };

  const createEvent = async () => {
    if (!newEvent.name || !newEvent.password) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newEvent),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateForm(false);
        setNewEvent({ name: '', sport: '', location: '', password: '', description: '', eventDate: '', isPublished: true });
        loadEvents();
        loadStats();
      }
    } catch { /* */ }
  };

  const togglePublish = async (event: GalleryEvent) => {
    try {
      await fetch(`${API_BASE}/api/admin/gallery/events/${event.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isPublished: !event.isPublished }),
      });
      loadEvents();
    } catch { /* */ }
  };

  const openMessageEditor = (event: GalleryEvent) => {
    setMessageEventId(event.id);
    setMessageText(event.description || '');
  };

  const saveEventMessage = async () => {
    if (messageEventId === null) return;
    setMessageSaving(true);
    try {
      await fetch(`${API_BASE}/api/admin/gallery/events/${messageEventId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ description: messageText.trim() || null }),
      });
      loadEvents();
      setMessageEventId(null);
      setMessageText('');
    } catch { /* */ } finally {
      setMessageSaving(false);
    }
  };

  // ── Sequential Single-File Upload ──────────────────────────────────────
  // Uploads files ONE at a time to prevent OOM on Render's 512MB plan.
  // Each file is fully processed (RAW→JPEG + watermark) before the next starts.

  // Upload limits — JPEG only (RAW uploads dropped, export from Lightroom first)
  const UPLOAD_LIMITS = {
    jpeg: { maxFiles: 500, maxSizeMB: 25, label: 'JPEG Upload', desc: 'High-quality JPEGs — auto-generates thumbnails + watermark, fast uploads' },
  };

  // Upload a single file via the dedicated single-file endpoint
  const uploadSingleFile = (
    eventId: number,
    file: File,
    fileIndex: number,
  ): Promise<{ success: boolean; photo?: any; error?: string }> => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('watermark', watermarkEnabled ? 'true' : 'false');
      formData.append('sourceType', uploadMode);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const fileProgress = Math.round((e.loaded / e.total) * 100);
          // Update this file's status to show upload progress
          setFileStatuses(prev => prev.map((fs, i) =>
            i === fileIndex ? { ...fs, status: fileProgress < 100 ? 'uploading' : 'processing' } : fs
          ));
        }
      });

      xhr.addEventListener('load', () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              resolve({ success: true, photo: data.photo });
            } else {
              resolve({ success: false, error: data.error || 'Server error' });
            }
          } catch {
            resolve({ success: false, error: 'Could not parse response' });
          }
        } else if (xhr.status === 422) {
          // RAW conversion failed
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ success: false, error: data.error || 'Conversion failed' });
          } catch {
            resolve({ success: false, error: `Server returned ${xhr.status}` });
          }
        } else {
          resolve({ success: false, error: `Server returned ${xhr.status}` });
        }
      });

      xhr.addEventListener('error', () => { xhrRef.current = null; resolve({ success: false, error: 'Network error' }); });
      xhr.addEventListener('abort', () => { xhrRef.current = null; resolve({ success: false, error: 'Cancelled' }); });
      xhr.addEventListener('timeout', () => { xhrRef.current = null; resolve({ success: false, error: 'Upload timeout — file may be too large' }); });

      const token = localStorage.getItem('token');
      xhr.open('POST', `${API_BASE}/api/admin/gallery/events/${eventId}/upload-single`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 600000; // 10 min per file
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!uploadEventId || !files.length) return;
    const fileArray = Array.from(files);
    const limits = UPLOAD_LIMITS[uploadMode];

    // Enforce file count limit
    if (fileArray.length > limits.maxFiles) {
      setUploadError(`${uploadMode.toUpperCase()} mode allows max ${limits.maxFiles} files. You selected ${fileArray.length}.`);
      return;
    }

    // Enforce file size limits
    const oversized = fileArray.filter(f => f.size > limits.maxSizeMB * 1024 * 1024);
    if (oversized.length > 0) {
      setUploadError(`${oversized.length} file(s) exceed ${limits.maxSizeMB}MB limit: ${oversized.map(f => f.name).slice(0, 3).join(', ')}${oversized.length > 3 ? '...' : ''}`);
      return;
    }

    // Initialize per-file statuses
    const initialStatuses = fileArray.map(f => ({ name: f.name, status: 'pending' as const }));
    setFileStatuses(initialStatuses);

    // Reset state
    cancelledRef.current = false;
    failedFilesRef.current = [];
    setUploading(true);
    setUploadProgress(0);
    setUploadFileCount(fileArray.length);
    setUploadedPhotoCount(null);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadStartTime(Date.now());
    setUploadStatusMessage(`Uploading ${fileArray.length} photos (1 at a time, ${limits.label} mode)...`);
    setUploadCompletedBatches(0);
    setUploadTotalBatches(fileArray.length);
    setUploadCompletedPhotos(0);

    let totalUploaded = 0;
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      if (cancelledRef.current) {
        // Mark remaining as error
        setFileStatuses(prev => prev.map((fs, idx) =>
          idx >= i ? { ...fs, status: 'error', error: 'Cancelled' } : fs
        ));
        errors.push('Upload cancelled by user');
        break;
      }

      const file = fileArray[i];

      // Mark current file as uploading
      setFileStatuses(prev => prev.map((fs, idx) =>
        idx === i ? { ...fs, status: 'uploading' } : fs
      ));
      setUploadStatusMessage(`Uploading ${i + 1}/${fileArray.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);

      const result = await uploadSingleFile(uploadEventId, file, i);

      if (result.success) {
        totalUploaded++;
        setUploadCompletedPhotos(totalUploaded);
        setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100));
        setFileStatuses(prev => prev.map((fs, idx) =>
          idx === i ? { ...fs, status: 'done', displayName: result.photo?.displayName } : fs
        ));
        // Push completed photo to grid immediately so progress is visible
        if (result.photo) {
          setEventPhotos(prev => [...prev, result.photo]);
        }
        setUploadStatusMessage(`${totalUploaded}/${fileArray.length} done — ${file.name} uploaded as ${result.photo?.displayName || '?'}`);
      } else {
        errors.push(`${file.name}: ${result.error}`);
        failedFilesRef.current.push(file);
        setFileStatuses(prev => prev.map((fs, idx) =>
          idx === i ? { ...fs, status: 'error', error: result.error } : fs
        ));
        setUploadStatusMessage(`Failed: ${file.name} — ${result.error}. Continuing...`);
      }

      // Brief pause between files for server GC
      if (i < fileArray.length - 1 && !cancelledRef.current) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Final state
    setUploadProgress(100);
    setUploading(false);
    xhrRef.current = null;

    if (totalUploaded > 0) {
      setUploadedPhotoCount(totalUploaded);
      const wm = watermarkEnabled ? ' with watermark' : '';
      if (errors.length === 0) {
        setUploadSuccess(`All ${totalUploaded} photos uploaded successfully${wm}!`);
      } else {
        setUploadSuccess(`${totalUploaded}/${fileArray.length} photos uploaded${wm}. ${errors.length} failed.`);
        setUploadError(errors.join(' | '));
      }
      loadEvents();
      loadStats();
    } else {
      setUploadError(`All uploads failed: ${errors.join(' | ')}`);
    }
  };

  const cancelUpload = () => {
    cancelledRef.current = true;
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  };

  const retryFailedUploads = () => {
    const failed = failedFilesRef.current;
    if (failed.length === 0 || !uploadEventId) return;
    // Clear previous results and re-upload just the failed files
    setUploadSuccess(null);
    setUploadError(null);
    handleFileUpload(failed);
  };

  const getElapsedTime = (): string => {
    if (!uploadStartTime) return '';
    const elapsed = Math.round((Date.now() - uploadStartTime) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  };

  const updateEnhancementStatus = async (id: number, status: string) => {
    try {
      await fetch(`${API_BASE}/api/admin/gallery/enhancements/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      loadEnhancements();
      loadStats();
    } catch { /* */ }
  };

  const confirmZelle = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/admin/gallery/donations/${id}/confirm-zelle`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      loadDonations();
    } catch { /* */ }
  };

  const updateReferral = async (id: number, updates: { contacted?: boolean; converted?: boolean }) => {
    try {
      await fetch(`${API_BASE}/api/admin/gallery/referrals/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      loadReferrals();
      loadStats();
    } catch { /* */ }
  };

  const deleteEvent = async (eventId: number, eventName: string) => {
    if (!window.confirm(`Delete "${eventName}" and ALL its photos? This cannot be undone.`)) return;
    try {
      await fetch(`${API_BASE}/api/admin/gallery/events/${eventId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      loadEvents();
      loadStats();
    } catch { /* */ }
  };

  const deletePhoto = async (photoId: number) => {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    try {
      // Optimistic: remove from local state immediately for real-time feel
      setEventPhotos(prev => prev.filter(p => p.id !== photoId));

      await fetch(`${API_BASE}/api/admin/gallery/photos/${photoId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      loadEvents();
      loadStats();
      // Re-fetch photos to ensure consistency with server
      if (viewPhotosEventId) loadEventPhotos(viewPhotosEventId);
    } catch {
      // If delete failed, reload to restore state
      if (viewPhotosEventId) loadEventPhotos(viewPhotosEventId);
    }
  };

  // State for viewing event photos
  const [viewPhotosEventId, setViewPhotosEventId] = useState<number | null>(null);
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [voteStats, setVoteStats] = useState<any[]>([]);
  const [cleanupSuggestions, setCleanupSuggestions] = useState<any[]>([]);

  const loadEventPhotos = async (eventId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/events/${eventId}/photos`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setEventPhotos(data.photos);
    } catch { /* */ }
    // Also load vote stats
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/events/${eventId}/vote-stats`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setVoteStats(data.photos || []);
        setCleanupSuggestions(data.cleanup || []);
      }
    } catch { /* */ }
  };

  const handleBulkDelete = async (photoIds: number[]) => {
    if (!window.confirm(`Delete ${photoIds.length} photo(s) with negative feedback? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/photos/bulk-delete`, {
        method: 'DELETE',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      });
      const data = await res.json();
      if (data.success) {
        setEventPhotos(prev => prev.filter(p => !photoIds.includes(p.id)));
        setCleanupSuggestions(prev => prev.filter(p => !photoIds.includes(p.id)));
        setVoteStats(prev => prev.filter(p => !photoIds.includes(p.id)));
      }
    } catch { /* */ }
  };

  const toggleViewPhotos = (eventId: number) => {
    if (viewPhotosEventId === eventId) {
      setViewPhotosEventId(null);
      setEventPhotos([]);
      setVoteStats([]);
      setCleanupSuggestions([]);
    } else {
      setViewPhotosEventId(eventId);
      loadEventPhotos(eventId);
    }
  };

  return (
    <>
    <Wrapper>
      {/* R2 Storage Warning */}
      {stats && stats.storageType === 'base64-fallback' && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 8,
          background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#f59e0b', fontSize: 13, lineHeight: 1.5,
        }}>
          <strong>Storage Warning:</strong> Cloudflare R2 is not configured. Photos are being stored as base64 in the database,
          which causes slow uploads and database bloat. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME
          in your Render environment variables to enable cloud storage.
        </div>
      )}

      {/* R2 Active Indicator */}
      {stats && stats.storageType === 'cloudflare-r2' && (
        <div style={{
          padding: '8px 16px', marginBottom: 16, borderRadius: 8,
          background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.2)',
          color: '#4caf50', fontSize: 12,
        }}>
          Cloudflare R2 cloud storage active
        </div>
      )}

      {/* KPI Stats */}
      {stats && (
        <KPIGrid>
          <KPICard><KPIValue>{stats.totalEvents}</KPIValue><KPILabel>Events</KPILabel></KPICard>
          <KPICard><KPIValue>{stats.totalPhotos}</KPIValue><KPILabel>Photos</KPILabel></KPICard>
          <KPICard><KPIValue>{stats.totalVisitors}</KPIValue><KPILabel>Visitors</KPILabel></KPICard>
          <KPICard><KPIValue>{stats.newsletterSubscribers}</KPIValue><KPILabel>Subscribers</KPILabel></KPICard>
          <KPICard><KPIValue>{stats.pendingEnhancements}</KPIValue><KPILabel>Pending Enhancements</KPILabel></KPICard>
          <KPICard><KPIValue>${stats.totalDonationAmount.toFixed(2)}</KPIValue><KPILabel>Donations</KPILabel></KPICard>
          <KPICard><KPIValue>{stats.totalReferrals}</KPIValue><KPILabel>Referrals</KPILabel></KPICard>
          <KPICard><KPIValue>{stats.unconvertedReferrals}</KPIValue><KPILabel>Unconverted Leads</KPILabel></KPICard>
        </KPIGrid>
      )}

      {/* Tab Navigation */}
      <TabBar>
        <Tab $active={activeTab === 'events'} onClick={() => setActiveTab('events')}>Events</Tab>
        <Tab $active={activeTab === 'enhancements'} onClick={() => setActiveTab('enhancements')}>Enhancements</Tab>
        <Tab $active={activeTab === 'donations'} onClick={() => setActiveTab('donations')}>Donations</Tab>
        <Tab $active={activeTab === 'referrals'} onClick={() => setActiveTab('referrals')}>Referrals</Tab>
        <Tab $active={activeTab === 'leads'} onClick={() => setActiveTab('leads')}>Email Leads</Tab>
        <Tab $active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>
          ✉ Messages{messagesUnreadCount > 0 && <UnreadBadgeCount>{messagesUnreadCount}</UnreadBadgeCount>}
        </Tab>
      </TabBar>

      {/* ── Events Tab ─────────────────────────────────────────────── */}
      {activeTab === 'events' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <CardTitle style={{ margin: 0 }}>Gallery Events</CardTitle>
            <ActionBtn $variant="primary" onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : '+ New Event'}
            </ActionBtn>
          </div>

          {/* Create Event Form */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <GlassCard>
                  <CardTitle>Create New Event</CardTitle>
                  <FormRow>
                    <Input placeholder="Event Name *" value={newEvent.name} onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Event Password *" value={newEvent.password} onChange={e => setNewEvent(p => ({ ...p, password: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Input placeholder="Sport (basketball, soccer...)" value={newEvent.sport} onChange={e => setNewEvent(p => ({ ...p, sport: e.target.value }))} />
                    <Input type="date" value={newEvent.eventDate} onChange={e => setNewEvent(p => ({ ...p, eventDate: e.target.value }))} />
                  </FormRow>
                  <FormRow>
                    <Input placeholder="Location" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
                  </FormRow>
                  <TextArea placeholder="Description (optional)" value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ToggleSwitch $on={newEvent.isPublished} onClick={() => setNewEvent(p => ({ ...p, isPublished: !p.isPublished }))} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: newEvent.isPublished ? '#4caf50' : 'rgba(255,255,255,0.5)' }}>
                        {newEvent.isPublished ? 'Publish Immediately' : 'Save as Draft'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {newEvent.isPublished ? 'Event will be visible on the public gallery page right away' : 'Event will be hidden until you publish it later'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <ActionBtn $variant="primary" onClick={createEvent}>Create Event</ActionBtn>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Events List */}
          {events.length === 0 ? (
            <EmptyState>No events yet. Create your first event to start uploading photos.</EmptyState>
          ) : (
            events.map(event => (
              <GlassCard key={event.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <CardTitle style={{ margin: '0 0 4px' }}>{event.name}</CardTitle>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                      {event.sport && `${event.sport} · `}
                      {event.eventDate && `${new Date(event.eventDate).toLocaleDateString()} · `}
                      {event.location && `${event.location} · `}
                      {event.photoCount} photos
                      {' · '}
                      <span style={{ color: '#60C0F0', cursor: 'pointer' }}>/gallery/{event.slug}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {event.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <ToggleSwitch $on={event.isPublished} onClick={() => togglePublish(event)} />
                    <ActionBtn onClick={() => toggleViewPhotos(event.id)}>
                      {viewPhotosEventId === event.id ? 'Hide Photos' : 'View Photos'}
                    </ActionBtn>
                    <ActionBtn onClick={() => setUploadEventId(uploadEventId === event.id ? null : event.id)}>
                      {uploadEventId === event.id ? 'Close' : 'Upload Photos'}
                    </ActionBtn>
                    <ActionBtn
                      style={{ background: event.description ? 'rgba(96,192,240,0.15)' : 'rgba(198,168,75,0.15)', color: event.description ? '#60C0F0' : '#C6A84B', borderColor: event.description ? 'rgba(96,192,240,0.3)' : 'rgba(198,168,75,0.3)' }}
                      onClick={() => messageEventId === event.id ? setMessageEventId(null) : openMessageEditor(event)}
                    >
                      {messageEventId === event.id ? 'Close' : event.description ? '✏ Edit Note' : '💬 Add Note'}
                    </ActionBtn>
                    <ActionBtn
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => deleteEvent(event.id, event.name)}
                    >
                      Delete Event
                    </ActionBtn>
                  </div>
                </div>

                {/* Photographer's Note Editor */}
                <AnimatePresence>
                  {messageEventId === event.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: 12 }}>
                      <div style={{
                        padding: 16, borderRadius: 12,
                        background: 'rgba(198, 168, 75, 0.05)',
                        border: '1px solid rgba(198, 168, 75, 0.2)',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#C6A84B', marginBottom: 8 }}>
                          Photographer's Note
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                          This message will be displayed to visitors viewing this gallery.
                        </div>
                        <TextArea
                          placeholder="Share your thoughts about this batch of photos..."
                          value={messageText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageText(e.target.value)}
                          style={{ minHeight: 80, marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <ActionBtn $variant="primary" onClick={saveEventMessage} style={{ opacity: messageSaving ? 0.6 : 1 }}>
                            {messageSaving ? 'Saving...' : 'Save Note'}
                          </ActionBtn>
                          {event.description && (
                            <ActionBtn onClick={() => { setMessageText(''); }} style={{ color: 'rgba(255,255,255,0.4)' }}>
                              Clear
                            </ActionBtn>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Show current note preview */}
                {event.description && messageEventId !== event.id && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(198, 168, 75, 0.04)', border: '1px solid rgba(198, 168, 75, 0.1)',
                    fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
                    whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden',
                  }}>
                    📝 {event.description.length > 120 ? event.description.slice(0, 120) + '...' : event.description}
                  </div>
                )}

                {/* Upload Area */}
                <AnimatePresence>
                  {uploadEventId === event.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: 16 }}>
                      {/* Lightroom Export Guide (collapsible tip) */}
                      <details style={{
                        marginBottom: 12, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(0,32,96,0.6) 0%, rgba(0,48,128,0.4) 100%)',
                        border: '1px solid rgba(198,168,75,0.25)',
                        backdropFilter: 'blur(8px)',
                        overflow: 'hidden',
                      }}>
                        <summary style={{
                          padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          listStyle: 'none', userSelect: 'none',
                        }}>
                          <span style={{ fontSize: 14 }}>📷</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#C6A84B' }}>
                            Recommended Export Settings
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                            click to expand
                          </span>
                        </summary>
                        <div style={{ padding: '0 16px 12px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: 12 }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Format:</span>
                            <span style={{ color: '#E0ECF4', fontWeight: 600 }}>JPEG</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Quality:</span>
                            <span style={{ color: '#E0ECF4', fontWeight: 600 }}>95</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Color Space:</span>
                            <span style={{ color: '#E0ECF4', fontWeight: 600 }}>sRGB</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Long Edge:</span>
                            <span style={{ color: '#E0ECF4', fontWeight: 600 }}>4000 pixels</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sharpening:</span>
                            <span style={{ color: '#E0ECF4', fontWeight: 600 }}>Screen, Standard</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.4 }}>
                            These settings produce 3-8MB files that look stunning on any screen and print beautifully up to 13×19". Max 25MB per file.
                          </div>
                        </div>
                      </details>

                      {/* Watermark Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <ToggleSwitch $on={watermarkEnabled} onClick={() => setWatermarkEnabled(!watermarkEnabled)} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: watermarkEnabled ? '#60C0F0' : 'rgba(255,255,255,0.5)' }}>
                            SwanStudios Watermark {watermarkEnabled ? 'ON' : 'OFF'}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            Auto-adds logo + sswanstudios.com to bottom-right of each photo
                          </div>
                        </div>
                      </div>

                      {!uploading && (
                        <DropZone
                          $dragging={dragging}
                          onDragOver={e => { e.preventDefault(); setDragging(true); }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={e => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files); }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                          <div>Drag & drop photos here, or click to browse</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                            {UPLOAD_LIMITS[uploadMode].desc}
                            {watermarkEnabled && ' · Watermark will be applied'}
                          </div>
                          <div style={{ fontSize: 11, color: '#60C0F0', marginTop: 4, fontWeight: 600 }}>
                            {UPLOAD_LIMITS.jpeg.label} · Up to {UPLOAD_LIMITS.jpeg.maxFiles} files · Max {UPLOAD_LIMITS.jpeg.maxSizeMB}MB each · Uploads 1 at a time
                          </div>
                        </DropZone>
                      )}

                      {/* Upload Progress */}
                      {uploading && (
                        <ProgressBarContainer>
                          <ProgressInfo>
                            <span>
                              {uploadCompletedPhotos}/{uploadFileCount} photos ({UPLOAD_LIMITS[uploadMode].label} mode)
                            </span>
                            <span style={{ fontWeight: 600, color: '#60C0F0' }}>
                              {uploadProgress}%
                              {uploadStartTime && ` · ${getElapsedTime()}`}
                            </span>
                          </ProgressInfo>
                          <ProgressBarTrack>
                            <ProgressBarFill $percent={uploadProgress} />
                          </ProgressBarTrack>
                          <ProgressInfo>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                              {uploadStatusMessage}
                            </span>
                            <ActionBtn
                              $variant="danger"
                              onClick={cancelUpload}
                              style={{ padding: '4px 12px', minHeight: 28, fontSize: 11 }}
                            >
                              Cancel
                            </ActionBtn>
                          </ProgressInfo>

                          {/* Per-File Status List */}
                          <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto', borderRadius: 8, background: 'rgba(0,0,0,0.2)', padding: 8 }}>
                            {fileStatuses.map((fs, idx) => (
                              <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                                fontSize: 12, borderBottom: idx < fileStatuses.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                              }}>
                                {(fs.status === 'uploading' || fs.status === 'processing') ? (
                                  <PulsingDot $color={fs.status === 'uploading' ? '#60C0F0' : '#C6A84B'} />
                                ) : (
                                  <span style={{
                                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                                    background: fs.status === 'done' ? '#22c55e'
                                      : fs.status === 'error' ? '#ef4444'
                                      : 'rgba(255,255,255,0.2)',
                                  }} />
                                )}
                                <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {fs.name}
                                </span>
                                <span style={{
                                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                                  color: fs.status === 'done' ? '#22c55e'
                                    : fs.status === 'error' ? '#ef4444'
                                    : fs.status === 'uploading' ? '#60C0F0'
                                    : fs.status === 'processing' ? '#C6A84B'
                                    : 'rgba(255,255,255,0.3)',
                                }}>
                                  {fs.status === 'done' ? (fs.displayName || 'Done')
                                    : fs.status === 'error' ? (fs.error || 'Failed')
                                    : fs.status === 'uploading' ? 'Uploading...'
                                    : fs.status === 'processing' ? 'Processing...'
                                    : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ProgressBarContainer>
                      )}

                      {/* Per-file results after upload completes */}
                      {!uploading && fileStatuses.length > 0 && (uploadSuccess || uploadError) && (
                        <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto', borderRadius: 8, background: 'rgba(0,0,0,0.15)', padding: 8 }}>
                          {fileStatuses.map((fs, idx) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px', fontSize: 11,
                            }}>
                              <span style={{ color: fs.status === 'done' ? '#22c55e' : '#ef4444' }}>
                                {fs.status === 'done' ? '✓' : '✕'}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{fs.name}</span>
                              {fs.displayName && <span style={{ color: '#60C0F0', marginLeft: 'auto' }}>{fs.displayName}</span>}
                              {fs.error && <span style={{ color: '#ef4444', marginLeft: 'auto' }}>{fs.error}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Success Notification */}
                      {uploadSuccess && !uploading && (
                        <Notification $type="success">
                          <span>✓</span> {uploadSuccess}
                          <ActionBtn
                            onClick={() => { setUploadSuccess(null); setUploadEventId(null); setFileStatuses([]); }}
                            style={{ marginLeft: 'auto', padding: '2px 10px', minHeight: 28, fontSize: 11 }}
                          >
                            Dismiss
                          </ActionBtn>
                        </Notification>
                      )}

                      {/* Error Notification */}
                      {uploadError && !uploading && (
                        <Notification $type="error">
                          <span>✕</span> {uploadError}
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            {failedFilesRef.current.length > 0 && (
                              <ActionBtn
                                onClick={retryFailedUploads}
                                style={{ padding: '2px 10px', minHeight: 28, fontSize: 11, background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)' }}
                              >
                                Retry {failedFilesRef.current.length} Failed
                              </ActionBtn>
                            )}
                            <ActionBtn
                              onClick={() => setUploadError(null)}
                              style={{ padding: '2px 10px', minHeight: 28, fontSize: 11 }}
                            >
                              Dismiss
                            </ActionBtn>
                          </div>
                        </Notification>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.arw,.cr2,.cr3,.nef,.nrw,.orf,.raf,.rw2,.pef,.srw,.dng,.raw"
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ''; }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Photo Grid with Delete Buttons + Vote Stats */}
                <AnimatePresence>
                  {viewPhotosEventId === event.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: 16 }}>

                      {/* Cleanup Suggestions Panel */}
                      {cleanupSuggestions.length > 0 && (
                        <div style={{
                          width: '100%', padding: 16, marginBottom: 16, borderRadius: 12,
                          background: 'linear-gradient(180deg, rgba(0,16,64,0.8) 0%, rgba(0,16,64,0.4) 100%)',
                          border: '1px solid rgba(255,94,126,0.3)', borderTop: '2px solid #FF5E7E',
                          backdropFilter: 'blur(16px)',
                          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ color: '#FF5E7E', fontSize: 18 }}>&#x26A0;</span>
                              <span style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>Cleanup Suggestions</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#8A8A9D' }}>
                              {cleanupSuggestions.length} photo(s) have more thumbs-down than thumbs-up
                            </div>
                          </div>
                          <button
                            onClick={() => handleBulkDelete(cleanupSuggestions.map((p: any) => p.id))}
                            style={{
                              height: 44, padding: '0 20px', background: 'rgba(255,94,126,0.1)',
                              color: '#FF5E7E', border: '1px solid rgba(255,94,126,0.3)',
                              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            Delete {cleanupSuggestions.length} Unpopular Photo(s)
                          </button>
                        </div>
                      )}

                      {eventPhotos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                          No photos uploaded yet.
                        </div>
                      ) : (
                        <PhotoGrid>
                          {eventPhotos.map((photo: any) => {
                            const vs = voteStats.find((v: any) => v.id === photo.id);
                            const thumbsUp = vs?.thumbsUp || 0;
                            const thumbsDown = vs?.thumbsDown || 0;
                            const sentiment = thumbsUp - thumbsDown;
                            const sentimentType = sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral';
                            return (
                              <PhotoThumbWrapper key={photo.id}>
                                <PhotoThumb onClick={() => setLightboxPhoto({ url: photo.url, displayName: photo.displayName })}>
                                  <img src={photo.thumbnailUrl || photo.url} alt={photo.displayName} />
                                  {/* Vote stat badge (admin) */}
                                  {(thumbsUp > 0 || thumbsDown > 0) && (
                                    <div style={{
                                      position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 6,
                                      padding: '3px 8px', background: 'rgba(0,16,64,0.85)', backdropFilter: 'blur(8px)',
                                      borderRadius: 6, fontSize: 12, fontWeight: 600,
                                      border: `1px solid ${sentimentType === 'positive' ? 'rgba(96,192,240,0.3)' : sentimentType === 'negative' ? 'rgba(255,94,126,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                      color: sentimentType === 'positive' ? '#60C0F0' : sentimentType === 'negative' ? '#FF5E7E' : '#fff',
                                    }}>
                                      <span>{thumbsUp > 0 ? `+${thumbsUp}` : ''}</span>
                                      {thumbsUp > 0 && thumbsDown > 0 && <span>/</span>}
                                      <span>{thumbsDown > 0 ? `-${thumbsDown}` : ''}</span>
                                    </div>
                                  )}
                                  <div style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    padding: '4px',
                                  }}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
                                      style={{
                                        background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: 4,
                                        color: '#fff', fontSize: 10, padding: '2px 6px', cursor: 'pointer',
                                        minHeight: 24, minWidth: 24
                                      }}
                                      title="Delete photo"
                                    >
                                      &#x2715;
                                    </button>
                                  </div>
                                </PhotoThumb>
                                <PhotoThumbName title={photo.displayName}>
                                  {photo.displayName}
                                  {photo.sourceType && (
                                    <span style={{
                                      marginLeft: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px',
                                      borderRadius: 4, verticalAlign: 'middle',
                                      background: photo.sourceType === 'raw' ? 'rgba(139,92,246,0.2)' : 'rgba(96,192,240,0.2)',
                                      color: photo.sourceType === 'raw' ? '#8B5CF6' : '#60C0F0',
                                      border: `1px solid ${photo.sourceType === 'raw' ? 'rgba(139,92,246,0.3)' : 'rgba(96,192,240,0.3)'}`,
                                    }}>
                                      {photo.sourceType === 'raw' ? 'RAW' : 'HQ'}
                                    </span>
                                  )}
                                </PhotoThumbName>
                              </PhotoThumbWrapper>
                            );
                          })}
                        </PhotoGrid>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            ))
          )}
        </>
      )}

      {/* ── Enhancements Tab ───────────────────────────────────────── */}
      {activeTab === 'enhancements' && (
        <GlassCard>
          <CardTitle>Enhancement Requests</CardTitle>
          {enhancements.length === 0 ? (
            <EmptyState>No enhancement requests yet</EmptyState>
          ) : (
            <Table>
              <thead><tr><th>Photo</th><th>Visitor</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                {enhancements.map(req => (
                  <tr key={req.id}>
                    <td data-label="Photo">{req.photo.displayName}</td>
                    <td data-label="Visitor">{req.visitor.email}</td>
                    <td data-label="Status"><StatusBadge $status={req.status}>{req.status}</StatusBadge></td>
                    <td data-label="Requested">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      {req.status === 'requested' && <ActionBtn onClick={() => updateEnhancementStatus(req.id, 'in_progress')}>Start</ActionBtn>}
                      {req.status === 'in_progress' && <ActionBtn onClick={() => updateEnhancementStatus(req.id, 'completed')}>Complete</ActionBtn>}
                      {req.status === 'completed' && <ActionBtn $variant="primary" onClick={() => updateEnhancementStatus(req.id, 'delivered')}>Deliver</ActionBtn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </GlassCard>
      )}

      {/* ── Donations Tab ──────────────────────────────────────────── */}
      {activeTab === 'donations' && (
        <GlassCard>
          <CardTitle>Donations</CardTitle>
          {donations.length === 0 ? (
            <EmptyState>No donations yet</EmptyState>
          ) : (
            <Table>
              <thead><tr><th>Donor</th><th>Amount</th><th>Method</th><th>Event</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id}>
                    <td data-label="Donor">{d.visitor.email}</td>
                    <td data-label="Amount" style={{ color: '#60C0F0', fontWeight: 700 }}>${parseFloat(d.amount).toFixed(2)}</td>
                    <td data-label="Method">{d.method}{d.method === 'zelle' && !d.zelleConfirmed && ' (unverified)'}</td>
                    <td data-label="Event">{d.event.name}</td>
                    <td data-label="Date">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      {d.method === 'zelle' && !d.zelleConfirmed && (
                        <ActionBtn $variant="primary" onClick={() => confirmZelle(d.id)}>Confirm Zelle</ActionBtn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </GlassCard>
      )}

      {/* ── Referrals Tab ──────────────────────────────────────────── */}
      {activeTab === 'referrals' && (
        <GlassCard>
          <CardTitle>PT Referrals</CardTitle>
          {referrals.length === 0 ? (
            <EmptyState>No referrals yet</EmptyState>
          ) : (
            <Table>
              <thead><tr><th>Referred Person</th><th>Phone</th><th>From</th><th>Event</th><th>Contacted</th><th>Converted</th></tr></thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id}>
                    <td data-label="Name">{r.referralName}</td>
                    <td data-label="Phone">{r.referralPhone}</td>
                    <td data-label="From">{r.visitor.email}</td>
                    <td data-label="Event">{r.event.name}</td>
                    <td data-label="Contacted">
                      <ToggleSwitch $on={r.contacted} onClick={() => updateReferral(r.id, { contacted: !r.contacted })} />
                    </td>
                    <td data-label="Converted">
                      <ToggleSwitch $on={r.converted} onClick={() => updateReferral(r.id, { converted: !r.converted })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </GlassCard>
      )}

      {/* ── Email Leads Tab ────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <GlassCard>
          <CardTitle>Gallery Email Leads ({visitors.length})</CardTitle>
          {visitors.length === 0 ? (
            <EmptyState>No visitor emails captured yet</EmptyState>
          ) : (
            <Table>
              <thead><tr><th>Email</th><th>Name</th><th>Event</th><th>Newsletter</th><th>Date</th></tr></thead>
              <tbody>
                {visitors.map((v: any) => (
                  <tr key={v.id}>
                    <td data-label="Email">{v.email}</td>
                    <td data-label="Name">{[v.firstName, v.lastName].filter(Boolean).join(' ') || '—'}</td>
                    <td data-label="Event">{v.event?.name || '—'}</td>
                    <td data-label="Newsletter">{v.newsletterOptIn ? '✓' : '—'}</td>
                    <td data-label="Date">{new Date(v.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </GlassCard>
      )}

      {/* ── Messages Tab ─────────────────────────────────────────────── */}
      {activeTab === 'messages' && (
        <GlassCard>
          <CardTitle>Visitor Messages ({messages.length})</CardTitle>
          <FilterBar>
            <span>Show unread only</span>
            <ToggleSwitch $on={messagesUnreadOnly} onClick={() => setMessagesUnreadOnly(!messagesUnreadOnly)} />
          </FilterBar>
          {(() => {
            const filtered = messagesUnreadOnly ? messages.filter(m => !m.isRead) : messages;
            if (filtered.length === 0) {
              return <EmptyState>{messagesUnreadOnly ? 'No unread messages' : 'No messages received yet'}</EmptyState>;
            }
            return (
              <MessagesTableContainer>
                <MessagesTable>
                  <thead>
                    <tr>
                      <th>Visitor</th>
                      <th>Phone</th>
                      <th>Event</th>
                      <th>Message</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(msg => (
                      <MessageRow key={msg.id} $unread={!msg.isRead}>
                        <td data-label="Visitor">
                          <div style={{ fontWeight: 600 }}>{msg.visitorName || '—'}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{msg.visitorEmail}</div>
                        </td>
                        <td data-label="Phone">{msg.visitorPhone || '—'}</td>
                        <td data-label="Event">{msg.eventName || '—'}</td>
                        <MessageCell
                          data-label="Message"
                          $expanded={expandedMessageId === msg.id}
                          onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                        >
                          {msg.message}
                        </MessageCell>
                        <td data-label="Date">
                          {new Date(msg.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td data-label="Status">
                          <ReadBadge $read={msg.isRead}>{msg.isRead ? 'Read' : 'Unread'}</ReadBadge>
                        </td>
                        <td data-label="Action">
                          {!msg.isRead && (
                            <ActionBtn $variant="ghost" onClick={() => markMessageRead(msg.id)}>
                              Mark as Read
                            </ActionBtn>
                          )}
                        </td>
                      </MessageRow>
                    ))}
                  </tbody>
                </MessagesTable>
              </MessagesTableContainer>
            );
          })()}
        </GlassCard>
      )}
    </Wrapper>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <LightboxOverlay onClick={() => setLightboxPhoto(null)}>
          <LightboxClose onClick={() => setLightboxPhoto(null)} aria-label="Close lightbox">
            &#x2715;
          </LightboxClose>
          <LightboxImage
            src={lightboxPhoto.url}
            alt={lightboxPhoto.displayName}
            onClick={(e) => e.stopPropagation()}
          />
          <LightboxCaption>{lightboxPhoto.displayName}</LightboxCaption>
        </LightboxOverlay>
      )}
    </>
  );
};

export default AdminGalleryManager;
