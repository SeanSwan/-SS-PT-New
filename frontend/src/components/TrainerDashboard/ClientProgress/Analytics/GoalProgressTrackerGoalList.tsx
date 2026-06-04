import React from 'react';
import { Edit, Plus } from 'lucide-react';
import type { GoalData, GoalTrackingData } from '../../../../services/enhanced-progress-analytics-service';
import {
  clampPercent,
  GoalFilter,
  goalPriorityTextTone,
  goalPriorityTone,
  goalRowKey,
  goalStatusTextTone,
  goalStatusTone,
} from './GoalProgressTracker.logic';
import {
  AccentButton,
  BodyText,
  CellCaption,
  CellTitle,
  Chip,
  ControlsRow,
  EmptyState,
  GlassPanel,
  IconBtn,
  OverdueCaption,
  PanelHeader,
  PanelTitle,
  ProgressBarFill,
  ProgressBarOuter,
  ProgressCellFrame,
  StyledSelect,
  StyledTable,
  TableWrapper,
  TargetDateText,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from './GoalProgressTracker.styles';

interface GoalProgressTrackerGoalListProps {
  data: GoalTrackingData | null;
  filteredGoals: GoalData[];
  goalFilter: GoalFilter;
  onFilterChange: (filter: GoalFilter) => void;
  onOpenAddGoal: () => void;
  onOpenGoal: (goal: GoalData) => void;
}

const GoalProgressTrackerGoalList: React.FC<GoalProgressTrackerGoalListProps> = ({
  data,
  filteredGoals,
  goalFilter,
  onFilterChange,
  onOpenAddGoal,
  onOpenGoal,
}) => {
  if (!data) return null;

  return (
    <GlassPanel>
      <PanelHeader>
        <PanelTitle>Goal Tracking</PanelTitle>
        <ControlsRow>
          <StyledSelect
            value={goalFilter}
            onChange={(event) => onFilterChange(event.target.value as GoalFilter)}
          >
            <option value="all">All Goals</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </StyledSelect>
          <AccentButton onClick={onOpenAddGoal}>
            <Plus size={16} />
            Add Goal
          </AccentButton>
        </ControlsRow>
      </PanelHeader>

      <TableWrapper>
        <StyledTable>
          <Thead>
            <Tr>
              <Th>Goal</Th>
              <Th>Category</Th>
              <Th>Priority</Th>
              <Th>Progress</Th>
              <Th>Status</Th>
              <Th>Target Date</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredGoals.map((goal) => (
              <Tr key={goalRowKey(goal)} $clickable onClick={() => onOpenGoal(goal)}>
                <Td>
                  <CellTitle>{goal.title}</CellTitle>
                  <CellCaption>
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </CellCaption>
                </Td>
                <Td><Chip>{goal.category}</Chip></Td>
                <Td>
                  <Chip $bg={goalPriorityTone(goal.priority)} $color={goalPriorityTextTone(goal.priority)}>
                    {goal.priority}
                  </Chip>
                </Td>
                <Td>
                  <ProgressCellFrame>
                    <ProgressBarOuter>
                      <ProgressBarFill $value={clampPercent(goal.progress)} $color={goalStatusTone(goal.status)} />
                    </ProgressBarOuter>
                    <CellCaption>{clampPercent(goal.progress)}%</CellCaption>
                  </ProgressCellFrame>
                </Td>
                <Td>
                  <Chip $bg={goalStatusTone(goal.status)} $color={goalStatusTextTone(goal.status)}>
                    {goal.status}
                  </Chip>
                </Td>
                <Td>
                  <TargetDateText>{new Date(goal.targetDate).toLocaleDateString()}</TargetDateText>
                  {goal.status === 'overdue' && <OverdueCaption>Overdue</OverdueCaption>}
                </Td>
                <Td>
                  <IconBtn onClick={(event) => { event.stopPropagation(); onOpenGoal(goal); }}>
                    <Edit size={16} />
                  </IconBtn>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </StyledTable>
      </TableWrapper>

      {filteredGoals.length === 0 && (
        <EmptyState>
          <PanelTitle>{goalFilter === 'all' ? 'No goals found' : `No ${goalFilter} goals found`}</PanelTitle>
          <BodyText>This client has no saved goals for the selected filter yet.</BodyText>
        </EmptyState>
      )}
    </GlassPanel>
  );
};

export default GoalProgressTrackerGoalList;
