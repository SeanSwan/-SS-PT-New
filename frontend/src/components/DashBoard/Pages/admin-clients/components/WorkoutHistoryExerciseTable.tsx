/**
 * WorkoutHistoryExerciseTable
 *
 * Renders the canonical workout-history exercise rows for one expanded
 * session. The parent owns edit state and table visibility flags; this
 * component keeps dense cell rendering out of the panel shell.
 */
import React from 'react';
import { Trash2 } from 'lucide-react';

import type { WorkoutLogEntry } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { calcBrzycki1RM } from '../../../../../hooks/analytics/workoutAnalyticsUtils';
import {
  EditBtn,
  EditCellInput,
} from './WorkoutHistoryPanel.styles';
import {
  ExerciseNameCell,
  ExerciseTable,
  OneRMCell,
  RPECell,
  Td,
  TempoCell,
  Th,
  WeightCell,
} from './WorkoutHistoryPanel.sessionStyles';

const EMPTY_CELL = '\u2014';

export interface WorkoutHistoryExerciseTableProps {
  tableExerciseGroups: Array<[string, WorkoutLogEntry[]]>;
  activeLogs: WorkoutLogEntry[];
  isEditing: boolean;
  hasTempo: boolean;
  hasRest: boolean;
  hasRPE: boolean;
  hasWeight: boolean;
  updateEditField: (
    logIndex: number,
    field: keyof WorkoutLogEntry,
    value: string,
  ) => void;
  removeEditRow: (logIndex: number) => void;
}

const WorkoutHistoryExerciseTable: React.FC<WorkoutHistoryExerciseTableProps> = ({
  tableExerciseGroups,
  activeLogs,
  isEditing,
  hasTempo,
  hasRest,
  hasRPE,
  hasWeight,
  updateEditField,
  removeEditRow,
}) => (
  <ExerciseTable>
    <thead>
      <tr>
        <Th>Exercise</Th>
        <Th>Set</Th>
        <Th>Reps</Th>
        <Th>Weight</Th>
        {hasTempo && <Th>Tempo</Th>}
        {hasRest && <Th>Rest</Th>}
        {hasRPE && <Th>RPE</Th>}
        {!isEditing && hasWeight && <Th>Est. 1RM</Th>}
        {isEditing && <Th aria-label="Row actions">{' '}</Th>}
      </tr>
    </thead>
    <tbody>
      {tableExerciseGroups.map(([exerciseName, groupSets]) =>
        groupSets.map((log, index) => {
          const logIndex = activeLogs.indexOf(log);

          return (
            <tr key={`${exerciseName}-${log.id ?? index}-${log.setNumber}`}>
              {index === 0 && (
                <ExerciseNameCell rowSpan={groupSets.length}>
                  {exerciseName}
                </ExerciseNameCell>
              )}
              <Td>{index + 1}</Td>
              <Td>
                {isEditing ? (
                  <EditCellInput
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={log.reps ?? ''}
                    data-testid={`edit-reps-${logIndex}`}
                    onChange={(event) =>
                      updateEditField(logIndex, 'reps', event.target.value)
                    }
                  />
                ) : (
                  log.reps
                )}
              </Td>
              <Td>
                {isEditing ? (
                  <EditCellInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={log.weight ?? ''}
                    data-testid={`edit-weight-${logIndex}`}
                    onChange={(event) =>
                      updateEditField(logIndex, 'weight', event.target.value)
                    }
                  />
                ) : (
                  <WeightCell>{log.weight > 0 ? `${log.weight} lbs` : 'BW'}</WeightCell>
                )}
              </Td>
              {hasTempo && (
                <Td>
                  {isEditing ? (
                    <EditCellInput
                      type="text"
                      value={log.tempo ?? ''}
                      placeholder="1/1/0"
                      data-testid={`edit-tempo-${logIndex}`}
                      onChange={(event) =>
                        updateEditField(logIndex, 'tempo', event.target.value)
                      }
                    />
                  ) : (
                    <TempoCell>{log.tempo || EMPTY_CELL}</TempoCell>
                  )}
                </Td>
              )}
              {hasRest && (
                <Td>
                  {isEditing ? (
                    <EditCellInput
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={log.rest ?? ''}
                      data-testid={`edit-rest-${logIndex}`}
                      onChange={(event) =>
                        updateEditField(logIndex, 'rest', event.target.value)
                      }
                    />
                  ) : (
                    log.rest ? `${log.rest}s` : EMPTY_CELL
                  )}
                </Td>
              )}
              {hasRPE && (
                <Td>
                  {isEditing ? (
                    <EditCellInput
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={10}
                      value={log.rpe ?? ''}
                      data-testid={`edit-rpe-${logIndex}`}
                      onChange={(event) =>
                        updateEditField(logIndex, 'rpe', event.target.value)
                      }
                    />
                  ) : (
                    log.rpe ? <RPECell $value={log.rpe}>{log.rpe}/10</RPECell> : EMPTY_CELL
                  )}
                </Td>
              )}
              {!isEditing && hasWeight && (
                <Td>
                  <OneRMCell>
                    {calcBrzycki1RM(log.weight, log.reps) > 0
                      ? `${calcBrzycki1RM(log.weight, log.reps)} lbs`
                      : EMPTY_CELL}
                  </OneRMCell>
                </Td>
              )}
              {isEditing && (
                <Td>
                  <EditBtn
                    type="button"
                    $variant="danger"
                    onClick={() => removeEditRow(logIndex)}
                    aria-label={`Remove set ${index + 1} of ${exerciseName}`}
                    data-testid={`edit-remove-${logIndex}`}
                  >
                    <Trash2 size={12} />
                  </EditBtn>
                </Td>
              )}
            </tr>
          );
        })
      )}
    </tbody>
  </ExerciseTable>
);

export default React.memo(WorkoutHistoryExerciseTable);
