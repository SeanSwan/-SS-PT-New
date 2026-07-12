import React from 'react';
import styled from 'styled-components';
import type { StyleLensManifest } from '../../../core/style-lens-os';
import { themes, type ThemeId } from '../UniversalThemeContext';
type Theme = (typeof themes)[ThemeId];
import { PreviewStage } from './AppearanceStudio.styles';

export type PreviewRole = 'user' | 'client' | 'trainer' | 'admin';
export type PreviewViewport = 'mobile' | 'tablet' | 'desktop';

const Canvas = styled.div`
  --preview-line: var(--ice-wing, #60c0f0);
  min-height: 330px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  background:
    linear-gradient(145deg, var(--preview-bg), color-mix(in srgb, var(--preview-primary) 26%, var(--preview-bg)));
  color: var(--preview-text);
  font-family: 'Sora', sans-serif;

  &[data-preview-viewport='mobile'] { grid-template-columns: 48px minmax(0, 1fr); }
  &[data-preview-viewport='tablet'] { grid-template-columns: 60px minmax(0, 1fr); }
  &[data-preview-lens='quiet-meridian'] { --preview-line: var(--ice-wing, #60c0f0); filter: saturate(0.78); }
  &[data-preview-lens='blueprint-fold'] {
    border-radius: 0;
    background:
      repeating-linear-gradient(0deg, transparent 0 19px, color-mix(in srgb, var(--ice-wing, #60c0f0) 12%, transparent) 20px),
      var(--preview-primary);
  }
  &[data-preview-lens='kintsugi-circuit'] { --preview-line: var(--gilded-fern, #c6a84b); }
  &[data-preview-lens='analog-flight-recorder'] { --preview-line: var(--gilded-fern, #c6a84b); font-family: 'Fira Code', monospace; }
  &[data-preview-lens='candy-glass-arcade'] { --preview-line: var(--wing-purple, #8b5cf6); }
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
  .cards { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 10px; }
  .card { min-height: 92px; padding: 10px; border: 1px solid color-mix(in srgb, var(--preview-line) 38%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--preview-bg) 74%, transparent); }
  button { min-height: 44px; border: 0; border-radius: 11px; background: var(--midnight-sapphire, #002060); color: var(--frost-white, #e0ecf4); font-weight: 800; box-shadow: 0 0 16px color-mix(in srgb, var(--wing-purple, #8b5cf6) 42%, transparent); }

  [data-preview-lens='quiet-meridian'] & { max-width: 520px; margin-inline: auto; }
  [data-preview-lens='blueprint-fold'] & .card { border-radius: 0; }
  [data-preview-lens='kintsugi-circuit'] & .cards { grid-template-columns: 0.72fr 1.28fr; transform: skewY(-0.8deg); }
  [data-preview-lens='analog-flight-recorder'] & .card { border-radius: 2px; box-shadow: inset 0 4px 0 var(--preview-line); }
  [data-preview-lens='candy-glass-arcade'] & .card { border-radius: 22px; backdrop-filter: blur(12px); box-shadow: 0 8px 22px color-mix(in srgb, var(--preview-line) 18%, transparent); }
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
}) => (
  <PreviewStage>
    <Canvas
      data-testid='appearance-preview'
      data-preview-lens={lens.id}
      data-preview-role={role}
      data-preview-viewport={viewport}
      style={{
        '--preview-bg': theme.background.primary,
        '--preview-primary': theme.colors.primary,
        '--preview-text': theme.text.primary,
      } as React.CSSProperties}
    >
      <Rail aria-hidden='true'><span /><span /><span /><span /><span /></Rail>
      <Work>
        <header role='presentation'><div><small>{role.toUpperCase()} VIEW</small><h3>{lens.name}</h3></div><small>{viewport}</small></header>
        <div className='signal' aria-hidden='true' />
        <div className='cards'><div className='card'>Current training state</div><div className='card'>Progress proof</div></div>
        <button type='button' data-swan-button-tone='blue'>Next best action</button>
      </Work>
    </Canvas>
  </PreviewStage>
);

export default AppearanceStudioPreview;
