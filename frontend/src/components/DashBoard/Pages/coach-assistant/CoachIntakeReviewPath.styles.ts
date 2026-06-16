import styled from 'styled-components';

export const ReviewPath = styled.section`
  display: grid;
  gap: 8px;
  margin: 10px 0;
  min-width: 0;
`;

export const ReviewPathHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;

  strong {
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    line-height: 1.25;
  }

  span {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  @media (max-width: 620px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const ReviewPathGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const ReviewStep = styled.div`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent),
      color-mix(in srgb, var(--bg-base, #030712) 64%, transparent)
    ),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
`;

export const StepIndex = styled.span`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 900;
`;

export const StepCopy = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  p {
    margin: 3px 0 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 11px;
    line-height: 1.42;
    overflow-wrap: anywhere;
  }
`;
