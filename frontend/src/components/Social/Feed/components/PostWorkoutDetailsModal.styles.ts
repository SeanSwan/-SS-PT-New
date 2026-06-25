import styled from 'styled-components';

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, var(--bg-base, #030712) 78%, transparent);
  backdrop-filter: blur(14px);
`;

export const ModalFrame = styled.section`
  width: min(720px, 100%);
  max-height: min(760px, 92vh);
  overflow: auto;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--surface-elevated, #003080) 54%, var(--bg-base, #030712)) 0%,
      color-mix(in srgb, var(--surface-dark, #141419) 88%, var(--accent-tertiary, #4070C0)) 100%);
  box-shadow:
    0 26px 70px color-mix(in srgb, var(--bg-base, #030712) 68%, transparent),
    0 0 34px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  color: var(--text-primary, #E0ECF4);
`;

export const ModalHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const HeaderCopy = styled.div`
  display: grid;
  gap: 6px;
`;

export const Eyebrow = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const ModalTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: clamp(1.35rem, 2.4vw, 2rem);
  line-height: 1.12;
  letter-spacing: 0;
`;

export const ModalSubtitle = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D3);
  font-size: 0.98rem;
  line-height: 1.5;
`;

export const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 34%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent);
    outline-offset: 3px;
  }
`;

export const ModalBody = styled.div`
  display: grid;
  gap: 18px;
  padding: 20px 24px 24px;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const MetricCard = styled.div`
  min-height: 82px;
  display: grid;
  gap: 6px;
  align-content: center;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--surface-dark, #141419) 72%, transparent);
`;

export const MetricLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #AAB8C4);
  font-size: 0.74rem;
  font-weight: 700;
`;

export const MetricValue = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-size: 1.1rem;
  line-height: 1.15;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  letter-spacing: 0;
`;

export const ExerciseList = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const ExerciseItem = styled.li`
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface-dark, #141419) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
`;

export const ExerciseName = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
`;

export const DetailChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const DetailChip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 700;
`;

export const NotesBlock = styled.p`
  margin: 0;
  padding: 14px;
  border-left: 3px solid var(--accent-gold, #C6A84B);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  color: var(--text-secondary, #C2D0DA);
  line-height: 1.55;
`;

export const EmptyState = styled.div`
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, transparent);
`;

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

export const ActionLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  color: var(--bg-base, #030712);
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B));
  font-weight: 800;
  text-decoration: none;

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent);
    outline-offset: 3px;
  }
`;