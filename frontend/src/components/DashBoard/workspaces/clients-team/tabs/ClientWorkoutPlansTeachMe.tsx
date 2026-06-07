/**
 * ============================================================================
 * FILE: ClientWorkoutPlansTeachMe.tsx
 * PURPOSE: Opt-in training-plan guidance for the Client Hub Plan Vault.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Mounts the shared TeachMeToggle with plan-vault guidance that reinforces the
 * seven-horizon model, primary arc meaning, PDF review, and off-day homework
 * logging semantics.
 *
 * HOW IT FITS IN THE APP:
 * ClientWorkoutPlansPanel renders this below its header for trainer/admin users.
 */

import React from 'react';
import styled from 'styled-components';
import TeachMeToggle from '../../../../Shared/TeachMeToggle';

const TeachMePlacement = styled.div`
  display: grid;
  justify-items: start;
`;

const TeachMeCopy = styled.div`
  display: grid;
  gap: 10px;

  p,
  ul {
    margin: 0;
  }

  ul {
    padding-left: 18px;
  }

  li + li {
    margin-top: 6px;
  }

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;

const ClientWorkoutPlansTeachMe: React.FC = () => (
  <TeachMePlacement>
    <TeachMeToggle
      sectionId="client-workout-plan-vault"
      title="Plan Vault + off-day logging"
      defaultOpen={false}
      content={(
        <TeachMeCopy>
          <p>
            <strong>Seven SwanStudios arcs stay visible.</strong> Keep 1 Day,
            1 Week, 1 Month, 3 Month, 6 Month, 9 Month, and 12 Month plans
            reviewable so the client, trainer, admin, and Swan Coach can see the
            full training arc instead of only the latest PDF.
          </p>
          <ul>
            <li>
              <strong>Primary arc:</strong> Make Primary marks the plan that the
              dashboard and Swan Coach should treat as the main client path.
            </li>
            <li>
              <strong>PDF review:</strong> Open PDF shows the protected plan file
              connected to the saved program before it is used or shared.
            </li>
            <li>
              <strong>Homework diary logs are off-day plan work.</strong> They
              keep reps, weight, tempo, and completion history without turning
              the work into a scheduled paid session.
            </li>
            <li>
              <strong>Coach planning:</strong> Generated plans should come from
              Swan Coach with read-safe client context, then be reviewed before
              activation.
            </li>
          </ul>
        </TeachMeCopy>
      )}
    />
  </TeachMePlacement>
);

export default React.memo(ClientWorkoutPlansTeachMe);
