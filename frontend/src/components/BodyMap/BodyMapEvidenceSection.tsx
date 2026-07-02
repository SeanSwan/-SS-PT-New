import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import {
  createPainEntryService,
  type BodyMapEvidence,
  type BodyMapEvidenceCaptureContext,
} from '../../services/painEntryService';

const Section = styled.div`
  margin-top: 18px;
  padding: 14px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.2));
  border-radius: 14px;
  background: var(--bg-surface, rgba(10, 10, 15, 0.42));
`;

const Title = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const Hint = styled.p`
  color: var(--text-muted, rgba(224, 236, 244, 0.58));
  font-size: 12px;
  line-height: 1.45;
  margin: 6px 0 12px;
`;

const Field = styled.label`
  display: block;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 11px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 10px 0 5px;
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.22));
  background: var(--bg-base, rgba(0, 0, 0, 0.32));
  color: var(--text-primary, #E0ECF4);
  padding: 10px 12px;
  box-sizing: border-box;
`;

const Select = styled.select`
  width: 100%;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.22));
  background: var(--bg-base, rgba(0, 0, 0, 0.32));
  color: var(--text-primary, #E0ECF4);
  padding: 10px 12px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 72px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.22));
  background: var(--bg-base, rgba(0, 0, 0, 0.32));
  color: var(--text-primary, #E0ECF4);
  padding: 10px 12px;
  resize: vertical;
  box-sizing: border-box;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  min-height: 44px;
  min-width: 92px;
  border-radius: 10px;
  border: 1px solid ${({ $variant }) => $variant === 'danger' ? 'rgba(255, 85, 85, 0.45)' : 'var(--border-soft, rgba(139, 92, 246, 0.28))'};
  background: ${({ $variant }) => $variant === 'primary'
    ? 'linear-gradient(135deg, var(--accent-primary, #8B5CF6), var(--accent-secondary, #60C0F0))'
    : $variant === 'danger'
      ? 'rgba(255, 85, 85, 0.12)'
      : 'rgba(255, 255, 255, 0.06)'};
  color: ${({ $variant }) => $variant === 'primary' ? 'var(--bg-base, #002060)' : 'var(--text-primary, #E0ECF4)'};
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Card = styled.article`
  margin-top: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.18));
  background: rgba(0, 0, 0, 0.22);
  overflow: hidden;
`;

const CardBody = styled.div`
  padding: 12px;
`;

const Preview = styled.div`
  background: var(--bg-base, #0A0A0F);
  min-height: 120px;
  display: grid;
  place-items: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  img, video { width: 100%; max-height: 220px; object-fit: contain; display: block; }
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.22));
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const SmallText = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font-size: 12px;
  line-height: 1.45;
  margin-top: 8px;
