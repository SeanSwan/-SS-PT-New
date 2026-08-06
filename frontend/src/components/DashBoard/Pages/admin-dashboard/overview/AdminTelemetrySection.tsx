/**
 * AdminTelemetrySection — the Research & Deep Telemetry band of the admin
 * Command Center, extracted from AdminOverviewPanel (SWA-138 S10b, Rule 4).
 * Holds the two lazy visual surfaces (SwanGlobe, VisitorWorldMap) so their
 * Suspense plumbing lives beside them rather than bloating the panel.
 */

import React, { lazy, Suspense } from 'react';
import AdminOverviewSection from './AdminOverviewSection';
import AdminSystemHealthPanel from './AdminSystemHealthPanel';
import VisitorGeoWidget from '../components/VisitorGeoWidget';
import OracleInsightsWidget from '../components/OracleInsightsWidget';
import WidgetErrorBoundary from '../shell/WidgetErrorBoundary';
import { BentoFull, BentoHalf } from './AdminOverviewPanel.styles';
import { StyledBox } from '@/components/ui/StyledBox';
import type { SystemHealthMetric } from './AdminOverview.types';

// SwanGlobe is capability-gated internally; the Three.js chunk is only fetched
// on desktop + WebGL + motion-allowed. The SVG map stays as the heritage view.
const SwanGlobePanel = lazy(() => import('../components/SwanGlobe/SwanGlobePanel'));
const VisitorWorldMap = lazy(() => import('../components/VisitorWorldMap'));

interface AdminTelemetrySectionProps {
  systemHealth: SystemHealthMetric[];
  onRefresh: () => void;
}

const AdminTelemetrySection: React.FC<AdminTelemetrySectionProps> = ({
  systemHealth,
  onRefresh,
}) => (
  <AdminOverviewSection
    id="admin-telemetry"
    eyebrow="Research and Deep Telemetry"
    title="Geography, system health, and Oracle intelligence"
    lead="Long-form telemetry: visitor geography, service health, and research feeds."
  >
    <BentoFull>
      <WidgetErrorBoundary name="Visitor globe">
        <Suspense fallback={<StyledBox as="div" $style={{ minHeight: 340 }} />}>
          <SwanGlobePanel />
        </Suspense>
      </WidgetErrorBoundary>
    </BentoFull>
    <BentoHalf><WidgetErrorBoundary name="Visitor geography"><VisitorGeoWidget /></WidgetErrorBoundary></BentoHalf>
    <BentoHalf>
      <WidgetErrorBoundary name="Visitor world map">
        <Suspense fallback={<StyledBox as="div" $style={{ minHeight: 400 }} />}>
          <VisitorWorldMap />
        </Suspense>
      </WidgetErrorBoundary>
    </BentoHalf>
    <BentoHalf><WidgetErrorBoundary name="System health"><AdminSystemHealthPanel systemHealth={systemHealth} onRefresh={onRefresh} /></WidgetErrorBoundary></BentoHalf>
    <BentoFull><WidgetErrorBoundary name="Oracle insights"><OracleInsightsWidget defaultTab="news" defaultQuery="personal training fitness industry trends" /></WidgetErrorBoundary></BentoFull>
  </AdminOverviewSection>
);

export default AdminTelemetrySection;
