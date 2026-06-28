import React, { Suspense, useCallback } from 'react';
import type { useCoachCommandCenterController } from './CoachCommandCenter.controller';

const CoachOnboardingWorkbench = React.lazy(() => import('./CoachOnboardingWorkbench'));

type CoachCommandCenterController = ReturnType<typeof useCoachCommandCenterController>;
type SearchParamSetter = (nextInit: URLSearchParams, options?: { replace?: boolean }) => void;

interface CoachCommandCenterWorkbenchPanelProps {
  commandCenter: CoachCommandCenterController;
  searchParams: URLSearchParams;
  selectedClientLabel: string;
  setSearchParams: SearchParamSetter;
}

const CoachCommandCenterWorkbenchPanel: React.FC<CoachCommandCenterWorkbenchPanelProps> = ({
  commandCenter,
  searchParams,
  selectedClientLabel,
  setSearchParams,
}) => {
  const handleSelectClientId = useCallback((clientId: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('workspace', 'onboarding');
    nextParams.set('source', 'coach-workbench');
    nextParams.set('intent', 'client_profile_coverage_update');
    nextParams.set('clientId', String(clientId));
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="tab-scroll" id="coach-tabpanel-onboarding" role="tabpanel" aria-labelledby="coach-tab-onboarding">
      <Suspense fallback={<article className="panel">Loading onboarding workbench...</article>}>
        <CoachOnboardingWorkbench
          selectedClientId={commandCenter.routeClientId}
          selectedClientLabel={selectedClientLabel}
          commandText={commandCenter.commandText}
          commandTextRef={commandCenter.commandTextRef}
          queueSummary={commandCenter.summary}
          onCommandTextChange={commandCenter.setCommandText}
          onSubmit={commandCenter.handleSubmit}
          onSelectClientId={handleSelectClientId}
        />
      </Suspense>
    </div>
  );
};

export default CoachCommandCenterWorkbenchPanel;
