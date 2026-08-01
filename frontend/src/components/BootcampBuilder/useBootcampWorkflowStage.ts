import { useCallback, useEffect, useState } from 'react';
import type { BootcampWorkflowStage } from './BootcampBuilderPage.constants';
import {
  acquireBootcampRunSurface,
  releaseBootcampWakeLock,
  type BootcampRunAcquisitionResult,
} from './bootcampRunAcquisition';

type AcquireRunSurface = () => Promise<BootcampRunAcquisitionResult>;
type ReleaseRunSurface = () => Promise<void>;

export function useBootcampWorkflowStage(
  acquireRunSurface: AcquireRunSurface = acquireBootcampRunSurface,
  releaseRunSurface: ReleaseRunSurface = releaseBootcampWakeLock,
) {
  const [workflowStage, setWorkflowStage] = useState<BootcampWorkflowStage>('build');

  const onStageChange = useCallback((nextStage: BootcampWorkflowStage) => {
    if (nextStage === 'run') {
      void acquireRunSurface();
    } else {
      void releaseRunSurface();
    }
    setWorkflowStage(nextStage);
  }, [acquireRunSurface, releaseRunSurface]);

  useEffect(() => () => {
    void releaseRunSurface();
  }, [releaseRunSurface]);

  return {
    workflowStage,
    floorMode: workflowStage === 'run',
    onStageChange,
  };
}
