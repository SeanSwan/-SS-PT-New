/**
 * Point value table for admin gamification settings.
 */
import React from 'react';
import { BarChart2 } from 'lucide-react';
import {
  CardHeadingRow,
  CardTitle,
  GlassCard,
  MutedText,
} from './GamificationSettingsFrame.styles';
import {
  NumericCell,
  StyledInput,
  StyledTable,
  TBody,
  THead,
  TableWrapper,
} from './GamificationSettingsControl.styles';
import type { PointValue, UpdatePointValue } from './GamificationSettings.types';

interface GamificationSettingsPointValuesSectionProps {
  pointValues: PointValue[];
  onPointValueChange: UpdatePointValue;
}

export const GamificationSettingsPointValuesSection: React.FC<GamificationSettingsPointValuesSectionProps> = ({
  pointValues,
  onPointValueChange,
}) => (
  <GlassCard>
    <CardHeadingRow>
      <BarChart2 size={20} />
      <CardTitle>Point Values</CardTitle>
    </CardHeadingRow>

    <MutedText>Configure the point values awarded for different activities in the system.</MutedText>

    <TableWrapper>
      <StyledTable>
        <THead>
          <tr>
            <th>Activity</th>
            <th>Description</th>
            <th>Points</th>
          </tr>
        </THead>
        <TBody>
          {pointValues.map(pointValue => (
            <tr key={pointValue.id}>
              <td>{pointValue.name}</td>
              <td>{pointValue.description}</td>
              <NumericCell>
                <StyledInput
                  aria-label={`${pointValue.name} Points`}
                  type="number"
                  value={pointValue.pointValue}
                  onChange={event => onPointValueChange(pointValue.id, parseInt(event.target.value) || 0)}
                  $width="100px"
                  $textAlign="right"
                  min={0}
                />
              </NumericCell>
            </tr>
          ))}
        </TBody>
      </StyledTable>
    </TableWrapper>
  </GlassCard>
);
