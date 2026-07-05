/**
 * createSpecial.styles.ts — styled-components for the admin Create Special form.
 * Crystalline Swan client/data-card standard: sapphire deep-gradient surface, chrome
 * edge, Frost White text, Gilded Fern "special/gold" accent, Ice Wing data, Dual-Button
 * Glow (blue bg -> purple glow), 44px+ controls, low-motion (respects reduced-motion).
 * Tokens use var(--token, #fallback) per CLAUDE.md rule 6.
 */
import styled from 'styled-components';

export const Page = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(16px, 3vw, 32px);
  color: var(--text-primary, #e0ecf4);
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
`;

export const Header = styled.header`
  margin-bottom: 24px;
`;

export const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.6rem, 2.4vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary, #e0ecf4);
`;

export const Subtitle = styled.p`
  margin: 6px 0 0;
  font-size: 0.98rem;
  color: var(--text-muted, #9fb4c8);
  max-width: 60ch;
`;

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 24px;
  align-items: start;
  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

const surface = `
  background: linear-gradient(160deg, var(--surface-2, #003080) 0%, var(--surface-1, #002060) 60%, var(--card-dark, #141419) 100%);
  border: 1px solid var(--chrome-edge, rgba(96, 192, 240, 0.28));
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
`;

export const FormCard = styled.section`
  ${surface}
  padding: clamp(18px, 2.4vw, 28px);
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const PreviewCol = styled.aside`
  position: sticky;
  top: 16px;
  @media (max-width: 1023px) {
    position: static;
  }
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-secondary, #c4d6e6);
`;

export const Hint = styled.span`
  font-size: 0.78rem;
  color: var(--text-muted, #9fb4c8);
`;

const controlBase = `
  min-height: 44px;
  width: 100%;
  padding: 10px 14px;
  font-size: 0.98rem;
  color: var(--text-primary, #e0ecf4);
  background: var(--input-bg, rgba(10, 10, 15, 0.55));
  border: 1px solid var(--input-border, rgba(96, 192, 240, 0.28));
  border-radius: 10px;
  transition: border-color 140ms ease, box-shadow 140ms ease;
  &:focus-visible {
    outline: none;
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.35);
  }
`;

export const Input = styled.input`${controlBase}`;
export const Select = styled.select`
  ${controlBase}
  appearance: none;
  cursor: pointer;
`;
export const TextArea = styled.textarea`
  ${controlBase}
  min-height: 72px;
  resize: vertical;
`;

export const PresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const PresetButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  color: ${({ $active }) => ($active ? '#0a0a0f' : 'var(--text-primary, #e0ecf4)')};
  background: ${({ $active }) => ($active ? 'var(--gold, #c6a84b)' : 'rgba(10, 10, 15, 0.4)')};
  border: 1px solid ${({ $active }) => ($active ? 'var(--gold, #c6a84b)' : 'var(--input-border, rgba(96, 192, 240, 0.28))')};
  transition: background 140ms ease, color 140ms ease, transform 120ms ease;
  &:hover { transform: translateY(-1px); }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } }
`;

export const SegRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const SegButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  flex: 1 1 auto;
  min-width: 120px;
  padding: 8px 12px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  text-align: left;
  color: var(--text-primary, #e0ecf4);
  background: ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.16)' : 'rgba(10, 10, 15, 0.4)')};
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60c0f0)' : 'var(--input-border, rgba(96, 192, 240, 0.22))')};
  span { display: block; font-weight: 400; font-size: 0.74rem; color: var(--text-muted, #9fb4c8); margin-top: 2px; }
`;

export const OverrideBox = styled.div`
  padding: 14px;
  border-radius: 12px;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid var(--gold, #c6a84b);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary, #e0ecf4);
  input { width: 20px; height: 20px; accent-color: var(--gold, #c6a84b); cursor: pointer; }
`;

export const SubmitButton = styled.button`
  min-height: 48px;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 12px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--surface-2, #003080), var(--primary, #002060));
  border: 1px solid var(--accent-primary, #60c0f0);
  box-shadow: 0 0 0 rgba(139, 92, 246, 0);
  transition: box-shadow 160ms ease, transform 120ms ease, opacity 140ms ease;
  &:hover:not(:disabled) { box-shadow: 0 0 22px rgba(139, 92, 246, 0.55); transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover:not(:disabled) { transform: none; } }
`;

export const GateBadge = styled.span<{ $tier?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ $tier }) =>
    $tier === 'clear' ? '#0a0a0f'
    : $tier === 'below_absolute_min' || $tier === 'invalid' ? '#ffffff'
    : '#0a0a0f'};
  background: ${({ $tier }) =>
    $tier === 'clear' ? 'var(--accent-primary, #60c0f0)'
    : $tier === 'below_warning' ? 'var(--gold, #c6a84b)'
    : $tier === 'below_floor' ? 'var(--gold, #c6a84b)'
    : '#e5484d'};
`;

export const Banner = styled.div<{ $kind?: 'error' | 'success' }>`
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  color: var(--text-primary, #e0ecf4);
  background: ${({ $kind }) => ($kind === 'success' ? 'rgba(96,192,240,0.14)' : 'rgba(229,72,77,0.14)')};
  border: 1px solid ${({ $kind }) => ($kind === 'success' ? 'var(--accent-primary, #60c0f0)' : '#e5484d')};
`;

/* ── Live client-facing preview card ─────────────────────────────────────── */
export const PreviewCard = styled.div`
  ${surface}
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const PreviewTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0a0a0f;
  background: var(--gold, #c6a84b);
`;

export const PreviewSessions = styled.div`
  font-size: clamp(2rem, 3.4vw, 2.8rem);
  font-weight: 800;
  line-height: 1.05;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
`;

export const PreviewBreak = styled.div`
  font-size: 0.95rem;
  color: var(--text-secondary, #c4d6e6);
  strong { color: var(--gold, #c6a84b); }
`;

export const PreviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(96, 192, 240, 0.18);
  font-size: 0.92rem;
  color: var(--text-secondary, #c4d6e6);
  b { color: var(--text-primary, #e0ecf4); font-size: 1.05rem; }
`;
