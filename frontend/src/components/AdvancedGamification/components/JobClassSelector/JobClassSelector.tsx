/**
 * Mounted admin RPG job-class selector.
 *
 * Canonical path:
 * UniversalDashboardLayout /gamification -> RPGFeaturesPanel -> JobClassSelector.
 * API call:
 * PUT /api/gamification/users/:userId/job-class through shared apiService.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Swords } from 'lucide-react';
import apiService from '../../../../services/api.service';
import { getGamificationUserPath } from '../../utils/gamificationPath';
import { JOB_CLASSES } from './JobClassSelector.data';
import {
  BonusTag,
  ClassCard,
  ClassDesc,
  ClassGrid,
  ClassIcon,
  ClassName,
  ClassSubtitle,
  Container,
  CurrentBadge,
  DescriptionCard,
  FocusText,
  Header,
  SectionTitle,
  SelectBtn,
} from './JobClassSelector.styles';
import type { JobClass, JobClassSelectorProps } from './JobClassSelector.types';

const JobClassSelector: React.FC<JobClassSelectorProps> = ({
  userId,
  currentJobClass = null,
  onClassChange,
  className,
}) => {
  const [selectedId, setSelectedId] = useState<JobClass | null>(currentJobClass);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    setSelectedId(currentJobClass);
  }, [currentJobClass]);

  const selectedClass = JOB_CLASSES.find((jobClass) => jobClass.id === selectedId);
  const currentClass = JOB_CLASSES.find((jobClass) => jobClass.id === currentJobClass);
  const isCurrentSelection = selectedId === currentJobClass;

  const handleSelect = useCallback(async () => {
    if (!selectedId || isCurrentSelection || !userId || savingRef.current) return;

    const jobClassPath = getGamificationUserPath(userId, '/job-class');
    if (!jobClassPath) {
      setSaveError('Could not update job class. Try again.');
      return;
    }

    savingRef.current = true;
    setSaveError('');
    setSaving(true);
    try {
      const res = await apiService.put(`/api/gamification${jobClassPath}`, {
        jobClass: selectedId,
      }, {
        validateStatus: (status) => status < 500,
      });
      const payload = res.data as { success?: unknown } | null | undefined;
      if (res.status >= 200 && res.status < 300 && payload?.success !== false) {
        onClassChange?.(selectedId);
      } else {
        setSaveError('Could not update job class. Try again.');
      }
    } catch {
      setSaveError('Could not update job class. Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [selectedId, isCurrentSelection, userId, onClassChange]);

  return (
    <Container className={className}>
      <Header>
        <SectionTitle><Swords size={16} aria-hidden /> Job Class</SectionTitle>
        {currentClass && (
          <CurrentBadge $color={currentClass.color}>
            {currentClass.name}
          </CurrentBadge>
        )}
      </Header>

      <ClassGrid>
        {JOB_CLASSES.map((jobClass) => {
          const Icon = jobClass.icon;
          const selected = selectedId === jobClass.id;
          return (
            <ClassCard
              key={jobClass.id}
              type="button"
              $color={jobClass.color}
              $selected={selected}
              $active={currentJobClass === jobClass.id}
              onClick={() => {
                setSelectedId(jobClass.id);
                setSaveError('');
              }}
              aria-pressed={selected}
              aria-label={`Preview ${jobClass.name} job class`}
            >
              <ClassIcon $color={jobClass.color}>
                <Icon size={20} aria-hidden />
              </ClassIcon>
              <span className="class-name">{jobClass.name}</span>
            </ClassCard>
          );
        })}
      </ClassGrid>

      {selectedClass && (
        <DescriptionCard $color={selectedClass.color} aria-live="polite">
          <ClassName $color={selectedClass.color}>{selectedClass.name}</ClassName>
          <ClassSubtitle>{selectedClass.title}</ClassSubtitle>
          <ClassDesc>{selectedClass.description}</ClassDesc>
          <BonusTag $color={selectedClass.color}>
            <Sparkles size={14} aria-hidden />
            {selectedClass.bonusText}
          </BonusTag>
          <FocusText>Focus: {selectedClass.focus}</FocusText>

          {!isCurrentSelection && (
            <SelectBtn
              type="button"
              $color={selectedClass.color}
              onClick={handleSelect}
              disabled={saving}
            >
              {saving ? 'Saving...' : `Select ${selectedClass.name}`}
            </SelectBtn>
          )}

          {saveError && <FocusText role="alert">{saveError}</FocusText>}
        </DescriptionCard>
      )}
    </Container>
  );
};

JobClassSelector.displayName = 'JobClassSelector';

export default JobClassSelector;
