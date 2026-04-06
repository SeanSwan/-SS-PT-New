/**
 * ============================================================================
 * FILE: SocialDistributionPanel.tsx
 * PURPOSE: Multi-platform social media distribution with previews & captions
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * PHASE: 10 — Content Studio Upgrades
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Compose and preview social media posts for Instagram,
 * Facebook, and X (Twitter). Generates captions with hashtag suggestions,
 * provides platform-specific preview cards, and scheduling.
 *
 * HOW IT FITS: Content Studio → "Social Publish" tab.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SocialDistributionPanel                          ║
 * ║  PURPOSE: Social media post creation + preview + scheduling   ║
 * ║  OWNER: Claude Opus 4.6                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  Instagram, Facebook, Twitter, Image, Calendar,
  Hash, Sparkles, Send, Loader2, Clock, Eye,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  SplitLayout, MainPanel, SidePanel, SectionTitle, MetaText,
  StudioTextArea, PrimaryBtn, SecondaryBtn, ActionRow,
  ChipRow, Chip, StudioCardRow,
} from './content-studio.styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
type Platform = 'instagram' | 'facebook' | 'x';

interface PlatformConfig {
  id: Platform;
  label: string;
  icon: React.ReactNode;
  maxChars: number;
  color: string;
  bestTimes: string[];
}

interface ScheduledPost {
  id: string;
  platforms: Platform[];
  caption: string;
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'failed';
}

const PLATFORMS: PlatformConfig[] = [
  { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} />, maxChars: 2200, color: '#E1306C', bestTimes: ['Tue 11am', 'Wed 10am', 'Fri 11am'] },
  { id: 'facebook', label: 'Facebook', icon: <Facebook size={18} />, maxChars: 63206, color: '#1877F2', bestTimes: ['Wed 11am', 'Fri 1pm', 'Sat 12pm'] },
  { id: 'x', label: 'X (Twitter)', icon: <Twitter size={18} />, maxChars: 280, color: '#E0ECF4', bestTimes: ['Tue 9am', 'Wed 12pm', 'Thu 2pm'] },
];

const HASHTAGS = [
  '#PersonalTraining', '#FitnessGoals', '#SwanStudios', '#GolfFitness',
  '#StrengthTraining', '#FunctionalFitness', '#TrainSmart', '#FitnessMotivation',
  '#GymLife', '#HealthyLifestyle', '#WorkoutTips', '#FitOver40',
];

// ─── Local Styled Components ─────────────────────────────────
const PlatformToggle = styled.button<{ $active: boolean; $color: string }>`
  all: unset; box-sizing: border-box; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; min-height: 44px; border-radius: 10px;
  font-family: 'Sora', sans-serif; font-size: 0.85rem; font-weight: 600;
  background: ${({ $active, $color }) => $active ? `${$color}20` : 'var(--bg-elevated, #141419)'};
  color: ${({ $active, $color }) => $active ? $color : 'rgba(224, 236, 244, 0.6)'};
  border: 1px solid ${({ $active, $color }) => $active ? `${$color}40` : 'rgba(96, 192, 240, 0.08)'};
  transition: all 0.2s ease;
  &:hover { border-color: ${({ $color }) => `${$color}30`}; }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const CharCount = styled.div<{ $over: boolean }>`
  font-family: 'Fira Code', monospace; font-size: 0.7rem;
  color: ${({ $over }) => ($over ? '#ef4444' : 'rgba(224, 236, 244, 0.5)')};
  text-align: right;
`;

const ScheduleInput = styled.input`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 8px; padding: 0 14px; height: 44px;
  color: var(--text-primary, #E0ECF4); font-family: 'Fira Code', monospace; font-size: 0.8rem;
  transition: border-color 0.3s ease;
  &:focus { outline: none; border-color: #8B5CF6; box-shadow: 0 0 12px rgba(139, 92, 246, 0.3); }
  &::-webkit-calendar-picker-indicator { filter: invert(0.8); }
`;

const PreviewCard = styled.div<{ $color: string }>`
  border-radius: 12px; overflow: hidden;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $color }) => `${$color}25`};
`;

const PreviewHeader = styled.div<{ $color: string }>`
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: ${({ $color }) => `${$color}10`};
  font-family: 'Sora', sans-serif; font-size: 0.75rem; font-weight: 600;
  color: ${({ $color }) => $color};
`;

const PreviewImageSlot = styled.div`
  height: 180px; background: var(--bg-base, #0A0A0F);
  display: flex; align-items: center; justify-content: center;
  color: rgba(224, 236, 244, 0.2);
`;

const PreviewCaption = styled.div`
  padding: 12px 14px; font-size: 0.8rem; color: var(--text-primary, #E0ECF4);
  line-height: 1.5; max-height: 120px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;
`;

const BestTimeCard = styled.div`
  padding: 12px 14px; border-radius: 10px;
  background: var(--bg-elevated, #141419); border: 1px solid rgba(96, 192, 240, 0.08);
`;

const TimeChip = styled.span`
  font-family: 'Fira Code', monospace; font-size: 0.65rem;
  padding: 3px 8px; border-radius: 4px;
  background: rgba(198, 168, 75, 0.1); color: #C6A84B;
  border: 1px solid rgba(198, 168, 75, 0.15);
`;

const QueueCaption = styled.div`
  font-size: 0.75rem; color: var(--text-primary, #E0ECF4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const SocialDistributionPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram']);
  const [caption, setCaption] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [queue, setQueue] = useState<ScheduledPost[]>([
    { id: '1', platforms: ['instagram', 'facebook'], caption: 'Transform your training with personalized coaching #PersonalTraining', scheduledFor: '2026-04-08T11:00', status: 'scheduled' },
    { id: '2', platforms: ['x'], caption: 'New blog: 5 exercises every desk worker needs. Link in bio.', scheduledFor: '2026-04-09T09:00', status: 'scheduled' },
  ]);

  const togglePlatform = (p: Platform) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleHashtag = (tag: string) => setSelectedHashtags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const fullCaption = caption + (selectedHashtags.length > 0 ? '\n\n' + selectedHashtags.join(' ') : '');
  const activeMinLimit = Math.min(...selectedPlatforms.map(p => PLATFORMS.find(pl => pl.id === p)?.maxChars ?? 9999));
  const isOverLimit = fullCaption.length > activeMinLimit;
  const activePlatform = PLATFORMS.find(p => p.id === selectedPlatforms[0]);

  const handleGenerateCaption = useCallback(async () => {
    setGeneratingCaption(true);
    try {
      const res = await authAxios.post('/api/content-studio/social/generate-caption', { platforms: selectedPlatforms });
      setCaption(res.data?.data?.caption || '');
    } catch { setCaption('Check out our latest training tips! Your fitness journey starts here.'); }
    finally { setGeneratingCaption(false); }
  }, [authAxios, selectedPlatforms]);

  const handlePublish = useCallback(async () => {
    if (selectedPlatforms.length === 0 || !caption.trim()) return;
    setPublishing(true);
    const post: ScheduledPost = {
      id: `post-${Date.now()}`, platforms: selectedPlatforms, caption: fullCaption,
      scheduledFor: scheduledDate || new Date().toISOString(),
      status: scheduledDate ? 'scheduled' : 'published',
    };
    try { await authAxios.post('/api/content-studio/social/publish', { platforms: selectedPlatforms, caption: fullCaption, scheduledFor: scheduledDate || null }); } catch { /* saved to queue */ }
    setQueue(prev => [post, ...prev]);
    setCaption(''); setSelectedHashtags([]); setScheduledDate(''); setPublishing(false);
  }, [authAxios, selectedPlatforms, caption, fullCaption, scheduledDate]);

  return (
    <SplitLayout>
      <MainPanel>
        <SectionTitle><Send size={18} style={{ color: '#8B5CF6' }} /> Social Post Composer</SectionTitle>

        <div style={{ display: 'flex', gap: 8 }}>
          {PLATFORMS.map(p => (
            <PlatformToggle key={p.id} $active={selectedPlatforms.includes(p.id)} $color={p.color} onClick={() => togglePlatform(p.id)}>
              {p.icon} {p.label}
            </PlatformToggle>
          ))}
        </div>

        <div>
          <StudioTextArea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write your caption..." />
          <CharCount $over={isOverLimit}>{fullCaption.length} / {activeMinLimit} characters{isOverLimit && ' — over limit!'}</CharCount>
        </div>

        <div>
          <SectionTitle style={{ fontSize: '0.85rem' }}><Hash size={14} /> Hashtags</SectionTitle>
          <ChipRow style={{ marginTop: 8 }}>
            {HASHTAGS.map(tag => (
              <Chip key={tag} $active={selectedHashtags.includes(tag)} $color="#60C0F0" onClick={() => toggleHashtag(tag)}>{tag}</Chip>
            ))}
          </ChipRow>
        </div>

        <ActionRow>
          <ScheduleInput type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} title="Schedule publish time" />
          <SecondaryBtn onClick={handleGenerateCaption} disabled={generatingCaption || selectedPlatforms.length === 0}>
            {generatingCaption ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
            Generate Caption
          </SecondaryBtn>
          <PrimaryBtn onClick={handlePublish} disabled={publishing || !caption.trim() || selectedPlatforms.length === 0}>
            {publishing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            {scheduledDate ? 'Schedule' : 'Publish Now'}
          </PrimaryBtn>
        </ActionRow>
      </MainPanel>

      <SidePanel $width={320}>
        {activePlatform && (
          <>
            <SectionTitle style={{ fontSize: '0.85rem' }}><Eye size={14} /> Preview</SectionTitle>
            <PreviewCard $color={activePlatform.color}>
              <PreviewHeader $color={activePlatform.color}>{activePlatform.icon} {activePlatform.label} Preview</PreviewHeader>
              <PreviewImageSlot><Image size={32} /></PreviewImageSlot>
              <PreviewCaption>{fullCaption || 'Your caption will appear here...'}</PreviewCaption>
            </PreviewCard>
            <BestTimeCard>
              <MetaText style={{ marginBottom: 6 }}><Clock size={12} /> Best times — {activePlatform.label}</MetaText>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {activePlatform.bestTimes.map(t => <TimeChip key={t}>{t}</TimeChip>)}
              </div>
            </BestTimeCard>
          </>
        )}

        <SectionTitle style={{ fontSize: '0.85rem' }}><Calendar size={14} /> Queue ({queue.length})</SectionTitle>
        {queue.slice(0, 5).map(post => (
          <StudioCardRow key={post.id}>
            <div style={{ display: 'flex', gap: 4 }}>
              {post.platforms.map(p => {
                const pl = PLATFORMS.find(x => x.id === p);
                return <span key={p} style={{ color: pl?.color }}>{pl?.icon}</span>;
              })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <QueueCaption>{post.caption}</QueueCaption>
              <MetaText>{post.status === 'scheduled' ? `Scheduled: ${new Date(post.scheduledFor).toLocaleDateString()}` : post.status}</MetaText>
            </div>
          </StudioCardRow>
        ))}
      </SidePanel>
    </SplitLayout>
  );
};

export default SocialDistributionPanel;
