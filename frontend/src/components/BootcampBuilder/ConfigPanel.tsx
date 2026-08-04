/**
 * SUB-COMPONENT: ConfigPanel
 * PARENT: BootcampBuilderPage
 * PURPOSE: Left panel class configuration form for AI generation.
 */
import React from 'react';
import { Panel, PanelTitle, FormGroup, Label, Select, Input, PrimaryButton, ErrorBanner } from './BootcampBuilderStyles';
import {
  BOOTCAMP_EXERCISES_PER_STATION_OPTIONS,
  BOOTCAMP_STATION_COUNT_OPTIONS,
  DAY_TYPES,
  OPT_PHASES,
  CLASS_STYLES,
  INTENSITY_CATEGORIES,
} from './BootcampBuilderConstants';
import type { DayType } from '../../hooks/useBootcampAPI';
import type { ClassStyle, IntensityCategory } from './BootcampBuilderConstants';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import { StyledBox } from '@/components/ui/StyledBox';

export interface ConfigPanelProps {
  stationCount: number;
  setStationCount: (v: number) => void;
  exercisesPerStation: number;
  setExercisesPerStation: (v: number) => void;
  dayType: DayType;
  setDayType: (v: DayType) => void;
  classStyle: ClassStyle;
  setClassStyle: (v: ClassStyle) => void;
  intensityCategory: IntensityCategory;
  setIntensityCategory: (v: IntensityCategory) => void;
  optPhase: number;
  setOptPhase: (v: number) => void;
  targetDuration: string;
  setTargetDuration: (v: string) => void;
  expectedParticipants: string;
  setExpectedParticipants: (v: string) => void;
  className: string;
  setClassName: (v: string) => void;
  equipmentProfileId: number | null;
  setEquipmentProfileId: (v: number | null) => void;
  includeStretch: boolean;
  setIncludeStretch: (v: boolean) => void;
  floorMode: boolean;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  stationCount, setStationCount,
  exercisesPerStation, setExercisesPerStation,
  dayType, setDayType,
  classStyle, setClassStyle,
  intensityCategory, setIntensityCategory,
  optPhase, setOptPhase,
  targetDuration, setTargetDuration,
  expectedParticipants, setExpectedParticipants,
  className, setClassName,
  equipmentProfileId, setEquipmentProfileId,
  includeStretch, setIncludeStretch,
  floorMode, loading, error, onGenerate,
}) => (
  <Panel>
    <PanelTitle>Class Configuration</PanelTitle>

    <FormGroup>
      <Label>Station Count</Label>
      <Select aria-label="Station Count" value={stationCount} onChange={e => setStationCount(Number(e.target.value))}>
        {BOOTCAMP_STATION_COUNT_OPTIONS.map(count => (
          <option key={count} value={count}>{count}</option>
        ))}
      </Select>
    </FormGroup>

    <FormGroup>
      <Label>Exercises Per Station</Label>
      <Select aria-label="Exercises Per Station" value={exercisesPerStation} onChange={e => setExercisesPerStation(Number(e.target.value))}>
        {BOOTCAMP_EXERCISES_PER_STATION_OPTIONS.map(count => (
          <option key={count} value={count}>{count}</option>
        ))}
      </Select>
    </FormGroup>

    <FormGroup>
      <Label>Class Style</Label>
      <Select value={classStyle} onChange={e => setClassStyle(e.target.value as ClassStyle)}>
        {CLASS_STYLES.map(s => (
          <option key={s.value} value={s.value}>{s.label} - {s.description}</option>
        ))}
      </Select>
    </FormGroup>

    <FormGroup>
      <Label>Day Type</Label>
      <Select aria-label="Day Type" value={dayType} onChange={e => setDayType(e.target.value as DayType)}>
        {DAY_TYPES.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </Select>
    </FormGroup>

    <FormGroup>
      <Label>Intensity Category</Label>
      <Select value={intensityCategory} onChange={e => setIntensityCategory(e.target.value as IntensityCategory)}>
        {INTENSITY_CATEGORIES.map(ic => (
          <option key={ic.value} value={ic.value}>{ic.label}</option>
        ))}
      </Select>
    </FormGroup>

    <FormGroup>
      <Label>NASM OPT Phase</Label>
      <Select value={optPhase} onChange={e => setOptPhase(Number(e.target.value))}>
        {OPT_PHASES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </Select>
    </FormGroup>

    <FormGroup>
      <Label>Workout Duration (min)</Label>
      <Input type="number" value={targetDuration} onChange={e => setTargetDuration(e.target.value)} />
    </FormGroup>

    <FormGroup>
      <Label>Expected Participants</Label>
      <Input type="number" value={expectedParticipants} onChange={e => setExpectedParticipants(e.target.value)} />
    </FormGroup>

    <FormGroup>
      <Label>Class Name (optional)</Label>
      <Input type="text" placeholder="Auto-generated if empty" value={className} onChange={e => setClassName(e.target.value)} />
    </FormGroup>

    <FormGroup>
      <EquipmentProfilePicker
        selectedProfileId={equipmentProfileId}
        onSelect={setEquipmentProfileId}
        compact
        label="Equipment Profile"
      />
    </FormGroup>

    <FormGroup>
      <StyledBox as="label" $style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
        <StyledBox as="input"
          type="checkbox"
          checked={includeStretch}
          onChange={e => setIncludeStretch(e.target.checked)}
          $style={{ width: 18, height: 18, accentColor: 'var(--accent-primary, #60C0F0)' }}
        />
        Include 3-5 min warm-up stretch
      </StyledBox>
    </FormGroup>

    <PrimaryButton $floorMode={floorMode} onClick={onGenerate} disabled={loading}>
      {loading ? 'Generating...' : 'Generate Class'}
    </PrimaryButton>

    {error && <StyledBox as={ErrorBanner} $style={{ marginTop: 12 }}>{error}</StyledBox>}
  </Panel>
);

export default React.memo(ConfigPanel);
