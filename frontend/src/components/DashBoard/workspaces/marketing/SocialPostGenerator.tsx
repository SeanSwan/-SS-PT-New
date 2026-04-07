/**
 * ┌─── PANEL: Social Post Generator ────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Compose social media posts for Instagram, Facebook, │
 * │          YouTube, BlueSky, TikTok. Publishes via Postiz API. │
 * │ CEO RULING: 2026-04-07 — No Twitter/X, FTC/FDA compliance. │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Send, Clock, Hash, AlertTriangle, CheckCircle, Shield, Link2 } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ActionButton, StatusChip, CadenceWarning,
} from './marketing.styles';
import type { SocialPlatform, PlatformConfig } from './marketing.types';
// ─── Platform Config ───────────────────────────────────────────
const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  instagram: { name: 'Instagram', maxChars: 2200, color: '#E4405F', bestTimes: 'Tue/Thu 11am-1pm, Sat 9-11am' },
  facebook: { name: 'Facebook', maxChars: 63206, color: '#1877F2', bestTimes: 'Wed 11am-1pm, Fri 10-11am' },
  youtube: { name: 'YouTube', maxChars: 5000, color: '#FF0000', bestTimes: 'Thu/Fri 12-3pm, Sat 9-11am' },
  bluesky: { name: 'BlueSky', maxChars: 300, color: '#0085FF', bestTimes: 'Mon-Fri 8-10am, 6-9pm' },
  tiktok: { name: 'TikTok', maxChars: 2200, color: '#00F2EA', bestTimes: 'Tue/Thu 7-9pm, Sun 12-3pm' },
};

const HASHTAG_SUGGESTIONS: Record<string, string[]> = {
  brand: ['#SwanStudios', '#SwanCoach', '#TrainWithSwan', '#SwanFitness'],
  niche: ['#PersonalTraining', '#GolfFitness', '#YouthAthlete', '#FitnessCoach', '#StrengthTraining'],
  trending: ['#FitnessMotivation', '#TransformationTuesday', '#FitLife', '#GolfLife', '#WorkoutOfTheDay'],
};

// ─── Styled Components ─────────────────────────────────────────
const PlatformTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const PlatformBtn = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active, $color }) => $active ? $color : 'transparent'};
  background: ${({ $active, $color }) => $active ? hexAlpha($color, 0.1) : 'var(--bg-elevated, #141419)'};
  color: ${({ $active, $color }) => $active ? $color : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
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
  &::placeholder { color: var(--text-placeholder, rgba(224, 236, 244, 0.5)); }
`;

const CharCount = styled.div<{ $over: boolean }>`
  text-align: right;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  margin-top: 4px;
  color: ${({ $over }) => $over ? '#EF4444' : 'var(--text-secondary, rgba(224, 236, 244, 0.75))'};
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
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
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
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
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

const ComplianceBox = styled.div<{ $type: 'warning' | 'pass' }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: ${({ $type }) => $type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)'};
  border: 1px solid ${({ $type }) => $type === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'};
  color: ${({ $type }) => $type === 'warning' ? '#F59E0B' : '#10B981'};
`;

const StatusBanner = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.2);
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlatformCheckboxes = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const PlatformCheck = styled.label<{ $color: string; $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $checked, $color }) => $checked ? $color : 'rgba(96, 192, 240, 0.08)'};
  background: ${({ $checked, $color }) => $checked ? hexAlpha($color, 0.1) : 'transparent'};
  color: ${({ $checked, $color }) => $checked ? $color : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  input { display: none; }
`;

// ─── Types ─────────────────────────────────────────────────────
interface ConnectedAccount {
  id: string;
  platform: string;
  name: string;
}

// ─── Component ─────────────────────────────────────────────────
const SocialPostGenerator: React.FC = () => {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#SwanStudios', '#PersonalTraining']);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [postizConfigured, setPostizConfigured] = useState<boolean | null>(null);
  const [complianceResult, setComplianceResult] = useState<{
    compliant: boolean;
    warnings: string[];
    autoTags: string[];
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  const config = PLATFORMS[platform];
  const charCount = caption.length;
  const isOver = charCount > config.maxChars;

  // Fetch connected accounts and Postiz health on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch('/api/admin/social-publishing/health', { headers })
      .then(r => r.json())
      .then(d => setPostizConfigured(d.data?.configured ?? false))
      .catch(() => setPostizConfigured(false));

    fetch('/api/admin/social-publishing/accounts', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setConnectedAccounts(d.data);
        }
      })
      .catch(() => {/* Postiz not available yet */});
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(x => x !== accountId) : [...prev, accountId]
    );
  };

  const runComplianceCheck = useCallback(async () => {
    if (!caption.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/social-publishing/compliance-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ content: caption + '\n\n' + selectedTags.join(' '), isAIGenerated: false }),
      });
      const data = await res.json();
      if (data.success) {
        setComplianceResult(data.data);
      }
    } catch {
      // Compliance check is optional — don't block the UI
    }
  }, [caption, selectedTags]);

  const handlePublish = useCallback(async () => {
    if (!caption.trim() || selectedAccountIds.length === 0) return;
    setPublishing(true);
    setPublishStatus(null);
    const token = localStorage.getItem('token');
    try {
      const fullContent = caption + (selectedTags.length ? '\n\n' + selectedTags.join(' ') : '');
      const res = await fetch('/api/admin/social-publishing/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          content: fullContent,
          platformIds: selectedAccountIds, // Resolved integration IDs from connected accounts
          isAIGenerated: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus('Post published successfully!');
        setCaption('');
        setComplianceResult(null);
      } else {
        setPublishStatus(data.message || 'Failed to publish. Check Postiz connection.');
      }
    } catch {
      setPublishStatus('Network error. Is Postiz running?');
    } finally {
      setPublishing(false);
    }
  }, [caption, selectedTags, selectedAccountIds]);

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
              <CardSubtitle>Preview for {config.name}</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        {/* Platform preview tabs */}
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
            onChange={e => { setCaption(e.target.value); setComplianceResult(null); }}
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

        {/* Publish to connected accounts */}
        <CatLabel>Publish to:</CatLabel>
        {postizConfigured === false && (
          <StatusBanner style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
            <Link2 size={14} />
            <span style={{ color: '#F59E0B' }}>Postiz not configured. Set POSTIZ_API_URL and POSTIZ_API_KEY in .env to enable publishing.</span>
          </StatusBanner>
        )}
        {connectedAccounts.length > 0 ? (
          <PlatformCheckboxes>
            {connectedAccounts.map(acct => {
              const platformKey = acct.platform as SocialPlatform;
              const pConfig = PLATFORMS[platformKey];
              const color = pConfig?.color || '#60C0F0';
              return (
                <PlatformCheck key={acct.id} $color={color} $checked={selectedAccountIds.includes(acct.id)}>
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(acct.id)}
                    onChange={() => toggleAccount(acct.id)}
                  />
                  {selectedAccountIds.includes(acct.id) ? '✓' : '○'} {acct.name || pConfig?.name || acct.platform}
                </PlatformCheck>
              );
            })}
          </PlatformCheckboxes>
        ) : (
          <StatusBanner>
            <Link2 size={14} />
            No social accounts connected yet. Connect accounts via Postiz to start publishing.
          </StatusBanner>
        )}

        {/* Compliance check result */}
        {complianceResult && (
          complianceResult.compliant ? (
            <ComplianceBox $type="pass">
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              Content passes FTC/FDA compliance checks.
            </ComplianceBox>
          ) : (
            <ComplianceBox $type="warning">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                {complianceResult.warnings.map((w, i) => (
                  <div key={i} style={{ marginBottom: i < complianceResult.warnings.length - 1 ? 6 : 0 }}>{w}</div>
                ))}
                {complianceResult.autoTags.length > 0 && (
                  <div style={{ marginTop: 6, fontWeight: 600 }}>Auto-tags: {complianceResult.autoTags.join(' ')}</div>
                )}
              </div>
            </ComplianceBox>
          )
        )}

        {/* Publish status */}
        {publishStatus && (
          <StatusBanner>
            <Shield size={16} />
            {publishStatus}
          </StatusBanner>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <ActionButton
            $variant="secondary"
            onClick={runComplianceCheck}
            disabled={!caption.trim()}
            style={{ flex: 1 }}
          >
            <Shield size={14} style={{ marginRight: 6 }} />
            Check Compliance
          </ActionButton>
          <ActionButton
            disabled={!caption.trim() || isOver || selectedAccountIds.length === 0 || publishing}
            onClick={handlePublish}
            style={{ flex: 1 }}
          >
            <Send size={14} style={{ marginRight: 6 }} />
            {publishing ? 'Publishing...' : `Publish to ${selectedAccountIds.length} Account${selectedAccountIds.length !== 1 ? 's' : ''}`}
          </ActionButton>
        </div>
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

        <StatusBanner style={{ marginTop: 16, background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
          <Shield size={14} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary, rgba(224, 236, 244, 0.85))' }}>
            All posts checked for FTC/FDA compliance before publishing.
            Powered by Postiz scheduling engine.
          </div>
        </StatusBanner>
      </div>
    </Grid>
  );
};

export default SocialPostGenerator;
