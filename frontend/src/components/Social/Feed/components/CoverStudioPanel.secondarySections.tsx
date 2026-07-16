/**
 * COMPONENT: CoverStudioPanel.secondarySections
 * PURPOSE: Focal, height, advanced crop, and saved cover sections for the feed cover studio panel.
 */
import { ChevronDown, Save, Trash2 } from 'lucide-react';
import type { BannerPreset } from '../../../../services/profileService';
import {
  BannerPresetApplyButton,
  BannerPresetGrid,
  BannerPresetRemoveButton,
  BannerPresetRow,
} from '../../../UserDashboard/styles/DashboardV3Styles';
import {
  Accordion,
  AccordionChevron,
  AccordionHead,
  AccordionInner,
  FocalButton,
  FocalPad,
  LibAddTile,
  RangeRow,
  RangeValue,
  SectionHelp,
  SectionLabel,
  Seg,
  SegButton,
} from './CoverStudioPanel.styles';
import { FOCAL_PRESETS, HEIGHT_PRESETS } from './CoverStudioPanel.types';
import { StyledBox } from '@/components/ui/StyledBox';

export function FocalSection({
  isFocal,
  onSetFocal,
}: {
  isFocal: (x: number, y: number) => boolean;
  onSetFocal: (x: number, y: number) => void;
}) {
  return (
    <div>
      <SectionLabel>Focal point</SectionLabel>
      <SectionHelp>Snap the cover to a region.</SectionHelp>
      <FocalPad>
        {FOCAL_PRESETS.map((preset) => (
          <FocalButton
            key={`${preset.x}-${preset.y}`}
            type="button"
            $active={isFocal(preset.x, preset.y)}
            aria-label={`Focal ${preset.label}`}
            onClick={() => onSetFocal(preset.x, preset.y)}
          >
            {preset.label}
          </FocalButton>
        ))}
      </FocalPad>
    </div>
  );
}

export function HeightPresetsSection({ height, onHeightChange }: { height: number; onHeightChange: (height: number) => void }) {
  return (
    <div>
      <SectionLabel>Banner height</SectionLabel>
      <Seg>
        {HEIGHT_PRESETS.map((preset) => (
          <SegButton key={preset.value} type="button" $active={height === preset.value} onClick={() => onHeightChange(preset.value)}>
            {preset.label}
          </SegButton>
        ))}
      </Seg>
    </div>
  );
}

export function AdvancedCropSection({
  open,
  allowZoom,
  scale,
  height,
  onToggle,
  onPreviewScale,
  onCommitScale,
  onPreviewHeight,
  onCommitHeight,
}: {
  open: boolean;
  allowZoom: boolean;
  scale: number;
  height: number;
  onToggle: () => void;
  onPreviewScale: (value: number) => void;
  onCommitScale: (value: number) => void;
  onPreviewHeight: (value: number) => void;
  onCommitHeight: (value: number) => void;
}) {
  return (
    <Accordion $open={open}>
      <AccordionHead type="button" aria-expanded={open} onClick={onToggle}>
        Advanced crop & zoom
        <AccordionChevron $open={open}><ChevronDown size={16} /></AccordionChevron>
      </AccordionHead>
      {open && (
        <AccordionInner>
          {allowZoom && (
            <div>
              <SectionLabel>Zoom</SectionLabel>
              <RangeRow>
                <input type="range" min="0.5" max="3" step="0.05" value={scale} aria-label="Cover zoom" onChange={(event) => onPreviewScale(Number(event.target.value))} onPointerUp={(event) => onCommitScale(Number((event.currentTarget as HTMLInputElement).value))} onBlur={(event) => onCommitScale(Number(event.currentTarget.value))} />
                <RangeValue>{Math.round(scale * 100)}%</RangeValue>
              </RangeRow>
            </div>
          )}
          <div>
            <SectionLabel>Exact height</SectionLabel>
            <RangeRow>
              <input type="range" min="180" max="1000" step="20" value={height} aria-label="Cover banner height" onChange={(event) => onPreviewHeight(Number(event.target.value))} onPointerUp={(event) => onCommitHeight(Number((event.currentTarget as HTMLInputElement).value))} onBlur={(event) => onCommitHeight(Number(event.currentTarget.value))} />
              <RangeValue>{height}px</RangeValue>
            </RangeRow>
          </div>
        </AccordionInner>
      )}
    </Accordion>
  );
}

export function SavedCoversSection({
  presets,
  onSave,
  onApply,
  onRemove,
}: {
  presets: BannerPreset[];
  onSave: () => void;
  onApply: (presetId: string) => void;
  onRemove: (presetId: string) => void;
}) {
  return (
    <div>
      <SectionLabel>Saved covers</SectionLabel>
      <StyledBox as={LibAddTile} forwardedAs="button" type="button" $style={{ aspectRatio: 'auto', minHeight: 44, width: '100%', gap: 8, display: 'inline-flex' }} onClick={onSave} aria-label="Save current cover as preset">
        <Save size={16} /> Save this cover
      </StyledBox>
      {presets.length > 0 && (
        <StyledBox as={BannerPresetGrid} aria-label="Saved banner presets" $style={{ marginTop: 10 }}>
          {presets.map((preset) => (
            <BannerPresetRow key={preset.id}>
              <BannerPresetApplyButton type="button" onClick={() => onApply(preset.id)} aria-label={`Apply ${preset.name}`}>
                {preset.name}
              </BannerPresetApplyButton>
              <BannerPresetRemoveButton type="button" onClick={() => onRemove(preset.id)} aria-label={`Remove ${preset.name}`}>
                <Trash2 size={14} />
              </BannerPresetRemoveButton>
            </BannerPresetRow>
          ))}
        </StyledBox>
      )}
    </div>
  );
}
