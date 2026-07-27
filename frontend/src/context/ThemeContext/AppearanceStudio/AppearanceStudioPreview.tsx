import React from 'react';
import styled from 'styled-components';
import type { StyleLensManifest } from '../../../core/style-lens-os';
import { themes, type ThemeId } from '../UniversalThemeContext';
type Theme = (typeof themes)[ThemeId];
import { PreviewStage } from './AppearanceStudio.styles';
import { StyledBox } from '@/components/ui/StyledBox';
import { derivePreviewStyle, canvasBackground } from './derivePreviewStyle';

export type PreviewRole = 'user' | 'client' | 'trainer' | 'admin';
export type PreviewViewport = 'mobile' | 'tablet' | 'desktop';

// Every lens now drives the preview from its OWN derived vars (--preview-line / -radius /
// -bg-image / -rail / -mono / -skew) so all 29 render distinctly — no per-lens CSS blocks.
const Canvas = styled.div`
  --preview-line: var(--preview-accent, var(--ice-wing, #60c0f0));
  min-height: 330px;
  display: grid;
  grid-template-columns: var(--preview-rail, 72px) minmax(0, 1fr);
  background: var(--preview-canvas, linear-gradient(145deg, var(--preview-bg), color-mix(in srgb, var(--preview-primary) 26%, var(--preview-bg))));
  color: var(--preview-text);
  font-family: var(--preview-font, 'Sora', sans-serif);

  &[data-preview-viewport='mobile'] { grid-template-columns: calc(var(--preview-rail, 72px) * 0.7) minmax(0, 1fr); }
  &[data-preview-viewport='tablet'] { grid-template-columns: calc(var(--preview-rail, 72px) * 0.85) minmax(0, 1fr); }
`;

const Rail = styled.div`
  padding: 12px 8px;
  border-right: 1px solid var(--preview-line);
  background: color-mix(in srgb, var(--preview-bg) 88%, transparent);
  span { display: block; width: 100%; height: 8px; margin-bottom: 10px; border-radius: 999px; background: color-mix(in srgb, var(--preview-line) 45%, transparent); }
  span:first-child { height: 24px; border-radius: 8px; background: var(--preview-line); }
`;

const Work = styled.div`
  min-width: 0;
  padding: 14px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 11px;
  header { display: flex; justify-content: space-between; gap: 8px; }
  h3 { margin: 0; font: 800 clamp(14px, 2vw, 20px)/1.1 'Plus Jakarta Sans', sans-serif; }
  small { color: color-mix(in srgb, var(--preview-text) 70%, transparent); }
  .signal { height: 7px; border-radius: 999px; background: linear-gradient(90deg, var(--preview-line) 72%, color-mix(in srgb, var(--preview-line) 14%, transparent) 72%); }
  .cards { display: grid; grid-template-columns: var(--preview-cards, 1.3fr 0.7fr); gap: 10px; transform: skewY(var(--preview-skew, 0deg)); }
  .card { min-height: 92px; padding: 10px; border: 1px solid color-mix(in srgb, var(--preview-line) 38%, transparent); border-radius: var(--preview-radius, 12px); background: color-mix(in srgb, var(--preview-bg) 74%, transparent); }
  button { min-height: 44px; border: 0; border-radius: 11px; background: var(--midnight-sapphire, #002060); color: var(--frost-white, #e0ecf4); font-weight: 800; box-shadow: 0 0 16px color-mix(in srgb, var(--wing-purple, #8b5cf6) 42%, transparent); }
`;

interface AppearanceStudioPreviewProps {
  lens: StyleLensManifest;
  theme: Theme;
  role: PreviewRole;
  viewport: PreviewViewport;
}

const AppearanceStudioPreview: React.FC<AppearanceStudioPreviewProps> = ({
  lens,
  theme,
  role,
  viewport,
}) => {
  const d = derivePreviewStyle(lens);
  return (
  <PreviewStage>
    <StyledBox as={Canvas}
      data-testid='appearance-preview'
      data-preview-lens={lens.id}
      data-preview-role={role}
      data-preview-viewport={viewport}
      $style={{
        '--preview-bg': theme.background.primary,
        '--preview-primary': theme.colors.primary,
        '--preview-text': theme.text.primary,
        '--preview-accent': d.accentToken,
        '--preview-canvas': canvasBackground(d.canvasKind, d.accentToken),
        '--preview-rail': `${d.railWidth}px`,
        '--preview-radius': `${d.panelRadius}px`,
        '--preview-cards': d.cardsColumns,
        '--preview-skew': `${d.skew}deg`,
        '--preview-font': d.mono ? "'Fira Code', monospace" : "'Sora', sans-serif",
      } as React.CSSProperties}
    >
      <Rail aria-hidden='true'><span /><span /><span /><span /><span /></Rail>
      <Work>
        <header role='presentation'><div><small>{role.toUpperCase()} VIEW</small><h3>{lens.name}</h3></div><small>{viewport}</small></header>
        <div className='signal' aria-hidden='true' />
        <div className='cards'><div className='card'>Current training state</div><div className='card'>Progress proof</div></div>
        <button type='button' data-swan-button-tone='blue'>Next best action</button>
      </Work>
    </StyledBox>
  </PreviewStage>
  );
};

export default AppearanceStudioPreview;
