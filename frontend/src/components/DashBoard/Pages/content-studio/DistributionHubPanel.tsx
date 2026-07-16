/**
 * ┌─── SUB-COMPONENT: DistributionHubPanel ────────────────────┐
 * │ PARENT: ContentStudioHub                                     │
 * │ PURPOSE: Multi-platform content scheduling & publishing     │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────────┐             │
 * │ │ Distribution Hub                              │             │
 * │ │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐     │             │
 * │ │ │YouTube│ │TikTok │ │Insta  │ │Twitter│     │             │
 * │ │ │ ✓ On  │ │ ✓ On  │ │ ✗ Off │ │ ✗ Off │     │             │
 * │ │ └───────┘ └───────┘ └───────┘ └───────┘     │             │
 * │ │ Queue:                                        │             │
 * │ │ ┌──────────────────────────────────────────┐ │             │
 * │ │ │ "Squat Form" · YouTube · Mar 30 10am    │ │             │
 * │ │ │ "Leg Day Reel" · TikTok · Mar 30 2pm   │ │             │
 * │ │ └──────────────────────────────────────────┘ │             │
 * │ │ [+ Add to Queue]                             │             │
 * │ └──────────────────────────────────────────────┘             │
 * │ Props: (none)                                                │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Platform toggle] → Toggles platform enabled state           │
 * │ [Add to Queue] → Opens scheduling form                       │
 * │ [Publish] → POST /api/content-studio/distribute              │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Share2, Youtube, Clock, Plus, Trash2, Send,
  CheckCircle2, XCircle, Loader2, Calendar,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
}

interface QueueItem {
  id: string;
  title: string;
  platformId: string;
  scheduledAt: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrap = styled.div`padding: 24px;`;

const SectionLabel = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlatformGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 28px;
`;

const PlatformCard = styled.button<{ $enabled: boolean; $color: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 12px;
  border: 1px solid ${({ $enabled, $color }) =>
    $enabled ? `color-mix(in srgb, ${$color} 35%, transparent)` : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  background: ${({ $enabled, $color }) =>
    $enabled ? `color-mix(in srgb, ${$color} 10%, transparent)` : 'var(--bg-elevated, #141419)'};
  color: ${({ $enabled, $color }) =>
    $enabled ? $color : 'var(--text-muted, rgba(224, 236, 244, 0.45))'};
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $color }) => `color-mix(in srgb, ${$color} 40%, transparent)`};
  }
`;

const PlatformName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
`;

const PlatformStatus = styled.span<{ $enabled: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const QueueSection = styled.div`margin-bottom: 24px;`;

const QueueEmpty = styled.div`
  padding: 32px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-size: 0.85rem;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 12px;
`;

const QueueCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin-bottom: 8px;
  transition: border-color 0.15s ease;

  &:hover { border-color: var(--accent-primary, rgba(96, 192, 240, 0.2)); }
`;

const QueueInfo = styled.div`flex: 1; min-width: 0;`;

const QueueTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const QueueMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`;

const StatusChip = styled.span<{ $status: string }>`
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ $status }) => {
    switch ($status) {
      case 'published': return 'rgba(96, 192, 240, 0.15)';
      case 'publishing': return 'rgba(139, 92, 246, 0.15)';
      case 'failed': return 'rgba(201, 42, 84, 0.15)';
      default: return 'rgba(198, 168, 75, 0.15)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'published': return '#60C0F0';
      case 'publishing': return '#8B5CF6';
      case 'failed': return '#C92A54';
      default: return '#C6A84B';
    }
  }};
`;

const IconBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { color: var(--accent-primary, #60C0F0); border-color: var(--accent-primary, rgba(96, 192, 240, 0.25)); }
`;

const AddRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const AddInput = styled.input`
  flex: 1;
  min-width: 180px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  &::placeholder { color: rgba(224, 236, 244, 0.3); }
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const SelectInput = styled.select`
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  &:hover { box-shadow: 0 0 16px rgba(139, 92, 246, 0.3); transform: scale(1.02); }
  &:active { transform: scale(0.97); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const DistributionHubPanel: React.FC = () => {
  const { authAxios } = useAuth();

  const [platforms, setPlatforms] = useState<Platform[]>([
    { id: 'youtube', name: 'YouTube', icon: <Youtube size={20} />, color: '#FF0000', enabled: true },
    { id: 'tiktok', name: 'TikTok', icon: <Share2 size={20} />, color: '#69C9D0', enabled: true },
    { id: 'instagram', name: 'Instagram', icon: <Share2 size={20} />, color: '#E1306C', enabled: false },
    { id: 'twitter', name: 'X / Twitter', icon: <Share2 size={20} />, color: '#1DA1F2', enabled: false },
    { id: 'facebook', name: 'Facebook', icon: <Share2 size={20} />, color: '#1877F2', enabled: false },
    { id: 'linkedin', name: 'LinkedIn', icon: <Share2 size={20} />, color: '#0A66C2', enabled: false },
  ]);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('youtube');

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const addToQueue = () => {
    if (!newTitle.trim()) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    setQueue(prev => [...prev, {
      id: Date.now().toString(),
      title: newTitle.trim(),
      platformId: newPlatform,
      scheduledAt: tomorrow.toISOString(),
      status: 'pending',
    }]);
    setNewTitle('');
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const publishItem = async (id: string) => {
    setQueue(prev => prev.map(q =>
      q.id === id ? { ...q, status: 'publishing' as const } : q
    ));
    try {
      await authAxios.post('/api/content-studio/distribute', {
        queueItemId: id,
      });
      setQueue(prev => prev.map(q =>
        q.id === id ? { ...q, status: 'published' as const } : q
      ));
    } catch {
      setQueue(prev => prev.map(q =>
        q.id === id ? { ...q, status: 'failed' as const } : q
      ));
    }
  };

  const enabledPlatforms = platforms.filter(p => p.enabled);

  return (
    <Wrap>
      <SectionLabel><Share2 size={16} /> Connected Platforms</SectionLabel>
      <PlatformGrid>
        {platforms.map(p => (
          <PlatformCard
            key={p.id}
            $enabled={p.enabled}
            $color={p.color}
            onClick={() => togglePlatform(p.id)}
            aria-pressed={p.enabled}
          >
            {p.icon}
            <PlatformName>{p.name}</PlatformName>
            <PlatformStatus $enabled={p.enabled}>
              {p.enabled ? <><CheckCircle2 size={10} /> Connected</> : <><XCircle size={10} /> Off</>}
            </PlatformStatus>
          </PlatformCard>
        ))}
      </PlatformGrid>

      <QueueSection>
        <SectionLabel><Clock size={16} /> Publishing Queue</SectionLabel>

        {queue.length === 0 ? (
          <QueueEmpty>
            No items queued. Add content below to schedule publishing.
          </QueueEmpty>
        ) : (
          queue.map(item => {
            const platform = platforms.find(p => p.id === item.platformId);
            return (
              <QueueCard key={item.id}>
                <QueueInfo>
                  <QueueTitle>{item.title}</QueueTitle>
                  <QueueMeta>
                    <span>{platform?.name || item.platformId}</span>
                    <span><Calendar size={9} /> {new Date(item.scheduledAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}</span>
                    <StatusChip $status={item.status}>{item.status}</StatusChip>
                  </QueueMeta>
                </QueueInfo>
                {item.status === 'pending' && (
                  <>
                    <IconBtn onClick={() => publishItem(item.id)} title="Publish now">
                      <Send size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => removeFromQueue(item.id)} title="Remove">
                      <Trash2 size={14} />
                    </IconBtn>
                  </>
                )}
                {item.status === 'publishing' && <StyledBox as={Loader2} size={16} $style={{ color: '#8B5CF6' }} />}
              </QueueCard>
            );
          })
        )}

        <AddRow>
          <AddInput
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Content title..."
            onKeyDown={e => e.key === 'Enter' && addToQueue()}
          />
          <SelectInput value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>
            {enabledPlatforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SelectInput>
          <AddBtn onClick={addToQueue}>
            <Plus size={14} /> Add to Queue
          </AddBtn>
        </AddRow>
      </QueueSection>
    </Wrap>
  );
};

export default DistributionHubPanel;
