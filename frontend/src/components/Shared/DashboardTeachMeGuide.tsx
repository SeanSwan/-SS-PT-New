/**
 * SHARED COMPONENT: DashboardTeachMeGuide
 * PURPOSE: Role-aware dashboard teaching guide mounted on canonical dashboard shells.
 * FITS IN: UniversalDashboardLayout and UserDashboard.V3 use this to explain real
 * workflow loops without duplicating role copy across dashboard pages.
 */

import React, { memo, useMemo } from 'react';
import { ArrowRight, Compass, MessageCircle, Route, ShieldCheck } from 'lucide-react';
import { useInRouterContext, useLocation } from 'react-router-dom';
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
import {
  GuideQuickStrip,
  QuickActionGroup,
  QuickCoachButton,
  QuickEyebrow,
  QuickIntro,
  QuickPathPreview,
  QuickPrimaryAnchor,
  QuickPrimaryButton,
  QuickTitle,
} from './DashboardTeachMeGuide.quickStyles';

interface DashboardTeachMeGuideProps {
  dashboardRole: DashboardTeachMeRole | string;
  pathname: string;
  search?: string;
  onAskCoach?: (prompt: string) => void;
  onNavigate?: (to: string) => void;
  variant?: 'full' | 'headerPopover';
}

interface DashboardTeachMeGuideContentProps extends DashboardTeachMeGuideProps {
  effectiveSearch: string;
}

const sectionIdFor = (role: DashboardTeachMeRole, pathname: string) => {
  const routeKey = pathname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56) || 'home';

  return `dashboard-teachme-${role}-${routeKey}`;
};

const DashboardTeachMeGuideContent: React.FC<DashboardTeachMeGuideContentProps> = ({
  dashboardRole,
  pathname,
  effectiveSearch,
  onAskCoach,
  onNavigate,
  variant = 'full',
}) => {
  const normalizedRole = normalizeDashboardTeachMeRole(dashboardRole);
  const guide = useMemo(
    () => getDashboardTeachMeGuide({ role: normalizedRole, pathname, search: effectiveSearch }),
    [normalizedRole, pathname, effectiveSearch],
  );
  const secondaryActions = useMemo(
    () => guide.actions.filter((action) => action.to !== guide.primaryAction.to),
    [guide],
  );
  const startNowLabel = `Start now: ${guide.primaryAction.label}`;
  const coachShortcutLabel = `Ask Swan Coach: ${guide.title}`;
  const canAskCoach = Boolean(guide.primaryPrompt && onAskCoach);
  const askCoach = () => {
    if (guide.primaryPrompt && onAskCoach) onAskCoach(guide.primaryPrompt);
  };

  const quickStrip = (
    <GuideQuickStrip>
      <QuickIntro>
        <QuickEyebrow>Teach Me</QuickEyebrow>
        <QuickTitle>{guide.title}</QuickTitle>
      </QuickIntro>
      <QuickPathPreview aria-label={`${guide.title} visible fast path`}>
        {guide.fastPath.map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </QuickPathPreview>
      <QuickActionGroup aria-label={`${guide.title} first move shortcuts`}>
        {onNavigate ? (
          <QuickPrimaryButton
            type="button"
            aria-label={startNowLabel}
            onClick={() => onNavigate(guide.primaryAction.to)}
          >
            {startNowLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </QuickPrimaryButton>
        ) : (
          <QuickPrimaryAnchor
            href={guide.primaryAction.to}
            aria-label={startNowLabel}
          >
            {startNowLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </QuickPrimaryAnchor>
        )}
        {canAskCoach && (
          <QuickCoachButton
            type="button"
            aria-label={coachShortcutLabel}
            onClick={askCoach}
          >
            Ask Coach
            <MessageCircle size={14} aria-hidden="true" />
          </QuickCoachButton>
        )}
      </QuickActionGroup>
    </GuideQuickStrip>
  );
  const content = (
    <GuideContent>
      {quickStrip}
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

  if (variant === 'headerPopover') {
    return (
      <TeachMeToggle
        sectionId={sectionIdFor(normalizedRole, `${pathname}${effectiveSearch}`)}
        title={guide.title}
        buttonLabel="Open guide"
        ariaLabel={`Teach Me: ${guide.title} | First move: ${guide.primaryAction.label}`}
        content={content}
        defaultOpen={false}
        panelMode="popover"
        onAskAI={
          guide.primaryPrompt && onAskCoach
            ? () => onAskCoach(guide.primaryPrompt as string)
            : undefined
        }
      />
    );
  }

  return (
    <GuideShell aria-label={`${guide.title} teach me guide`}>
      <TeachMeToggle
        sectionId={sectionIdFor(normalizedRole, `${pathname}${effectiveSearch}`)}
        title={guide.title}
        buttonLabel="Open guide"
        ariaLabel={`Teach Me: ${guide.title} | First move: ${guide.primaryAction.label}`}
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

const DashboardTeachMeGuideWithRouterSearch: React.FC<DashboardTeachMeGuideProps> = (props) => {
  const { search } = useLocation();
  return <DashboardTeachMeGuideContent {...props} effectiveSearch={search} />;
};

const DashboardTeachMeGuide: React.FC<DashboardTeachMeGuideProps> = (props) => {
  const isInRouter = useInRouterContext();

  if (props.search === undefined && isInRouter) {
    return <DashboardTeachMeGuideWithRouterSearch {...props} />;
  }

  return <DashboardTeachMeGuideContent {...props} effectiveSearch={props.search ?? ''} />;
};

export default memo(DashboardTeachMeGuide);
