import styled from 'styled-components';

export const StudioShell = styled.main`
  display: grid;
  gap: 24px;
  padding: clamp(16px, 2.5vw, 32px);
  color: var(--text-primary, #E0ECF4);
`;

export const StudioHeader = styled.header`
  display: grid;
  gap: 8px;
  max-width: 880px;
`;

export const Eyebrow = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 700 0.75rem/1.4 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 0;
  font: 700 clamp(1.8rem, 4vw, 2.8rem)/1.1 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const Description = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D9);
  line-height: 1.65;
`;

export const SurfaceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 10px;
`;

export const SurfaceButton = styled.button<{ $active: boolean }>`
  min-height: 52px;
  padding: 10px 14px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(224, 236, 244, 0.18))'};
  border-radius: 10px;
  background: ${({ $active }) =>
    $active ? 'var(--surface-active, rgba(96, 192, 240, 0.12))' : 'var(--surface-card, #141419)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 650 0.88rem/1.3 var(--font-ui, 'Sora', sans-serif);
  text-align: left;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    outline: none;
  }
`;

export const PreviewPanel = styled.section`
  display: grid;
  gap: 12px;
  min-width: 0;
`;

export const PreviewToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const PreviewIdentity = styled.div`
  display: grid;
  gap: 3px;
`;

export const PreviewTitle = styled.h2`
  margin: 0;
  font: 700 1.1rem/1.3 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const PreviewMeta = styled.span`
  color: var(--text-secondary, #B8C7D9);
  font: 500 0.76rem/1.4 var(--font-mono, 'Fira Code', monospace);
`;

export const PreviewControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ViewportButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 104px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(224, 236, 244, 0.18))'};
  border-radius: 9px;
  background: var(--surface-card, #141419);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const PreviewStage = styled.div`
  display: flex;
  justify-content: center;
  min-width: 0;
  padding: 12px;
  overflow-x: auto;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
  border-radius: 12px;
  background: var(--bg-base, #0A0A0F);
`;

export const PreviewFrame = styled.iframe<{ $width: string }>`
  width: ${({ $width }) => $width};
  max-width: 100%;
  height: min(72vh, 820px);
  min-height: 560px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
`;

export const PreviewBanner = styled.div`
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid var(--accent-luxury, #C6A84B);
  border-radius: 9px;
  background: var(--surface-warning, rgba(198, 168, 75, 0.1));
  color: var(--accent-luxury, #C6A84B);
  font: 800 0.78rem/1.3 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0.08em;
`;

export const ArchiveSection = styled.section`
  display: grid;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
`;

export const ArchiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 8px;
`;

export const ArchiveLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
  border-radius: 9px;
  color: var(--text-primary, #E0ECF4);
  text-decoration: none;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    outline: none;
  }
`;

export const PreviewState = styled.div`
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  text-align: center;
`;