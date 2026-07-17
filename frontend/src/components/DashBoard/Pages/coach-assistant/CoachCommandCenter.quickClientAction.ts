/**
 * FILE: CoachCommandCenter.quickClientAction.ts
 * PURPOSE: Quick "add client" rail action for the Coach Command Center.
 * Split from CoachCommandCenter.actions.ts to honor the 300-line file cap.
 */
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { createQuickCoachCommandClient, type CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import {
  buildCommandLogAccessHandoff,
  commandLogAccessHandoffAttachment,
  commandLogAccessHandoffIntro,
} from './CoachCommandCenter.accessHandoff';
import type { CommandLogEntry } from './CoachCommandCenter.data';

type QuickClientActionDeps = {
  addLog: (entry: Omit<CommandLogEntry, 'id' | 'at'>) => void;
  coachQueue: { refresh: () => unknown };
  quickClientName: string;
  quickClientSource: CoachCommandClientSource;
  setQuickClientBusy: Dispatch<SetStateAction<boolean>>;
  setQuickClientError: Dispatch<SetStateAction<string | null>>;
  setQuickClientMessage: Dispatch<SetStateAction<string | null>>;
  setQuickClientName: Dispatch<SetStateAction<string>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
};

export function createQuickClientSubmitAction(deps: QuickClientActionDeps) {
  return async (event: FormEvent) => {
    event.preventDefault();
    const fullName = deps.quickClientName.trim();
    if (!fullName) {
      deps.setQuickClientError('Client name is required.');
      deps.setQuickClientMessage(null);
      return;
    }

    deps.setQuickClientBusy(true);
    deps.setQuickClientError(null);
    deps.setQuickClientMessage(null);
    try {
      const result = await createQuickCoachCommandClient({ fullName, clientSource: deps.quickClientSource });
      const createdName = [result.client.firstName, result.client.lastName].filter(Boolean).join(' ') || fullName;
      const accessHandoff = buildCommandLogAccessHandoff({ result, createdName, fallbackClientSource: deps.quickClientSource });
      deps.setQuickClientName('');
      deps.setQuickClientMessage(`${createdName} is ready for review-gated follow-up. No workout log was written.`);
      deps.addLog({
        actor: 'system',
        label: 'client added',
        body: `${createdName} is ready for staged audio/workout review. ${commandLogAccessHandoffIntro(accessHandoff)}No workout log was written and final writes still require operator approval.`,
        attachments: [commandLogAccessHandoffAttachment(accessHandoff)],
        accessHandoff,
      });
      deps.setSelectedStatus(`${createdName} - client ready`);
      void deps.coachQueue.refresh();
    } catch {
      // Raw server error strings never reach the UI (safe-copy discipline).
      deps.setQuickClientError('Client could not be added. Check the name and try again; if it keeps failing, add the client from Client Management.');
      deps.addLog({
        actor: 'system',
        label: 'client add failed',
        body: 'Quick client add failed. No client or workout write was completed from the command rail.',
      });
    } finally {
      deps.setQuickClientBusy(false);
    }
  };
}
