/**
 * coachIntakeItemGateMetadata.test.mjs
 * ====================================
 * Verifies queue items carry PII-safe gate/action metadata for Coach UI.
 */
import { describe, expect, it } from 'vitest';

import { mapCoachRowToIntakeItem } from '../../services/coachIntakeItemService.mjs';

describe('coachIntakeItem gate metadata', () => {
  it('maps failed stale proposal metadata to failed-intake action labels', () => {
    const item = mapCoachRowToIntakeItem({
      id: '56565656-5656-4565-9565-565656565656',
      source_type: 'chat_narrative',
      status: 'FAILED',
      resolved_client_id: 42,
      latest_proposal_id: '67676767-6767-4676-9676-676767676767',
      uploaded_at: '2026-05-06T12:00:00.000Z',
      created_at: '2026-05-06T12:00:00.000Z',
      metadata_json: {
        latestProposal: {
          id: '67676767-6767-4676-9676-676767676767',
          type: 'workout_log',
          status: 'PENDING',
        },
      },
    });

    expect(item).toMatchObject({
      nextBlockingGate: 'Intake failed',
      nextActionKey: 'review_failed_intake',
      nextActionLabel: 'Review failed intake',
    });
  });

  it('maps terminal proposal metadata to draft-preparation action labels', () => {
    const item = mapCoachRowToIntakeItem({
      id: '78787878-7878-4787-9878-787878787878',
      source_type: 'typed_note',
      status: 'READY_FOR_REVIEW',
      resolved_client_id: 42,
      latest_proposal_id: '89898989-8989-4898-9898-898989898989',
      uploaded_at: '2026-05-06T12:05:00.000Z',
      created_at: '2026-05-06T12:05:00.000Z',
      metadata_json: {
        latestProposal: {
          id: '89898989-8989-4898-9898-898989898989',
          type: 'workout_log',
          status: 'APPLIED',
          rawTranscript: 'private transcript body',
        },
      },
    });

    expect(item).toMatchObject({
      nextBlockingGate: 'Final write requires a prepared draft',
      nextActionKey: 'prepare_draft_review',
      nextActionLabel: 'Prepare draft review',
    });
    expect(JSON.stringify(item)).not.toMatch(/private transcript/i);
  });

  it('maps explicit clarification and duplicate holds to their blocked gate labels', () => {
    const clarificationItem = mapCoachRowToIntakeItem({
      id: '90909090-9090-4909-9909-909090909090',
      source_type: 'chat_narrative',
      status: 'NEEDS_CLARIFICATION',
      resolved_client_id: 42,
      latest_proposal_id: '91919191-9191-4919-9919-919191919191',
      uploaded_at: '2026-05-06T12:10:00.000Z',
      created_at: '2026-05-06T12:10:00.000Z',
      metadata_json: {
        latestProposal: {
          id: '91919191-9191-4919-9919-919191919191',
          type: 'workout_log',
          status: 'PENDING',
        },
      },
    });
    const duplicateItem = mapCoachRowToIntakeItem({
      id: '92929292-9292-4929-9929-929292929292',
      source_type: 'typed_note',
      status: 'DUPLICATE_HOLD',
      resolved_client_id: 42,
      latest_proposal_id: '93939393-9393-4939-9939-939393939393',
      uploaded_at: '2026-05-06T12:15:00.000Z',
      created_at: '2026-05-06T12:15:00.000Z',
      metadata_json: {
        latestProposal: {
          id: '93939393-9393-4939-9939-939393939393',
          type: 'workout_log',
          status: 'PENDING',
        },
      },
    });

    expect(clarificationItem).toMatchObject({
      nextBlockingGate: 'Clarification required',
      nextActionKey: 'answer_clarification',
      nextActionLabel: 'Answer Coach clarification',
    });
    expect(duplicateItem).toMatchObject({
      nextBlockingGate: 'Duplicate risk requires review',
      nextActionKey: 'review_duplicate_hold',
      nextActionLabel: 'Review duplicate risk',
    });
  });
});
