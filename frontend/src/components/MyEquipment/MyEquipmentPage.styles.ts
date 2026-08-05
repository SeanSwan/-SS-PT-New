/**
 * MyEquipmentPage.styles — Crystalline Swan styling for the My Equipment surface
 * ==============================================================================
 * Obsidian-first self-serve surface (blueprint §4.3 / §10a #7). All colors use
 * var(--token, #fallback) with Crystalline palette fallbacks. Dual-Button Glow:
 * blue backgrounds glow Wing Purple. 44px minimum touch targets throughout;
 * reduced-motion media queries disable ambient animation.
 */
import styled, { css, keyframes } from 'styled-components';

const heroPulse = keyframes`
  0%, 100% { box-shadow: 0 0 18px rgba(139, 92, 246, 0.35); }
  50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.55); }
`;

const stageShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(240%); }
`;

export const PageWrapper = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(120% 70% at 50% -10%, rgba(0, 48, 128, 0.35), transparent 60%),
    var(--bg-deep, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 24px 16px 48px;

  @media (min-width: 768px) { padding: 32px 24px 64px; }
`;

export const Container = styled.div`
  max-width: 760px;
  margin: 0 auto;
`;

export const Header = styled.header`
  margin-bottom: 20px;
`;

export const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
`;

export const LocationBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
`;

export const LocationChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, var(--primary, #002060), var(--surface-elevated, #003080))'
    : 'rgba(20, 20, 25, 0.85)')};
  border: 1px solid ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'rgba(96, 192, 240, 0.22)')};
  ${({ $active }) => $active && css`box-shadow: 0 0 14px rgba(139, 92, 246, 0.35);`}
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

export const AddPlaceButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px dashed rgba(96, 192, 240, 0.4);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover:not(:disabled) { background: rgba(96, 192, 240, 0.08); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

export const CapHint = styled.span`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

export const HeroCard = styled.section`
  position: relative;
  padding: 24px 20px;
  margin-bottom: 20px;
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background:
    linear-gradient(135deg, rgba(0, 32, 96, 0.85), rgba(0, 48, 128, 0.55)),
    var(--card-dark, #141419);
  overflow: hidden;
`;

export const HeroCopy = styled.p`
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
`;

export const HeroActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

export const HeroScanButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 12px 26px;
  border: 1px solid rgba(96, 192, 240, 0.35);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary, #002060), var(--surface-elevated, #003080));
  animation: ${heroPulse} 3.2s ease-in-out infinite;
  transition: transform 0.15s ease;

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; animation: none; }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 3px; }

  @media (prefers-reduced-motion: reduce) { animation: none; transition: none; }
`;

export const HeroGalleryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) { background: rgba(96, 192, 240, 0.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

export const HeroHint = styled.p`
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
`;

export const ScanStageBox = styled.div`
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: rgba(0, 32, 96, 0.45);
`;

export const ScanStageText = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

export const ScanStageTrack = styled.div`
  position: relative;
  height: 2px;
  margin-top: 12px;
  border-radius: 1px;
  overflow: hidden;
  background: rgba(96, 192, 240, 0.15);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, var(--accent-primary, #60C0F0), transparent);
    animation: ${stageShimmer} 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; width: 100%; opacity: 0.5; }
  }
`;

export const ErrorNotice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 1px solid var(--luxury-accent, #C6A84B);
  background: rgba(198, 168, 75, 0.1);
  color: var(--text-primary, #E0ECF4);
  font-size: 14px;
`;

export const ErrorText = styled.span`
  flex: 1;
  min-width: 180px;
`;

export const ErrorActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PrimaryButton = styled.button`
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--primary, #002060), var(--surface-elevated, #003080));
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);

  &:hover:not(:disabled) { box-shadow: 0 0 18px rgba(139, 92, 246, 0.5); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

export const GhostButton = styled.button`
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 10px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) { background: rgba(96, 192, 240, 0.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

export const HiddenFileInput = styled.input`
  display: none;
`;