`;

interface BodyMapEvidenceSectionProps {
  userId?: number;
  entryId?: number | null;
  isClientMode?: boolean;
}

const readableStatus = (status: string) => status.replace('_', ' ');

const asTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const anyItem = item as any;
      return anyItem.observation || anyItem.hypothesis || anyItem.recommendation || anyItem.flag || JSON.stringify(item);
    }
    return String(item);
  }).filter(Boolean).slice(0, 5);
};

const BodyMapEvidenceSection: React.FC<BodyMapEvidenceSectionProps> = ({ userId, entryId, isClientMode }) => {
  const { authAxios } = useAuth() as any;
  const service = useMemo(() => (authAxios ? createPainEntryService(authAxios) : null), [authAxios]);
  const [items, setItems] = useState<BodyMapEvidence[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [movement, setMovement] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [moment, setMoment] = useState('');
  const [caption, setCaption] = useState('');
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(service && userId && entryId);

  const loadEvidence = useCallback(async () => {
    if (!service || !userId || !entryId) return;
    try {
      setError(null);
      const result = await service.getEvidence(userId, entryId);
      setItems(result.evidence || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load evidence');
    }
  }, [service, userId, entryId]);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  const upload = async () => {
    if (!service || !userId || !entryId || !file) return;
    const captureContext: BodyMapEvidenceCaptureContext = { movement, cameraAngle, moment, clientCaption: caption };
    setBusy('upload');
    try {
      await service.uploadEvidence(userId, entryId, file, captureContext);
      setFile(null); setMovement(''); setCameraAngle(''); setMoment(''); setCaption('');
      await loadEvidence();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const refreshAction = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    try { await action(); await loadEvidence(); }
    catch (err: any) { setError(err?.response?.data?.message || 'Action failed'); }
    finally { setBusy(null); }
  };

  if (!entryId) {
    return <Section><Title>Photo / Movement Evidence</Title><Hint>Save this entry first, then attach photos or video from the movement where the issue shows up.</Hint></Section>;
  }

  return (
    <Section>
      <Title>Photo / Movement Evidence</Title>
      <Hint>Attach the exact position or movement moment. Swan Coach analysis stays review-gated before it becomes workout guidance.</Hint>
      {error && <SmallText role="alert">{error}</SmallText>}
      {canLoad && (
        <>
          <Field htmlFor="body-map-evidence-file">Media</Field>
          <Input id="body-map-evidence-file" type="file" accept="image/*,video/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Field htmlFor="body-map-evidence-movement">Movement / position</Field>
          <Input id="body-map-evidence-movement" value={movement} onChange={(e) => setMovement(e.target.value)} placeholder="e.g., squat descent, stairs, overhead reach" />
          <Field htmlFor="body-map-evidence-angle">Camera angle</Field>
          <Select id="body-map-evidence-angle" value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)}>
            <option value="">Select angle</option><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option><option value="oblique">Oblique</option><option value="close_up">Close-up</option>
          </Select>
          <Field htmlFor="body-map-evidence-moment">Timing</Field>
          <Select id="body-map-evidence-moment" value={moment} onChange={(e) => setMoment(e.target.value)}>
            <option value="">Select timing</option><option value="before">Before movement</option><option value="during">During movement</option><option value="after">After movement</option>
          </Select>
          <Field htmlFor="body-map-evidence-caption">Notes</Field>
          <TextArea id="body-map-evidence-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What were you doing and what did it feel like?" />
          <ButtonRow><Button $variant="primary" type="button" onClick={upload} disabled={!file || busy === 'upload'}>{busy === 'upload' ? 'Uploading...' : 'Upload Evidence'}</Button></ButtonRow>
        </>
      )}
      {items.map((item) => {
        const draft = reviewDrafts[item.id] ?? String(item.aiAnalysis?.swanCoachNotesDraft || '');
        const observations = asTextList(item.aiAnalysis?.visualObservations);
        const contributors = asTextList(item.aiAnalysis?.possibleContributors);
        return (
          <Card key={item.id}>
            <Preview>{item.mediaUrl ? (item.mediaType === 'image' ? <img src={item.mediaUrl} alt="Body map evidence" /> : <video src={item.mediaUrl} controls />) : 'Stored securely'}</Preview>
            <CardBody>
              <Status>{readableStatus(item.analysisStatus)}</Status>
              <SmallText>{item.captureContext?.movement || 'Movement not specified'}{item.captureContext?.cameraAngle ? ` · ${item.captureContext.cameraAngle}` : ''}</SmallText>
              {!isClientMode && item.aiAnalysis && <SmallText>{[...observations, ...contributors].map((text) => <div key={text}>• {text}</div>)}</SmallText>}
              {item.analysisSummary && <SmallText>{item.analysisSummary}</SmallText>}
              {!isClientMode && item.analysisStatus === 'needs_review' && (
                <>
                  <Field htmlFor={`review-${item.id}`}>Swan Coach notes after approval</Field>
                  <TextArea id={`review-${item.id}`} value={draft} onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                </>
              )}
              <ButtonRow>
                {!isClientMode && ['pending', 'failed'].includes(item.analysisStatus) && item.mediaType === 'image' && <Button type="button" onClick={() => refreshAction(`analyze-${item.id}`, () => service!.analyzeEvidence(userId!, entryId!, item.id))} disabled={busy === `analyze-${item.id}`}>Analyze</Button>}
                {!isClientMode && item.analysisStatus === 'needs_review' && <Button $variant="primary" type="button" onClick={() => refreshAction(`approve-${item.id}`, () => service!.reviewEvidence(userId!, entryId!, item.id, { decision: 'approved', swanCoachNotes: draft }))}>Approve</Button>}
                {!isClientMode && item.analysisStatus === 'needs_review' && <Button type="button" onClick={() => refreshAction(`reject-${item.id}`, () => service!.reviewEvidence(userId!, entryId!, item.id, { decision: 'rejected', internalNotes: 'Rejected from Body Map review UI' }))}>Reject</Button>}
                <Button $variant="danger" type="button" onClick={() => refreshAction(`remove-${item.id}`, () => service!.removeEvidence(userId!, entryId!, item.id))}>Remove</Button>
              </ButtonRow>
            </CardBody>
          </Card>
        );
      })}
    </Section>
  );
};

export default BodyMapEvidenceSection;
