import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, ImagePlus, Upload } from 'lucide-react';
import apiService from '../../services/api.service';
import { safeBadgeImageUrl } from './BadgeCreatorImageSafety';
import {
  FieldBlock,
  FieldGrid,
  FileDropLabel,
  HiddenFileInput,
  PreviewFrame,
  PreviewPlaceholder,
  UploadButton,
  UploadCopy,
  UploadInput,
  UploadLabel,
  UploadPanelCard,
  UploadSelect,
  UploadShell,
  UploadStatus,
  UploadTextArea,
  UploadTitle,
} from './BadgeUploadPanel.styles';

export const BADGE_UPLOAD_ERROR = 'Badge upload could not be saved. Check the image and try again.';
export const BADGE_UPLOAD_NETWORK_ERROR = 'Badge upload service is temporarily unavailable. Please try again.';

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const TAB_TARGETS = [
  'workout', 'nutrition', 'schedule', 'social', 'bootcamp', 'analytics',
  'profile', 'rewards', 'body-map', 'sprint-planner', 'video-call',
  'my-home', 'virtual-olympics', 'badge-creator',
];

type AssignmentType = 'none' | 'achievement' | 'milestone' | 'tab';

const titleCaseTab = (tab: string) =>
  tab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const isAcceptedImage = (file: File | null) => Boolean(file && ACCEPTED_TYPES.has(file.type));

const BadgeUploadPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState('common');
  const [abilityPoints, setAbilityPoints] = useState('50');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('none');
  const [assignmentTarget, setAssignmentTarget] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const uploadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setStatus(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!isAcceptedImage(nextFile)) {
      setFile(null);
      setStatus({ type: 'error', text: 'Use a PNG, JPG, or WebP badge image.' });
      return;
    }
    setFile(nextFile);
  }, []);

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canUpload = Boolean(
    name.trim()
    && file
    && !uploading
    && (assignmentType === 'none' || assignmentTarget.trim())
  );

  const handleUpload = useCallback(async () => {
    const trimmedName = name.trim();
    if (uploadingRef.current || !trimmedName || !file) return;
    uploadingRef.current = true;
    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.set('name', trimmedName);
    formData.set('description', description.trim());
    formData.set('rarity', rarity);
    formData.set('abilityPoints', abilityPoints.trim() || '50');
    formData.set('image', file);
    if (assignmentType !== 'none') {
      formData.set('assignedTo', assignmentType);
      formData.set('assignedTarget', assignmentTarget.trim());
    }

    try {
      const res = await apiService.post<{ success: boolean; data?: { imageUrl?: string; name?: string } }>(
        '/api/admin/badge-creator/upload',
        formData,
        { validateStatus: status => status < 500 }
      );
      const safeImage = safeBadgeImageUrl(res.data.data?.imageUrl);
      if (res.data.success && safeImage) {
        setStatus({ type: 'success', text: `Badge "${res.data.data?.name || trimmedName}" uploaded.` });
        setName('');
        setDescription('');
        setAssignmentType('none');
        setAssignmentTarget('');
        setFile(null);
      } else {
        setStatus({ type: 'error', text: BADGE_UPLOAD_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_UPLOAD_NETWORK_ERROR });
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }, [abilityPoints, assignmentTarget, assignmentType, description, file, name, rarity]);

  return (
    <UploadShell>
      <UploadPanelCard>
        <UploadTitle><Upload size={20} aria-hidden="true" /> Upload badge art</UploadTitle>
        <UploadCopy>
          Add finished badge art from your own files, then bind it to an achievement, milestone, or dashboard tab.
        </UploadCopy>

        <FieldGrid>
          <FieldBlock $wide>
            <UploadLabel htmlFor="badge-upload-file">Badge image</UploadLabel>
            <FileDropLabel
              type="button"
              aria-label="Choose badge art file"
              onClick={handleChooseFile}
            >
              <ImagePlus size={28} aria-hidden="true" />
              <span>{file ? file.name : 'Choose a PNG, JPG, or WebP file'}</span>
            </FileDropLabel>
            <HiddenFileInput
              ref={fileInputRef}
              id="badge-upload-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              tabIndex={-1}
              onChange={handleFileChange}
            />
          </FieldBlock>

          <FieldBlock>
            <UploadLabel htmlFor="badge-upload-name">Badge name</UploadLabel>
            <UploadInput id="badge-upload-name" value={name} onChange={event => setName(event.target.value)} />
          </FieldBlock>

          <FieldBlock>
            <UploadLabel htmlFor="badge-upload-rarity">Rarity</UploadLabel>
            <UploadSelect id="badge-upload-rarity" value={rarity} onChange={event => setRarity(event.target.value)}>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </UploadSelect>
          </FieldBlock>

          <FieldBlock $wide>
            <UploadLabel htmlFor="badge-upload-description">Description</UploadLabel>
            <UploadTextArea id="badge-upload-description" value={description} onChange={event => setDescription(event.target.value)} />
          </FieldBlock>

          <FieldBlock>
            <UploadLabel htmlFor="badge-upload-points">XP reward</UploadLabel>
            <UploadInput id="badge-upload-points" value={abilityPoints} onChange={event => setAbilityPoints(event.target.value)} inputMode="numeric" />
          </FieldBlock>

          <FieldBlock>
            <UploadLabel htmlFor="badge-upload-assignment">Connect to</UploadLabel>
            <UploadSelect
              id="badge-upload-assignment"
              value={assignmentType}
              onChange={event => { setAssignmentType(event.target.value as AssignmentType); setAssignmentTarget(''); }}
            >
              <option value="none">No assignment yet</option>
              <option value="achievement">Achievement</option>
              <option value="milestone">Milestone</option>
              <option value="tab">Dashboard tab</option>
            </UploadSelect>
          </FieldBlock>

          {assignmentType !== 'none' && (
            <FieldBlock $wide>
              <UploadLabel htmlFor="badge-upload-target">Assignment target</UploadLabel>
              {assignmentType === 'tab' ? (
                <UploadSelect id="badge-upload-target" value={assignmentTarget} onChange={event => setAssignmentTarget(event.target.value)}>
                  <option value="">Select tab...</option>
                  {TAB_TARGETS.map(tab => <option key={tab} value={tab}>{titleCaseTab(tab)}</option>)}
                </UploadSelect>
              ) : (
                <UploadInput
                  id="badge-upload-target"
                  value={assignmentTarget}
                  onChange={event => setAssignmentTarget(event.target.value)}
                  placeholder={assignmentType === 'achievement' ? 'Achievement id or name' : 'Milestone id'}
                />
              )}
            </FieldBlock>
          )}
        </FieldGrid>

        <UploadButton type="button" onClick={() => void handleUpload()} disabled={!canUpload} aria-busy={uploading}>
          <Upload size={16} aria-hidden="true" /> {uploading ? 'Uploading...' : 'Upload Badge'}
        </UploadButton>

        {status && (
          <UploadStatus $type={status.type} role={status.type === 'error' ? 'alert' : 'status'} aria-live={status.type === 'error' ? 'assertive' : 'polite'}>
            {status.type === 'success' ? <CheckCircle size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
            {status.text}
          </UploadStatus>
        )}
      </UploadPanelCard>

      <UploadPanelCard aria-label="Uploaded badge preview">
        <UploadLabel as="div">Preview</UploadLabel>
        <PreviewFrame>
          {previewUrl ? <img src={previewUrl} alt="Selected badge preview" /> : (
            <PreviewPlaceholder>
              <ImagePlus size={34} aria-hidden="true" />
              <span>Your uploaded badge preview appears here.</span>
            </PreviewPlaceholder>
          )}
        </PreviewFrame>
      </UploadPanelCard>
    </UploadShell>
  );
};

export default BadgeUploadPanel;