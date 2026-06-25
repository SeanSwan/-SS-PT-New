import { css } from 'styled-components';

export const coachCommandThreadHeaderStyles = css`
  .active-thread-header {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--coach-sapphire, #002060) 34%, transparent),
      color-mix(in srgb, var(--coach-surface-strong, #003080) 82%, transparent)
    );
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 24%, var(--coach-line, #273449));
    border-radius: 16px;
    box-shadow: 0 14px 36px color-mix(in srgb, var(--coach-bg, #030712) 52%, transparent);
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.95fr);
    padding: 14px;
  }

  .active-thread-header.is-empty {
    grid-template-columns: 1fr;
    opacity: 0.82;
  }

  .active-thread-main {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .active-thread-eyebrow {
    color: var(--coach-cyan, #60c0f0);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .active-thread-main h3 {
    color: var(--coach-text, #e0ecf4);
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 20px;
    font-weight: 820;
    line-height: 1.12;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .active-thread-main p {
    color: var(--coach-muted, #b8c7d9);
    font-size: 13px;
    line-height: 1.45;
    margin: 0;
  }

  .active-thread-meta {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
  }

  .active-thread-meta div {
    background: color-mix(in srgb, var(--coach-soft, #141419) 82%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-line, #273449) 80%, transparent);
    border-radius: 12px;
    display: grid;
    gap: 3px;
    min-width: 0;
    padding: 9px 10px;
  }

  .active-thread-meta dt {
    color: var(--coach-muted, #b8c7d9);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .active-thread-meta dd {
    color: var(--coach-text, #e0ecf4);
    font-size: 13px;
    font-weight: 760;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    .active-thread-header,
    .active-thread-meta {
      grid-template-columns: 1fr;
    }

    .active-thread-main h3 {
      font-size: 18px;
    }
  }
`;
