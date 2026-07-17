/**
 * FILE: SupportReportRoom.styles.ts
 * PURPOSE: Calm Crystalline Swan C12 composition for issue capture and history.
 */
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';

export const Page = styled.main`
  min-height: 100vh;
  padding: 108px 24px 72px;
  color: var(--frost-white, #E0ECF4);
  background:
    radial-gradient(circle at 12% 10%, var(--support-purple-wash, rgba(139, 92, 246, 0.14)), transparent 34%),
    radial-gradient(circle at 88% 24%, var(--support-cyan-wash, rgba(96, 192, 240, 0.12)), transparent 36%),
    var(--bg-base, #030712);

  @media (max-width: 640px) { padding: 88px 16px 48px; }
`;

export const Shell = styled.div`
  width: min(100%, 1920px);
  margin: 0 auto;
`;

export const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--text-secondary, #B8C7D9);
  text-decoration: none;
  font: 600 15px 'Plus Jakarta Sans', sans-serif;
  border-radius: 12px;

  &:hover { color: var(--ice-wing, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const Hero = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(260px, 2fr);
  gap: 48px;
  align-items: end;
  margin: 32px 0 48px;

  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 24px; }
`;

export const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: var(--gilded-fern, #C6A84B);
  font: 700 12px 'Sora', sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 0;
  max-width: 15ch;
  color: var(--frost-white, #E0ECF4);
  font: 700 clamp(40px, 6vw, 76px)/0.98 'Plus Jakarta Sans', sans-serif;
  letter-spacing: -0.04em;

  @media (forced-colors: active) { color: CanvasText; }
`;

export const Lead = styled.p`
  margin: 20px 0 0;
  max-width: 68ch;
  color: var(--text-secondary, #B8C7D9);
  font: 400 18px/1.7 'Plus Jakarta Sans', sans-serif;
`;

export const TrustNote = styled.aside`
  padding: 24px;
  border: 1px solid var(--border-luxury, rgba(198, 168, 75, 0.35));
  border-radius: 20px;
  background: var(--surface-obsidian, linear-gradient(135deg, rgba(20, 20, 25, 0.9), rgba(26, 26, 36, 0.8)));
  box-shadow: 0 20px 60px var(--shadow-depth, rgba(0, 16, 40, 0.4));
`;

export const TrustTitle = styled.h2`
  margin: 0 0 8px;
  font: italic 600 24px 'Cormorant Garamond', serif;
  color: var(--frost-white, #E0ECF4);
`;

export const Muted = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D9);
  font: 400 15px/1.6 'Plus Jakarta Sans', sans-serif;
`;

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(320px, 3fr);
  gap: 32px;
  align-items: start;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

export const Panel = styled.section`
  padding: 32px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: 20px;
  background: var(--surface-sapphire, linear-gradient(135deg, rgba(0, 32, 96, 0.65), rgba(0, 48, 128, 0.55)));
  box-shadow: 0 20px 60px var(--shadow-depth, rgba(0, 16, 40, 0.4));
  backdrop-filter: blur(24px) saturate(140%);

  @media (max-width: 640px) { padding: 24px 16px; }
`;

export const PanelHeading = styled.h2`
  margin: 0;
  color: var(--frost-white, #E0ECF4);
  font: 700 28px/1.2 'Plus Jakarta Sans', sans-serif;
`;

export const PanelIntro = styled.p`
  margin: 8px 0 24px;
  color: var(--text-secondary, #B8C7D9);
  font: 400 15px/1.6 'Plus Jakarta Sans', sans-serif;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(180px, 1fr);
  gap: 16px;

  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

export const Field = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
`;

export const Label = styled.label`
  color: var(--frost-white, #E0ECF4);
  font: 650 15px 'Plus Jakarta Sans', sans-serif;
`;

const fieldChrome = css`
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.25));
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  background: var(--graphite, #1A1A24);
  font: 400 16px/1.5 'Plus Jakarta Sans', sans-serif;
  box-sizing: border-box;
  transition: border-color 200ms ease, opacity 200ms ease;

  &::placeholder { color: var(--text-muted, #91A2B6); }
  &:focus-visible { outline: 2px solid var(--ice-wing, #60C0F0); outline-offset: 2px; }
  &[aria-invalid='true'] { border-color: var(--danger, #E5484D); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

export const Input = styled.input`${fieldChrome}`;
export const Select = styled.select`${fieldChrome}`;
export const TextArea = styled.textarea`
  ${fieldChrome}
  min-height: 124px;
  resize: vertical;
`;

export const HelpText = styled.p`
  margin: 0;
  color: var(--text-muted, #91A2B6);
  font: 400 13px/1.5 'Plus Jakarta Sans', sans-serif;
`;

export const ErrorText = styled.p`
  margin: 0;
  color: var(--danger-text, #F0938A);
  font: 600 13px/1.5 'Plus Jakarta Sans', sans-serif;
`;

export const SubmitRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;

  @media (max-width: 640px) { align-items: stretch; flex-direction: column; }
`;

export const SubmitButton = styled.button`
  min-width: 180px;
  min-height: 48px;
  padding: 12px 24px;
  border: 1px solid var(--button-border, rgba(96, 192, 240, 0.35));
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  background: var(--midnight-sapphire, #002060);
  box-shadow: 0 0 28px var(--button-purple-glow, rgba(139, 92, 246, 0.24));
  cursor: pointer;
  font: 700 16px 'Plus Jakarta Sans', sans-serif;
  transition: transform 120ms ease, opacity 200ms ease;

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }

  @media (max-width: 640px) { width: 100%; }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } }
`;

export const InlineAlert = styled.div`
  margin: 0 0 20px;
  padding: 14px 16px;
  border: 1px solid var(--danger-border, rgba(229, 72, 77, 0.55));
  border-radius: 12px;
  color: var(--danger-text, #F0938A);
  background: var(--danger-wash, rgba(229, 72, 77, 0.1));
  font: 600 14px/1.5 'Plus Jakarta Sans', sans-serif;
`;

export const Receipt = styled.div`
  margin-bottom: 24px;
  padding: 24px;
  border: 1px solid var(--success-border, rgba(96, 192, 240, 0.4));
  border-radius: 20px;
  background: var(--success-wash, rgba(96, 192, 240, 0.1));
`;

export const ReceiptCode = styled.code`
  display: inline-block;
  margin: 12px 0;
  color: var(--ice-wing, #60C0F0);
  font: 700 17px 'Fira Code', monospace;
  overflow-wrap: anywhere;
`;

export const HistoryList = styled.ol`
  display: grid;
  gap: 12px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
`;

export const HistoryItem = styled.li`
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 12px;
  background: var(--carbon, #141419);
`;

export const HistoryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--text-muted, #91A2B6);
  font: 500 12px/1.4 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const RetryButton = styled.button`
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.35));
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  background: transparent;
  cursor: pointer;
  font: 700 14px 'Plus Jakarta Sans', sans-serif;
  &:focus-visible { outline: 2px solid var(--ice-wing, #60C0F0); outline-offset: 2px; }
`;
