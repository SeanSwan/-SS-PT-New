/**
 * PANEL: Social Post Generator
 * PARENT: MarketingWorkspace
 * PURPOSE: Compose and approve social posts before native publishing.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, Send, Shield } from 'lucide-react';
import { hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard,
  CardHeader,
  HeaderLeft,
  IconWrap,
  CardTitle,
  CardSubtitle,
} from './marketing.styles';
import type { PlatformConfig, SocialPlatform } from './marketing.types';
import { HASHTAG_SUGGESTIONS, PLATFORMS } from './SocialPostGenerator.config';
import {
  ActionRow,
  BestTimeCard,
  CatLabel,
  CharCount,
  Composer,
  ComposerActionButton,
  Grid,
  HashtagCategory,
  HashtagChip,
  HashtagSection,
  NativeCheckbox,
  PlatformBtn,
  PlatformTabs,
  ScheduleInput,
  ScheduleLabel,
  ScheduleRow,
  StatusBanner,
  TextArea,
} from './SocialPostGenerator.styles';
import type { ComplianceResult, ConnectedAccount } from './SocialPostGenerator.types';
import SocialPostAccounts from './SocialPostAccounts';
import SocialPostComplianceResult from './SocialPostComplianceResult';
import SocialPostPreview from './SocialPostPreview';
import apiService from '../../../../services/api.service';
import { describeFailure, describeThrown } from './SocialPostGenerator.outcome';

const getMinimumScheduleDateTime = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const SocialPostGenerator: React.FC = () => {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#SwanStudios', '#PersonalTraining']);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [nativeConfigured, setNativeConfigured] = useState<boolean | null>(null);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);

  const config = PLATFORMS[platform];
  const charCount = caption.length;
  const isOver = charCount > config.maxChars;

  useEffect(() => {
    let active = true;

    const loadSocialPublishingStatus = async () => {
      try {
        const healthResponse = await apiService.get('/api/admin/social-publishing/health');
        const healthData = healthResponse.data;
        const configured = healthData.data?.configured === true && healthData.data?.mode === 'native';
        if (!active) return;
        setNativeConfigured(configured);
        if (!configured) return;

        const accountsResponse = await apiService.get('/api/admin/social-publishing/accounts');
        const accountsData = accountsResponse.data;
        if (active && accountsData.success && Array.isArray(accountsData.data)) {
          setConnectedAccounts(accountsData.data);
        }
      } catch {
        if (active) setNativeConfigured(false);
      }
    };

    loadSocialPublishingStatus();

    return () => {
      active = false;
    };
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]));
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(item => item !== accountId) : [...prev, accountId],
    );
  };

  const runComplianceCheck = useCallback(async () => {
    if (!caption.trim()) return;

    try {
      const response = await apiService.post('/api/admin/social-publishing/compliance-check', {
        content: `${caption}\n\n${selectedTags.join(' ')}`,
        isAIGenerated: false,
      });
      const data = response.data;
      if (data.success) setComplianceResult(data.data);
    } catch {
      // Compliance check is optional and must not block manual review.
    }
  }, [caption, selectedTags]);

  const handlePublish = useCallback(async () => {
    if (!caption.trim() || selectedAccountIds.length === 0) return;

    setPublishing(true);
    setPublishStatus(null);
    try {
      const fullContent = caption + (selectedTags.length ? `\n\n${selectedTags.join(' ')}` : '');
      const response = await apiService.post('/api/admin/social-publishing/publish', {
        content: fullContent,
        platformIds: selectedAccountIds,
        isAIGenerated: false,
        ...(scheduleMode && scheduleDate && { scheduledAt: new Date(scheduleDate).toISOString() }),
      });
      const data = response.data;
      // Read `status`, not `success`. The route used to hardcode success:true, so
      // a publish where every platform failed reported success — and the branch
      // below cleared the composer, destroying the draft for a post that never
      // went out. The draft is only discarded on an outcome that actually
      // published; anything else keeps the text so it can be retried or copied.
      if (data.status === 'published' || data.status === 'scheduled') {
        setPublishStatus(
          data.status === 'scheduled'
            ? `Post scheduled for ${new Date(scheduleDate).toLocaleString()}!`
            : 'Post published successfully!',
        );
        setCaption('');
        setComplianceResult(null);
      } else {
        setPublishStatus(describeFailure(data));
      }
    } catch (err) {
      // A non-2xx rejects here, so this must distinguish a real transport
      // failure from a server response that carries a reason. Reporting a 422
      // compliance refusal as "Network error" was the same class of lie this
      // whole change exists to remove.
      setPublishStatus(describeThrown(err));
    } finally {
      setPublishing(false);
    }
  }, [caption, selectedTags, selectedAccountIds, scheduleMode, scheduleDate]);

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

        <PlatformTabs>
          {(Object.entries(PLATFORMS) as [SocialPlatform, PlatformConfig][]).map(([id, item]) => (
            <PlatformBtn key={id} $active={platform === id} $color={item.color} onClick={() => setPlatform(id)}>
              {item.name}
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
            onChange={event => {
              setCaption(event.target.value);
              setComplianceResult(null);
            }}
            placeholder={`Write your ${config.name} post...`}
          />
          <CharCount $over={isOver}>
            {charCount} / {config.maxChars.toLocaleString()}
          </CharCount>
        </Composer>

        <HashtagSection>
          {Object.entries(HASHTAG_SUGGESTIONS).map(([category, tags]) => (
            <HashtagCategory key={category}>
              <CatLabel>{category}:</CatLabel>
              {tags.map(tag => (
                <HashtagChip key={tag} $selected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </HashtagChip>
              ))}
            </HashtagCategory>
          ))}
        </HashtagSection>

        <SocialPostAccounts
          nativeConfigured={nativeConfigured}
          connectedAccounts={connectedAccounts}
          selectedAccountIds={selectedAccountIds}
          onToggleAccount={toggleAccount}
        />

        <SocialPostComplianceResult result={complianceResult} />

        {publishStatus && (
          <StatusBanner>
            <Shield size={16} />
            {publishStatus}
          </StatusBanner>
        )}

        <ScheduleRow>
          <ScheduleLabel $active={scheduleMode}>
            <NativeCheckbox
              type="checkbox"
              checked={scheduleMode}
              onChange={event => setScheduleMode(event.target.checked)}
            />
            <Calendar size={14} /> Schedule for later
          </ScheduleLabel>
          {scheduleMode && (
            <ScheduleInput
              type="datetime-local"
              value={scheduleDate}
              onChange={event => setScheduleDate(event.target.value)}
              min={getMinimumScheduleDateTime()}
            />
          )}
        </ScheduleRow>

        <ActionRow>
          <ComposerActionButton $variant="secondary" onClick={runComplianceCheck} disabled={!caption.trim()}>
            <Shield size={14} />
            Check Compliance
          </ComposerActionButton>
          <ComposerActionButton
            disabled={!caption.trim() || isOver || selectedAccountIds.length === 0 || publishing || (scheduleMode && !scheduleDate)}
            onClick={handlePublish}
          >
            {scheduleMode ? <Calendar size={14} /> : <Send size={14} />}
            {publishing
              ? 'Publishing...'
              : scheduleMode
                ? 'Schedule Post'
                : `Publish to ${selectedAccountIds.length} Account${selectedAccountIds.length !== 1 ? 's' : ''}`}
          </ComposerActionButton>
        </ActionRow>
      </MarketingCard>

      <SocialPostPreview config={config} caption={caption} selectedTags={selectedTags} />
    </Grid>
  );
};

export default SocialPostGenerator;
