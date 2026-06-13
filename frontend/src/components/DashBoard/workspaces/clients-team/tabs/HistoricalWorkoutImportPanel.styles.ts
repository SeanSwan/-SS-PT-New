/**
 * HistoricalWorkoutImportPanel styles.
 *
 * Tokenized Crystalline Swan controls for the client history import lane.
 */
import styled from 'styled-components';

export const ImportPanelShell = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--bg-card, #141419) 90%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 96%, transparent)),
    var(--bg-card, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: clamp(18px, 2.4vw, 24px);
`;

export const ImportHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  h3 {
    margin: 0;
    font: 800 1.05rem/1.25 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  }

  p {
    max-width: 68ch;
    margin: 6px 0 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
    font: 500 0.86rem/1.55 var(--font-ui, 'Sora', sans-serif);
  }
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricTile = styled.div`
  min-height: 76px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  padding: 12px;

  span {
    display: block;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
    font: 700 0.68rem/1.2 var(--font-ui, 'Sora', sans-serif);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: var(--accent-primary, #60C0F0);
    font: 900 1.24rem/1 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  }
`;

export const ImportFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label<{ $wide?: boolean }>`
  display: grid;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  gap: 7px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font: 800 0.74rem/1.2 var(--font-ui, 'Sora', sans-serif);

  input,
  select,
  textarea {
    min-height: 44px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
    color: var(--text-primary, #E0ECF4);
    font: 600 0.88rem/1.45 var(--font-ui, 'Sora', sans-serif);
    padding: 10px 12px;

    &:focus-visible {
      outline: 2px solid var(--accent-primary, #60C0F0);
      outline-offset: 2px;
    }
  }

  textarea {
    min-height: 116px;
    resize: vertical;
  }
`;

export const MissingDateGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const DatePill = styled.span`
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent);
  font: 800 0.72rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 10px;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${({ $primary }) =>
    $primary
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'};
  border-radius: 8px;
  background: ${({ $primary }) =>
    $primary
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-base, #0A0A0F))'
      : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 900 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 16px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
`;

export const StatusText = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
  font: 600 0.82rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;
