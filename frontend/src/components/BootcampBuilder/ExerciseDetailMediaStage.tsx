import { ExternalLink, Image as ImageIcon, PlayCircle, ShieldCheck } from 'lucide-react';
import styled from 'styled-components';
import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import { getDemoMediaPillLabel, getExerciseDemoMedia } from './bootcampExerciseMedia';

interface ExerciseDetailMediaStageProps {
  exercise: BootcampExercise;
}

const Stage = styled.div`
  display: grid;
  gap: 10px;
  margin: 0 0 12px;
`;

const MediaFrame = styled.div`
  position: relative;
  min-height: 172px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent), transparent 48%),
    var(--bg-base, #0A0A0F);
`;

const MediaVideo = styled.video`
  width: 100%;
  height: 172px;
  object-fit: cover;
  display: block;
`;

const MediaImage = styled.img`
  width: 100%;
  height: 172px;
  object-fit: cover;
  display: block;
`;

const MediaEmpty = styled.div`
  min-height: 172px;
  display: grid;
  place-items: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent));
`;

const MediaBadge = styled.span`
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
`;

const EvidenceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const EvidenceTile = styled.div`
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
`;

const EvidenceLabel = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  text-transform: uppercase;
`;

const EvidenceValue = styled.div`
  margin-top: 3px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const Reason = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 9px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;
`;

const FullDemoLink = styled.a`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const humanize = (value: string | null | undefined) => (
  value ? value.replace(/_/g, ' ') : 'none'
);

const getProgrammingLabel = (exercise: BootcampExercise): string | null => (
  exercise.programmingIntent?.prescriptionLabel
    || exercise.programmingIntent?.scheme
    || null
);

const ExerciseDetailMediaStage: React.FC<ExerciseDetailMediaStageProps> = ({ exercise }) => {
  const media = getExerciseDemoMedia(exercise);
  const label = getDemoMediaPillLabel(media);
  const equipmentEvidence = exercise.equipmentEvidence?.length
    ? exercise.equipmentEvidence.join(', ')
    : exercise.equipmentRequired || 'Bodyweight';
  const programmingLabel = getProgrammingLabel(exercise);

  return (
    <Stage>
      <MediaFrame>
        {media.canPreviewVideo && media.previewUrl ? (
          <MediaVideo
            src={media.previewUrl}
            poster={media.poster ?? undefined}
            aria-label={`${exercise.exerciseName} media preview`}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : media.poster ? (
          <MediaImage src={media.poster} alt="" />
        ) : (
          <MediaEmpty><ImageIcon size={28} aria-hidden="true" /></MediaEmpty>
        )}
        <MediaBadge><PlayCircle size={13} />{label}</MediaBadge>
      </MediaFrame>

      <EvidenceGrid>
        <EvidenceTile>
          <EvidenceLabel>Equipment</EvidenceLabel>
          <EvidenceValue aria-label="Equipment evidence">{equipmentEvidence}</EvidenceValue>
        </EvidenceTile>
        <EvidenceTile>
          <EvidenceLabel>Media</EvidenceLabel>
          <EvidenceValue aria-label="Media status">{humanize(exercise.mediaStatus ?? label.toLowerCase())}</EvidenceValue>
        </EvidenceTile>
        {programmingLabel && (
          <EvidenceTile>
            <EvidenceLabel>Rep Scheme</EvidenceLabel>
            <EvidenceValue aria-label="Rep scheme">{programmingLabel}</EvidenceValue>
          </EvidenceTile>
        )}
      </EvidenceGrid>

      {exercise.selectionReason && (
        <Reason>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>{exercise.selectionReason}</span>
        </Reason>
      )}

      {media.videoUrl && (
        <FullDemoLink href={media.videoUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> Open full demo
        </FullDemoLink>
      )}
    </Stage>
  );
};

export default ExerciseDetailMediaStage;
