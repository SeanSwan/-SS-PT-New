import styled, { keyframes } from 'styled-components';
const scannerPulse = keyframes`
  0% { transform: translateY(-72px); opacity: 0.35; }
  50% { opacity: 0.95; }
  100% { transform: translateY(72px); opacity: 0.35; }
`;
export const ScannerContainer = styled.section`
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
export const ScannerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;
export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--royal-depth, #003080) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  flex: 0 0 auto;
`;
export const HeaderCopy = styled.div`
  min-width: 0;
`;
export const Title = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.05rem;
  line-height: 1.25;
  font-weight: 700;
`;
export const Subtitle = styled.p`
  margin: 4px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.86rem;
  line-height: 1.45;
`;
export const CameraFrame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  min-height: 250px;
  overflow: hidden;
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent), transparent 42%),
    linear-gradient(135deg, var(--royal-depth, #003080), var(--bg-base, #0A0A0F));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent),
    0 16px 36px color-mix(in srgb, var(--bg-base, #0A0A0F) 65%, transparent);
`;
export const CameraVideo = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 160ms ease;
  &[data-active='true'] {
    opacity: 1;
  }
`;
export const CameraScrim = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bg-base, #0A0A0F) 36%, transparent)),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 18%, transparent);
  pointer-events: none;
`;
export const Reticle = styled.div`
  position: absolute;
  inset: 18% 14%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 64%, transparent);
  border-radius: 8px;
  box-shadow: 0 0 0 999px color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent);
  pointer-events: none;
`;
export const ReticleCorner = styled.span<{ $position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }>`
  position: absolute;
  width: 26px;
  height: 26px;
  border-style: solid;
  border-color: var(--accent-primary, #60C0F0);
  border-width: 0;
  ${({ $position }) => $position === 'top-left' && 'top: -2px; left: -2px; border-top-width: 3px; border-left-width: 3px; border-top-left-radius: 8px;'}
  ${({ $position }) => $position === 'top-right' && 'top: -2px; right: -2px; border-top-width: 3px; border-right-width: 3px; border-top-right-radius: 8px;'}
  ${({ $position }) => $position === 'bottom-left' && 'bottom: -2px; left: -2px; border-bottom-width: 3px; border-left-width: 3px; border-bottom-left-radius: 8px;'}
  ${({ $position }) => $position === 'bottom-right' && 'bottom: -2px; right: -2px; border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 8px;'}
`;
export const ScannerLine = styled.div`
  position: absolute;
  left: 12%;
  right: 12%;
  top: 50%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--accent-primary, #60C0F0),
    var(--accent-secondary, #8B5CF6),
    transparent
  );
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 70%, transparent);
  animation: ${scannerPulse} 1.85s ease-in-out infinite alternate;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const FrameCopy = styled.div`
  position: absolute;
  inset: auto 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 2;
`;
export const EngineBadge = styled.div`
  align-self: flex-start;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  font-size: 0.78rem;
  font-weight: 700;
`;
export const FrameHint = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-size: 0.82rem;
  line-height: 1.35;
`;
export const Controls = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
`;
export const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;
export const CameraButton = styled.button<{ $active: boolean }>`
  min-height: 48px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--royal-depth, #003080))'
    : 'linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--midnight-sapphire, #002060))'};
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  font-weight: 800;
  cursor: pointer;
  &:hover:not(:disabled) {
    box-shadow: 0 0 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  }
  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
    box-shadow: none;
  }
`;
export const ManualForm = styled.form`
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 36%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;
export const ManualLabel = styled.label`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.86rem;
  font-weight: 800;
`;
export const ManualRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;
export const ManualInput = styled.input`
  min-width: 0;
  min-height: 48px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 74%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0 12px;
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  letter-spacing: 0;
  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  }
  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.48));
  }
`;
export const ManualSubmit = styled.button`
  min-height: 48px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  padding: 0 14px;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--accent-primary, #60C0F0));
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
`;
export const Notice = styled.div<{ $tone?: 'error' | 'info' }>`
  min-height: 44px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $tone }) => $tone === 'error'
    ? 'color-mix(in srgb, var(--error, #EF4444) 18%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  border: 1px solid ${({ $tone }) => $tone === 'error'
    ? 'color-mix(in srgb, var(--error, #EF4444) 34%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)'};
  font-size: 0.84rem;
  line-height: 1.35;
  svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }
`;
