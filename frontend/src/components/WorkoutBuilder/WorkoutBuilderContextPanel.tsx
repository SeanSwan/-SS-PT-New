/**
 * WorkoutBuilderContextPanel
 * --------------------------
 * Left-side client intelligence rail for the active Swan Coach Planning page.
 */

import type { ClientContext } from '../../hooks/useWorkoutBuilderAPI';
import CorrectiveRecommendationsPanel, {
  type CompensationInput,
} from '../WorkoutLogger/CorrectiveRecommendationsPanel';
import {
  ContextCard,
  ContextLabel,
  ContextMeta,
  ContextValue,
  CorrectivePanelWrap,
  FormGroup,
  Input,
  Label,
  Panel,
  PanelTitle,
} from './WorkoutBuilderPage.styles';

interface WorkoutBuilderContextPanelProps {
  clientId: string;
  context: ClientContext | null;
  parsedClientId: number | null;
  onClientIdChange: (value: string) => void;
}

const ClientSummaryCard: React.FC<{ context: ClientContext }> = ({ context }) => (
  <ContextCard $severity="info">
    <ContextLabel>Client</ContextLabel>
    <ContextValue>{context.clientName}</ContextValue>
    <ContextMeta>NASM Phase: {context.movement.nasmPhaseRecommendation || 'Not assessed'}</ContextMeta>
  </ContextCard>
);

const PainContextCards: React.FC<{ context: ClientContext }> = ({ context }) => (
  <>
    {context.pain.exclusions.length > 0 && (
      <ContextCard $severity="danger">
        <ContextLabel>Pain Exclusions</ContextLabel>
        <ContextValue>{context.pain.exclusions.length} muscle group(s) locked</ContextValue>
        <ContextMeta>{context.pain.exclusions.map(entry => entry.bodyRegion).join(', ')}</ContextMeta>
      </ContextCard>
    )}

    {context.pain.warnings.length > 0 && (
      <ContextCard $severity="warn">
        <ContextLabel>Pain Warnings</ContextLabel>
        <ContextValue>{context.pain.warnings.length} area(s) need caution</ContextValue>
        <ContextMeta>
          {context.pain.warnings.map(entry => `${entry.bodyRegion} (${entry.painLevel}/10)`).join(', ')}
        </ContextMeta>
      </ContextCard>
    )}
  </>
);

const MovementContextCards: React.FC<{ context: ClientContext; parsedClientId: number | null }> = ({
  context,
  parsedClientId,
}) => (
  <>
    {context.movement.compensations.length > 0 && (
      <ContextCard $severity="info">
        <ContextLabel>Compensations</ContextLabel>
        <ContextValue>{context.movement.compensations.length} pattern(s)</ContextValue>
        <ContextMeta>
          {context.movement.compensations.map(comp => `${comp.type} (${comp.trend})`).join(', ')}
        </ContextMeta>
      </ContextCard>
    )}

    {parsedClientId && context.movement.compensations.length > 0 && (
      <CorrectivePanelWrap>
        <CorrectiveRecommendationsPanel
          clientId={parsedClientId}
          compensations={context.movement.compensations as CompensationInput[]}
        />
      </CorrectivePanelWrap>
    )}
  </>
);

const ActivityContextCards: React.FC<{ context: ClientContext }> = ({ context }) => (
  <>
    <ContextCard $severity="info">
      <ContextLabel>Recent Activity</ContextLabel>
      <ContextValue>{context.workouts.sessionsLast2Weeks} sessions (2 wks)</ContextValue>
      <ContextMeta>
        Avg form: {context.workouts.avgFormRating}/5 | Intensity: {context.workouts.avgIntensity}/10
      </ContextMeta>
    </ContextCard>

    {context.equipment.length > 0 && (
      <ContextCard $severity="info">
        <ContextLabel>Equipment Locations</ContextLabel>
        <ContextValue>{context.equipment.length} profile(s)</ContextValue>
        <ContextMeta>
          {context.equipment.map(profile => `${profile.name} (${profile.equipmentCount})`).join(', ')}
        </ContextMeta>
      </ContextCard>
    )}
  </>
);

const WorkoutBuilderContextPanel: React.FC<WorkoutBuilderContextPanelProps> = ({
  clientId,
  context,
  parsedClientId,
  onClientIdChange,
}) => (
  <Panel>
    <PanelTitle>Client Context</PanelTitle>

    <FormGroup>
      <Label>Client ID</Label>
      <Input
        type="number"
        placeholder="Enter client ID"
        value={clientId}
        onChange={event => onClientIdChange(event.target.value)}
      />
    </FormGroup>

    {context && (
      <>
        <ClientSummaryCard context={context} />
        <PainContextCards context={context} />
        <MovementContextCards context={context} parsedClientId={parsedClientId} />
        <ActivityContextCards context={context} />
      </>
    )}

    {!context && clientId && (
      <ContextMeta $center $pad={16}>
        Loading client data...
      </ContextMeta>
    )}
  </Panel>
);

export default WorkoutBuilderContextPanel;
