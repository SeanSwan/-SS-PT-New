import styled from 'styled-components';

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-width: 0;

  @media (max-width: 1080px) {
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  min-width: 0;

  h2 {
    margin: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 18px;
    line-height: 1.2;
    letter-spacing: 0;

    @media (max-width: 720px) {
      font-size: 16px;
    }
  }

  p {
    margin: 4px 0 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  text-transform: uppercase;
`;

export const ActionRow = styled.div`
  display: grid;
  gap: 8px;
  width: min(100%, 720px);
  min-width: 0;

  > * {
    min-width: 0;
  }

  @media (max-width: 1080px) {
    width: 100%;
  }
`;

export const FirstMovePanel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.64fr);
  gap: 10px;
  align-items: stretch;
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 11%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 9%, transparent)
    ),
    color-mix(in srgb, var(--bg-base, #030712) 36%, transparent);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FirstMoveCopy = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
  font-family: 'Sora', sans-serif;

  span {
    color: var(--accent-gold, #C6A84B);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  strong {
    color: var(--text-primary, #E0ECF4);
    font-size: 15px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
    font-size: 12px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
`;

export const FirstMoveActions = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  min-width: 0;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const SecondaryActionGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 8px;
  min-width: 0;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 26%, transparent);

  > * {
    min-width: 0;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;
