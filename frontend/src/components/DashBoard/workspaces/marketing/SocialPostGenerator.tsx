/**
 * ┌─── PANEL: Social Post Generator ────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Create social media posts for Instagram, Facebook,  │
 * │          X/Twitter with Swan Coach branding, hashtags,       │
 * │          posting time recommendations, and preview cards.    │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Send, Clock, Hash } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ActionButton, StatusChip,
} from './marketing.styles';
import type { SocialPlatform, PlatformConfig } from './marketing.types';

// ─── Platform Config ───────────────────────────────────────────
const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  instagram: { name: 'Instagram', maxChars: 2200, color: '#E4405F', bestTimes: 'Tue/Thu 11am-1pm, Sat 9-11am' },
  facebook: { name: 'Facebook', maxChars: 63206, color: '#1877F2', bestTimes: 'Wed 11am-1pm, Fri 10-11am' },
  x: { name: 'X (Twitter)', maxChars: 280, color: '#E0ECF4', bestTimes: 'Mon-Fri 8-10am, 6-9pm' },
};

const HASHTAG_SUGGESTIONS: Record<string, string[]> = {
  brand: ['#SwanStudios', '#SwanCoach', '#TrainWithSwan', '#SwanFitness'],
  niche: ['#PersonalTraining', '#GolfFitness', '#YouthAthlete', '#FitnessCoach', '#StrengthTraining'],
  trending: ['#FitnessMotivation', '#TransformationTuesday', '#FitLife', '#GolfLife', '#WorkoutOfTheDay'],
};

const DEMO_POSTS = [
  { id: '1', platform: 'instagram' as SocialPlatform, caption: 'Another great session today! Working on rotational power for golf performance.', hashtags: ['#SwanStudios', '#GolfFitness'], suggestedTime: 'Thu 12pm', status: 'pending_review' as const },
  { id: '2', platform: 'x' as SocialPlatform, caption: 'Youth athletes need periodized training — not just more practice. Here\'s why:', hashtags: ['#SwanCoach', '#YouthAthlete'], suggestedTime: 'Mon 9am', status: 'draft' as const },
];

// ─── Styled Components ─────────────────────────────────────────
const PlatformTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

const PlatformBtn = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active, $color }) => $active ? $color : 'transparent'};
  background: ${({ $active, $color }) => $active ? hexAlpha($color, 0.1) : 'var(--bg-elevated, #141419)'};
  color: ${({ $active, $color }) => $active ? $color : 'var(--text-secondary, rgba(224, 236, 244, 0.5))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover { border-color: ${({ $color }) => $color}; }
`;

const Composer = styled.div`
  margin-bottom: 20px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: rgba(224, 236, 244, 0.3); }
`;

const CharCount = styled.div<{ $over: boolean }>`
  text-align: right;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  margin-top: 4px;
  color: ${({ $over }) => $over ? '#EF4444' : 'var(--text-secondary, rgba(224, 236, 244, 0.4))'};
`;

const HashtagSection = styled.div`
  margin-bottom: 20px;
`;

const HashtagCategory = styled.div`
  margin-bottom: 8px;
`;

const CatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  margin-right: 8px;
`;

const HashtagChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  margin: 2px 4px 2px 0;
  border-radius: 6px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  background: ${({ $selected }) =>
    $selected ? 'rgba(96, 192, 240, 0.12)' : 'transparent'};
  color: ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.5))'};
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 36px;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const BestTimeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(198, 168, 75, 0.08);
  border: 1px solid rgba(198, 168, 75, 0.2);
  margin-bottom: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #C6A84B;
`;

const PreviewCard = styled.div<{ $color: string }>`
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ $color }) => hexAlpha($color, 0.2)};
  background: var(--bg-elevated, #141419);
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const PreviewAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #002060, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`;

const PreviewName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const PreviewBody = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #E0ECF4);
  white-space: pre-wrap;
  margin-bottom: 8px;
`;

const PreviewTags = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;

  @media (max-width: 1000px) { grid-template-columns: 1fr; }
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`;

const RecentItem = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.06));
`;

const RecentCaption = styled.div`
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecentMeta = styled.div`
  font-size: 11px;
  font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ─── Component ─────────────────────────────────────────────────
const SocialPostGenerator: React.FC = () => {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#SwanStudios', '#PersonalTraining']);

  const config = PLATFORMS[platform];
  const charCount = caption.length;
  const isOver = charCount > config.maxChars;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const fullText = caption + (selectedTags.length ? '\n\n' + selectedTags.join(' ') : '');

  return (
    <Grid>
      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg={hexAlpha(config.color, 0.15)} $color={config.color}>
              <Send size={18} />
            </IconWrap>
            <div>
              <CardTitle>Social Post Generator</CardTitle>
              <CardSubtitle>Create posts for {config.name}</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        <PlatformTabs>
          {(Object.entries(PLATFORMS) as [SocialPlatform, PlatformConfig][]).map(([id, p]) => (
            <PlatformBtn key={id} $active={platform === id} $color={p.color} onClick={() => setPlatform(id)}>
              {p.name}
            </PlatformBtn>
          ))}
        </PlatformTabs>

        <BestTimeCard>
          <Clock size={16} />
          Best posting times: {config.bestTimes}
        </BestTimeCard>

        <Composer>
          <TextArea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder={`Write your ${config.name} post...`}
          />
          <CharCount $over={isOver}>{charCount} / {config.maxChars.toLocaleString()}</CharCount>
        </Composer>

        <HashtagSection>
          {Object.entries(HASHTAG_SUGGESTIONS).map(([cat, tags]) => (
            <HashtagCategory key={cat}>
              <CatLabel>{cat}:</CatLabel>
              {tags.map(tag => (
                <HashtagChip key={tag} $selected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </HashtagChip>
              ))}
            </HashtagCategory>
          ))}
        </HashtagSection>

        <ActionButton disabled={!caption.trim() || isOver}>
          <Send size={14} style={{ marginRight: 6 }} />
          Save to Draft Queue
        </ActionButton>
      </MarketingCard>

      <div>
        <PreviewCard $color={config.color}>
          <PreviewHeader>
            <PreviewAvatar>SS</PreviewAvatar>
            <PreviewName>SwanStudios</PreviewName>
          </PreviewHeader>
          <PreviewBody>{caption || 'Your post preview will appear here...'}</PreviewBody>
          {selectedTags.length > 0 && <PreviewTags>{selectedTags.join(' ')}</PreviewTags>}
        </PreviewCard>

        <RecentList>
          <CardTitle style={{ fontSize: 13, marginBottom: 4 }}>Recent Drafts</CardTitle>
          {DEMO_POSTS.map(p => (
            <RecentItem key={p.id}>
              <RecentCaption>{p.caption}</RecentCaption>
              <RecentMeta>
                <StatusChip $status={p.status}>{p.status.replace('_', ' ')}</StatusChip>
                <span>{PLATFORMS[p.platform].name}</span>
              </RecentMeta>
            </RecentItem>
          ))}
        </RecentList>
      </div>
    </Grid>
  );
};

export default SocialPostGenerator;
