import React, { useMemo, useState } from 'react';
import { Copy, Gauge, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import {
  buildLensBrief,
  composerViews,
  getLensPreset,
  getReadinessScore,
  lensPresets,
  type ComposerState,
  type ComposerView,
  type LensPresetId,
} from './LensFoundryComposer.data';
import {
  CanvasGrid,
  CanvasNode,
  ComposerShell,
  ControlPanel,
  ControlStack,
  CopyButton,
  NodeLabel,
  NodeMeta,
  PacketBlock,
  PacketPanel,
  PacketText,
  PresetButton,
  PresetLabel,
  PresetMeta,
  RangeField,
  ScoreRing,
  Stage,
  StageCopy,
  StageEyebrow,
  StageHeader,
  StageTitle,
  Tag,
  TagRow,
  ToggleRow,
  ViewButton,
  ViewSwitch,
} from './LensFoundryComposer.styles';

const initialState: ComposerState = {
  presetId: 'creator-wedge',
  view: 'canvas',
  intensity: 68,
  density: 58,
  trustGate: true,
};

const previewNodes = [
  { label: 'Intent', meta: 'Goal, audience, route target', span: 4 },
  { label: 'Canvas', meta: '12-col LensDocument preview', span: 5 },
  { label: 'Trust', meta: 'No PII, receipts, review gates', span: 3 },
  { label: 'Fable', meta: 'Layout, hierarchy, motion brief', span: 6 },
  { label: 'Hermes', meta: 'Operator steps and approval flow', span: 3 },
  { label: 'Promote', meta: 'Package, test, and release path', span: 3 },
];

const LensFoundryComposer: React.FC = () => {
  const [state, setState] = useState<ComposerState>(initialState);
  const [copyStatus, setCopyStatus] = useState('Packet ready');
  const preset = useMemo(() => getLensPreset(state.presetId), [state.presetId]);
  const readinessScore = useMemo(() => getReadinessScore(state), [state]);
  const brief = useMemo(() => buildLensBrief(preset, state), [preset, state]);
  const trustTag = state.trustGate ? 'Trust gate on' : 'Trust review required';

  const updatePreset = (presetId: LensPresetId) => {
    setState((current) => ({ ...current, presetId }));
    setCopyStatus('Packet ready');
  };

  const updateView = (view: ComposerView) => {
    setState((current) => ({ ...current, view }));
  };

  const copyBrief = async () => {
    const writeText = navigator.clipboard?.writeText;
    if (!writeText) {
      setCopyStatus('Clipboard unavailable');
      return;
    }

    try {
      await writeText.call(navigator.clipboard, brief);
      setCopyStatus('Fable packet copied');
    } catch {
      setCopyStatus('Clipboard unavailable');
    }
  };

  return (
    <ComposerShell>
      <ControlStack aria-label="Lens Composer controls">
        {lensPresets.map((item) => (
          <PresetButton
            key={item.id}
            type="button"
            $active={item.id === state.presetId}
            aria-pressed={item.id === state.presetId}
            onClick={() => updatePreset(item.id)}
          >
            <PresetLabel>{item.label}</PresetLabel>
            <PresetMeta>{item.surface}</PresetMeta>
          </PresetButton>
        ))}

        <ControlPanel>
          <ViewSwitch aria-label="Composer view">
            {composerViews.map((view) => (
              <ViewButton
                key={view.id}
                type="button"
                $active={state.view === view.id}
                aria-pressed={state.view === view.id}
                onClick={() => updateView(view.id)}
              >
                {view.label}
              </ViewButton>
            ))}
          </ViewSwitch>

          <RangeField>
            <span>
              <Gauge size={14} aria-hidden="true" /> Morph intensity {state.intensity}
            </span>
            <input
              type="range"
              min="20"
              max="90"
              value={state.intensity}
              aria-label="Morph intensity"
              onChange={(event) => setState((current) => ({
                ...current,
                intensity: Number(event.target.value),
              }))}
            />
          </RangeField>

          <RangeField>
            <span>
              <Layers3 size={14} aria-hidden="true" /> Canvas density {state.density}
            </span>
            <input
              type="range"
              min="24"
              max="84"
              value={state.density}
              aria-label="Canvas density"
              onChange={(event) => setState((current) => ({
                ...current,
                density: Number(event.target.value),
              }))}
            />
          </RangeField>

          <ToggleRow>
            <span>
              <ShieldCheck size={14} aria-hidden="true" /> Trust gate
            </span>
            <input
              type="checkbox"
              checked={state.trustGate}
              aria-label="Trust gate"
              onChange={(event) => setState((current) => ({
                ...current,
                trustGate: event.target.checked,
              }))}
            />
          </ToggleRow>

          <CopyButton type="button" onClick={copyBrief}>
            <Copy size={15} aria-hidden="true" /> Copy packet
          </CopyButton>
          <PacketText aria-live="polite">{copyStatus}</PacketText>
        </ControlPanel>
      </ControlStack>

      <Stage aria-label={`${preset.label} preview`}>
        <StageHeader>
          <div>
            <StageEyebrow>{preset.eyebrow}</StageEyebrow>
            <StageTitle>{preset.headline}</StageTitle>
            <StageCopy>{preset.subline}</StageCopy>
          </div>
          <ScoreRing $score={readinessScore} aria-label={`Promotion readiness ${readinessScore} percent`}>
            {readinessScore}
          </ScoreRing>
        </StageHeader>

        {state.view === 'canvas' && (
          <>
            <CanvasGrid $density={state.density}>
              {previewNodes.map((node, index) => (
                <CanvasNode
                  key={node.label}
                  $span={node.span}
                  $tone={preset.palette[index % preset.palette.length]}
                  $lift={Math.round((state.intensity + index * 6) / 8)}
                >
                  <NodeLabel>{node.label}</NodeLabel>
                  <NodeMeta>{node.meta}</NodeMeta>
                </CanvasNode>
              ))}
            </CanvasGrid>
            <TagRow>
              {preset.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
              <Tag>{trustTag}</Tag>
            </TagRow>
          </>
        )}

        {state.view === 'packet' && (
          <PacketPanel>
            {preset.fableDirectives.map((directive) => (
              <PacketBlock key={directive}>
                <StageEyebrow>
                  <Sparkles size={13} aria-hidden="true" /> Fable
                </StageEyebrow>
                <PacketText>{directive}</PacketText>
              </PacketBlock>
            ))}
            <PacketBlock>
              <StageEyebrow>Generated Brief</StageEyebrow>
              <PacketText>{brief}</PacketText>
            </PacketBlock>
          </PacketPanel>
        )}

        {state.view === 'flow' && (
          <PacketPanel>
            {preset.hermesSteps.map((step, index) => (
              <PacketBlock key={step}>
                <StageEyebrow>Step {index + 1}</StageEyebrow>
                <PacketText>{step}</PacketText>
              </PacketBlock>
            ))}
            <PacketBlock>
              <StageEyebrow>Promotion Checks</StageEyebrow>
              <PacketText>{preset.promotionChecks.join(' / ')}</PacketText>
            </PacketBlock>
          </PacketPanel>
        )}
      </Stage>
    </ComposerShell>
  );
};

export default LensFoundryComposer;
