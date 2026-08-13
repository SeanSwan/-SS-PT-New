/**
 * PANEL: Social Post Generator
 * PARENT: MarketingWorkspace
 * PURPOSE: Compose and approve social posts before native publishing.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, RefreshCw, Send, Shield } from 'lucide-react';
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
import type { ConnectedAccount } from './SocialPostGenerator.types';
import SocialPostAccounts from './SocialPostAccounts';
import SocialPostComplianceResult from './SocialPostComplianceResult';
import SocialPostPreview from './SocialPostPreview';
import apiService from '../../../../services/api.service';
import { useSocialPublish } from './useSocialPublish';

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
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);

  // The draft is discarded HERE and nowhere else, and the hook calls this only
  // for an outcome that actually published. That single choke point is what
  // stops a failed publish from destroying the user's text again.
  const handlePublished = useCallback(() => setCaption(''), []);
  const {
    publishing, retrying, publishStatus, failed, complianceResult,
    setComplianceResult, retryTarget, runComplianceCheck, publish, retry,
  } = useSocialPublish({ onPublished: handlePublished });

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

  const handleCheckCompliance = useCallback(
    () => runComplianceCheck(caption, selectedTags),
    [runComplianceCheck, caption, selectedTags],
  );

  const fullContent = caption + (selectedTags.length ? `\n\n${selectedTags.join(' ')}` : '');

  // A retry re-sends the ORIGINAL job's text, so once the composer has been
  // edited the button must stop implying it will post what is on screen.
  const retryIsStale = Boolean(retryTarget && retryTarget.content !== fullContent);

  const handlePublish = useCallback(() => {
    if (!caption.trim() || selectedAccountIds.length === 0) return undefined;

    const scheduled = scheduleMode && scheduleDate ? new Date(scheduleDate) : null;
    return publish({
      content: fullContent,
      platformIds: selectedAccountIds,
      ...(scheduled ? { scheduledAt: scheduled.toISOString(), scheduleLabel: scheduled.toLocaleString() } : {}),
    });
  }, [publish, caption, fullContent, selectedAccountIds, scheduleMode, scheduleDate]);

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
          <StatusBanner $tone={failed ? 'warning' : 'default'} role="status" aria-live="polite">
            <Shield size={16} />
            {publishStatus}
          </StatusBanner>
        )}

        {retryTarget && (
          <ActionRow>
            <ComposerActionButton onClick={retry} disabled={retrying}>
              <RefreshCw size={14} />
              {retrying
                ? 'Retrying...'
                : `Retry ${retryTarget.failedCount} failed platform${retryTarget.failedCount !== 1 ? 's' : ''}`
                  + (retryIsStale ? ' with the original text' : '')}
            </ComposerActionButton>
          </ActionRow>
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
          <ComposerActionButton $variant="secondary" onClick={handleCheckCompliance} disabled={!caption.trim()}>
            <Shield size={14} />
            Check Compliance
          </ComposerActionButton>
          <ComposerActionButton
            disabled={!caption.trim() || isOver || selectedAccountIds.length === 0 || publishing || retrying || (scheduleMode && !scheduleDate)}
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
