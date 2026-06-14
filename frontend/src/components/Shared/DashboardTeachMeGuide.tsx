/**
 * SHARED COMPONENT: DashboardTeachMeGuide
 * PURPOSE: Role-aware dashboard teaching guide mounted on canonical dashboard shells.
 * FITS IN: UniversalDashboardLayout and UserDashboard.V3 use this to explain real
 * workflow loops without duplicating role copy across dashboard pages.
 */

import React, { memo, useMemo } from 'react';
import { ArrowRight, Compass, Route, ShieldCheck } from 'lucide-react';
import TeachMeToggle from './TeachMeToggle';
import {
  type DashboardTeachMeRole,
  getDashboardTeachMeGuide,
  normalizeDashboardTeachMeRole,
} from './DashboardTeachMeGuide.logic';
import {
  ActionAnchor,
  ActionButton,
  ActionRail,
  FastPathList,
  FirstMoveAnchor,
  FirstMoveButton,
  FirstMoveHeader,
  FirstMovePanel,
  FocusCallout,
  GuardrailNote,
  GuideContent,
  GuideKicker,
  GuideShell,
  GuideSteps,
  GuideSummary,
} from './DashboardTeachMeGuide.styles';

interface DashboardTeachMeGuideProps {
  role: DashboardTeachMeRole | string;
  pathname: string;
  onAskCoach?: (prompt: string) => void;
  onNavigate?: (to: string) => void;
}

const sectionIdFor = (role: DashboardTeachMeRole, pathname: string) => {
  const routeKey = pathname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56) || 'home';

  return `dashboard-teachme-${role}-${routeKey}`;
};

const DashboardTeachMeGuide: React.FC<DashboardTeachMeGuideProps> = ({
  role,
  pathname,
  onAskCoach,
  onNavigate,
}) => {
  const normalizedRole = normalizeDashboardTeachMeRole(role);
  const guide = useMemo(
    () => getDashboardTeachMeGuide({ role: normalizedRole, pathname }),
    [normalizedRole, pathname],
  );
  const secondaryActions = useMemo(
    () => guide.actions.filter((action) => action.to !== guide.primaryAction.to),
    [guide],
  );

  const content = (
    <GuideContent>
      <GuideKicker>
        <Compass size={14} aria-hidden="true" />
        {guide.eyebrow}
      </GuideKicker>
      <GuideSummary>{guide.summary}</GuideSummary>
      <FirstMovePanel>
        <FirstMoveHeader>
          <span>First move</span>
          <strong>3-step path</strong>
        </FirstMoveHeader>
        {onNavigate ? (
          <FirstMoveButton
            type="button"
            aria-label={`First move: ${guide.primaryAction.label}`}
            onClick={() => onNavigate(guide.primaryAction.to)}
          >
            {guide.primaryAction.label}
            <ArrowRight size={15} aria-hidden="true" />
          </FirstMoveButton>
        ) : (
          <FirstMoveAnchor
            href={guide.primaryAction.to}
            aria-label={`First move: ${guide.primaryAction.label}`}
          >
            {guide.primaryAction.label}
            <ArrowRight size={15} aria-hidden="true" />
          </FirstMoveAnchor>
        )}
        <FastPathList aria-label={`${guide.title} fast path`}>
          {guide.fastPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </FastPathList>
      </FirstMovePanel>
      <FocusCallout>
        <Route size={16} aria-hidden="true" />
        <span>{guide.focus}</span>
      </FocusCallout>
      <ActionRail aria-label={`${guide.title} quick actions`}>
        {secondaryActions.map((action) => (
          onNavigate ? (
            <ActionButton
              key={action.to}
              type="button"
              onClick={() => onNavigate(action.to)}
            >
              {action.label}
              <ArrowRight size={14} aria-hidden="true" />
            </ActionButton>
          ) : (
            <ActionAnchor key={action.to} href={action.to}>
              {action.label}
              <ArrowRight size={14} aria-hidden="true" />
            </ActionAnchor>
          )
        ))}
      </ActionRail>
      <GuideSteps>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </GuideSteps>
      <GuardrailNote>
        <ShieldCheck size={15} aria-hidden="true" />
        <span>No hidden writes. Review first, save second.</span>
      </GuardrailNote>
    </GuideContent>
  );

  return (
    <GuideShell aria-label={`${guide.title} teach me guide`}>
      <TeachMeToggle
        sectionId={sectionIdFor(normalizedRole, pathname)}
        title={guide.title}
        buttonLabel={`Teach Me: ${guide.title} | First move: ${guide.primaryAction.label}`}
        content={content}
        defaultOpen={false}
        onAskAI={
          guide.primaryPrompt && onAskCoach
            ? () => onAskCoach(guide.primaryPrompt as string)
            : undefined
        }
      />
    </GuideShell>
  );
};

export default memo(DashboardTeachMeGuide);
