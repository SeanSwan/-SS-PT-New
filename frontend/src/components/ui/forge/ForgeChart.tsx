/**
 * ForgeChart — SS-PT chart frame (Phase 2f): a Forge data-card + the existing
 * SafeChart error boundary/Suspense + the Forge-derived Victory theme.
 * Consumers render their Victory chart as children with
 * `theme={forgeVictoryTheme}` (mirrors the current chartTheme.ts contract, so
 * migrating a chart is: swap the import, wrap in <ForgeChart>). No new behavior;
 * the frame is presentation + the SafeChart boundary already trusted in prod.
 * PACK CHOICE IS DELIBERATE: this file lives in SS-PT's binding layer, so it pins
 * crystalline-swan (as ForgeButton does). The PACKAGE is pack-agnostic; a second
 * site writes its own binding with its own pack — the frame is not the reusable
 * unit, the cores + skins are (panel round 6, Ox #6 adjudicated).
 */
import React from 'react';
import '@swan/forge/tokens/primitive.css';
import '@swan/forge/tokens/packs/crystalline-swan.css';
import '@swan/forge/css/card.css';
import SafeChart from '../../Charts/SafeChart';
export { forgeVictoryTheme, forgeVictoryAnimate, FORGE_SERIES } from './forgeChartTheme';

export interface ForgeChartProps {
  chartName: string;
  title?: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}

const ForgeChart: React.FC<ForgeChartProps> = ({ chartName, title, meta, children, className }) => {
  const titleId = `${chartName.replace(/[^\w-]/g, '_')}-title`;
  return (
  <article
    className={['sw-pack-crystalline-swan', 'sw-card', 'sw-card--data', className].filter(Boolean).join(' ')}
    aria-labelledby={title ? titleId : undefined}
    aria-label={title ? undefined : chartName}
  >
    {title && <h3 id={titleId} className="sw-card__title">{title}</h3>}
    {meta && <span className="sw-card__meta">{meta}</span>}
    <SafeChart chartName={chartName}>{children}</SafeChart>
  </article>
  );
};

export default ForgeChart;
