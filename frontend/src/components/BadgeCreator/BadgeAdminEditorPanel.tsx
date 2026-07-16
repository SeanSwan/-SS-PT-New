import React, { useEffect, useRef, useState } from 'react';
import { Check, Edit3, Share2, Upload, X } from 'lucide-react';
import apiService from '../../services/api.service';
import { ACCEPTED_BADGE_IMAGE_TYPES, BADGE_GALLERY_ASSIGN_ERROR, BADGE_GALLERY_EDIT_ERROR, BADGE_GALLERY_SHARE_ERROR, TAB_TARGETS, buildBadgeActionPath, buildBadgePath, normalizeAssignmentType, titleCaseTab, type AssignmentType, type BadgeAdminEditorPanelProps } from './BadgeAdminEditorPanel.constants';
import {
  AssignBtn,
  AssignInput,
  AssignPanel,
  AssignRow,
  AssignSelect,
  AssignTag,
  AssignTitle,
  EditField,
  EditFileInput,
  EditFormGrid,
  EditLabel,
  EditSectionTitle,
  EditTextArea,
} from './BadgeAdminEditorPanel.styles';
const BadgeAdminEditorPanel: React.FC<BadgeAdminEditorPanelProps> = ({ badge, onChanged, onClose, onStatus }) => {
  const [name, setName] = useState(badge.name);
  const [description, setDescription] = useState(badge.description);
  const [rarity, setRarity] = useState(badge.rarity || 'common');
  const [category, setCategory] = useState(badge.category || 'general');
  const [difficulty, setDifficulty] = useState(badge.difficulty || 'beginner');
  const [xpReward, setXpReward] = useState(String(badge.xpReward || 50));
  const [isActive, setIsActive] = useState(badge.isActive !== false);
  const [assignType, setAssignType] = useState<AssignmentType>(normalizeAssignmentType(badge.assignedTo));
  const [assignTarget, setAssignTarget] = useState(badge.assignedTarget || '');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [sharing, setSharing] = useState(false);
  const savingRef = useRef(false);
  const assigningRef = useRef(false);
  const sharingRef = useRef(false);
  useEffect(() => {
    setName(badge.name);
    setDescription(badge.description);
    setRarity(badge.rarity || 'common');
    setCategory(badge.category || 'general');
    setDifficulty(badge.difficulty || 'beginner');
    setXpReward(String(badge.xpReward || 50));
    setIsActive(badge.isActive !== false);
    setAssignType(normalizeAssignmentType(badge.assignedTo));
    setAssignTarget(badge.assignedTarget || '');
    setReplacementFile(null);
  }, [badge]);
  const xpValue = Number(xpReward);
  const hasValidXpReward = Number.isFinite(xpValue) && xpValue > 0;
  const canSave = Boolean(name.trim() && description.trim() && hasValidXpReward && (!assignTarget.trim() ? true : assignType));
  const canAssign = Boolean(assignTarget.trim() && !assigning);
  const handleReplacementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setReplacementFile(null);
      return;
    }
    if (!ACCEPTED_BADGE_IMAGE_TYPES.has(nextFile.type)) {
      setReplacementFile(null);
      onStatus({ type: 'error', text: 'Use a PNG, JPG, or WebP badge image.' });
      return;
    }
    setReplacementFile(nextFile);
  };
  const handleSaveDetails = async () => {
    if (savingRef.current || !canSave) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const assignment = assignTarget.trim()
        ? { assignedTo: assignType, assignedTarget: assignTarget.trim() }
        : null;
      const response = await apiService.patch<{ success: boolean }>(
        buildBadgePath(badge.id),
        {
          name: name.trim(),
          description: description.trim(),
          rarity,
          category,
          difficulty,
          abilityPoints: xpReward.trim(),
          assignment,
          isActive,
        },
        { validateStatus: status => status < 500 }
      );
      if (!response.data.success) throw new Error('BADGE_UPDATE_FAILED');
      if (replacementFile) {
        const formData = new FormData();
        formData.set('image', replacementFile);
        const imageResponse = await apiService.post<{ success: boolean }>(
          `${buildBadgePath(badge.id)}/image`,
          formData,
          { validateStatus: status => status < 500 }
        );
        if (!imageResponse.data.success) throw new Error('BADGE_IMAGE_UPDATE_FAILED');
      }
      onStatus({ type: 'success', text: `Badge "${name.trim()}" saved.` });
      await onChanged();
      onClose();
    } catch {
      onStatus({ type: 'error', text: BADGE_GALLERY_EDIT_ERROR });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const handleAssign = async () => {
    if (!assignTarget.trim() || assigningRef.current) return;
    assigningRef.current = true;
    setAssigning(true);
    try {
      const res = await apiService.patch<{ success: boolean }>(
        buildBadgeActionPath(badge.id, 'assign'),
        { assignedTo: assignType, assignedTarget: assignTarget.trim() },
        { validateStatus: status => status < 500 }
      );
      if (res.data.success) {
        onStatus({ type: 'success', text: `"${badge.name}" assignment saved.` });
        onClose();
        await onChanged();
      } else {
        onStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
      }
    } catch {
      onStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
    } finally {
      assigningRef.current = false;
      setAssigning(false);
    }
  };
  const handleUnassign = async () => {
    if (assigningRef.current) return;
    assigningRef.current = true;
    setAssigning(true);
    try {
      const res = await apiService.patch<{ success: boolean }>(
        buildBadgeActionPath(badge.id, 'unassign'),
        undefined,
        { validateStatus: status => status < 500 }
      );
      if (res.data.success) {
        onStatus({ type: 'success', text: `"${badge.name}" assignment cleared.` });
        onClose();
        await onChanged();
      } else {
        onStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
      }
    } catch {
      onStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
    } finally {
      assigningRef.current = false;
      setAssigning(false);
    }
  };
  const handleShareToggle = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    try {
      const endpoint = badge.isShared
        ? '/api/admin/badge-creator/marketplace/unshare'
        : '/api/admin/badge-creator/marketplace/share';
      const res = await apiService.post<{ success: boolean }>(
        endpoint,
        { badgeId: badge.id },
        { validateStatus: status => status < 500 }
      );
      if (res.data.success) {
        onStatus({
          type: 'success',
          text: badge.isShared ? `"${badge.name}" removed from marketplace.` : `"${badge.name}" shared to marketplace.`,
        });
        await onChanged();
      } else {
        onStatus({ type: 'error', text: BADGE_GALLERY_SHARE_ERROR });
      }
    } catch {
      onStatus({ type: 'error', text: BADGE_GALLERY_SHARE_ERROR });
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };
  return (
    <AssignPanel>
      <AssignTitle>
        <Edit3 size={16} aria-hidden="true" />
        Edit &quot;{badge.name}&quot;
        {badge.assignedTo && (
          <AssignTag>
            Currently: {badge.assignedTo} to {badge.assignedTarget}
          </AssignTag>
        )}
      </AssignTitle>
      <EditSectionTitle>Badge details</EditSectionTitle>
      <EditFormGrid>
        <EditField>
          <EditLabel htmlFor="badge-edit-name">Badge name</EditLabel>
          <AssignInput id="badge-edit-name" value={name} onChange={event => setName(event.target.value)} />
        </EditField>
        <EditField>
          <EditLabel htmlFor="badge-edit-rarity">Rarity</EditLabel>
          <AssignSelect id="badge-edit-rarity" value={rarity} onChange={event => setRarity(event.target.value)}>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </AssignSelect>
        </EditField>
        <EditField>
          <EditLabel htmlFor="badge-edit-category">Category</EditLabel>
          <AssignSelect id="badge-edit-category" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="general">General</option>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="skill">Skill</option>
            <option value="flexibility">Flexibility</option>
            <option value="endurance">Endurance</option>
          </AssignSelect>
        </EditField>
        <EditField>
          <EditLabel htmlFor="badge-edit-difficulty">Difficulty</EditLabel>
          <AssignSelect id="badge-edit-difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </AssignSelect>
        </EditField>
        <EditField>
          <EditLabel htmlFor="badge-edit-xp">XP reward</EditLabel>
          <AssignInput id="badge-edit-xp" value={xpReward} onChange={event => setXpReward(event.target.value)} inputMode="numeric" />
        </EditField>
        <EditField>
          <EditLabel htmlFor="badge-edit-active">Status</EditLabel>
          <AssignSelect id="badge-edit-active" value={isActive ? 'active' : 'inactive'} onChange={event => setIsActive(event.target.value === 'active')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </AssignSelect>
        </EditField>
        <EditField $wide>
          <EditLabel htmlFor="badge-edit-description">Description</EditLabel>
          <EditTextArea id="badge-edit-description" value={description} onChange={event => setDescription(event.target.value)} />
        </EditField>
        <EditField $wide>
          <EditLabel htmlFor="badge-edit-image">Replacement image</EditLabel>
          <EditFileInput id="badge-edit-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleReplacementChange} />
        </EditField>
      </EditFormGrid>
      <EditSectionTitle>Gamification connection</EditSectionTitle>
      <AssignRow>
        <AssignSelect id="badge-edit-assignment" aria-label="Connect to" value={assignType} onChange={event => { setAssignType(event.target.value as AssignmentType); setAssignTarget(''); }}>
          <option value="achievement">Assign to Achievement</option>
          <option value="tab">Assign to Tab Icon</option>
          <option value="milestone">Assign to Milestone</option>
        </AssignSelect>
        {assignType === 'tab' ? (
          <AssignSelect id="badge-edit-assignment-target" aria-label="Assignment target" value={assignTarget} onChange={event => setAssignTarget(event.target.value)}>
            <option value="">Select tab...</option>
            {TAB_TARGETS.map(t => <option key={t} value={t}>{titleCaseTab(t)}</option>)}
          </AssignSelect>
        ) : (
          <AssignInput
            id="badge-edit-assignment-target"
            aria-label="Assignment target"
            type="text"
            placeholder={assignType === 'achievement' ? 'Achievement name...' : 'Milestone ID...'}
            value={assignTarget}
            onChange={event => setAssignTarget(event.target.value)}
          />
        )}
      </AssignRow>
      <AssignRow>
        <AssignBtn type="button" onClick={() => void handleSaveDetails()} disabled={!canSave || saving} aria-busy={saving}>
          <Upload size={14} aria-hidden="true" />
          {saving ? 'Saving...' : 'Save details'}
        </AssignBtn>
        <AssignBtn type="button" onClick={() => void handleAssign()} disabled={!canAssign} aria-busy={assigning}>
          <Check size={14} aria-hidden="true" />
          {assigning ? 'Assigning...' : 'Assign'}
        </AssignBtn>
        {badge.assignedTo && (
          <AssignBtn type="button" $variant="danger" onClick={() => void handleUnassign()} disabled={assigning} aria-busy={assigning}>
            <X size={14} aria-hidden="true" /> Unassign
          </AssignBtn>
        )}
        <AssignBtn type="button" onClick={() => void handleShareToggle()} disabled={sharing} aria-busy={sharing}>
          <Share2 size={14} aria-hidden="true" />
          {sharing ? 'Updating...' : badge.isShared ? 'Unshare from Marketplace' : 'Share to Marketplace'}
        </AssignBtn>
      </AssignRow>
    </AssignPanel>
  );
};
export default BadgeAdminEditorPanel;
