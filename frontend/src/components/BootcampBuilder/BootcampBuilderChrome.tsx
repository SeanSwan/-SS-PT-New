import { Download, Hand, Shuffle, Wand2 } from 'lucide-react';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import TeachMeToggle from '../Shared/TeachMeToggle';
import { FloorModeToggle, Subtitle, Title, TopBar } from './BootcampBuilderStyles';
import { ModeBar, ModeBtn, TimingAlert } from './BootcampModeStyles';
import type { BuildMode, BootcampWorkflowStage } from './BootcampBuilderPage.constants';
import BootcampClassRail from './BootcampClassRail';
import { BOOTCAMP_TEACH_ME_CONTENT } from './BootcampBuilderPage.constants';
import { HeaderActions } from './BootcampBuilderChrome.styles';
import { EXERCISE_LIBRARY_CLAIM } from '../../content/marketingStats';

interface BootcampBuilderChromeProps {
  bootcamp: GeneratedBootcamp | null;
  buildMode: BuildMode;
  activeStage: BootcampWorkflowStage;
  isOverTime: boolean;
  totalClassMin: number;
  onBuildModeChange: (mode: BuildMode) => void;
  onExportPDF: () => void;
  onStageChange: (stage: BootcampWorkflowStage) => void;
}

const BootcampBuilderChrome: React.FC<BootcampBuilderChromeProps> = ({
  bootcamp,
  buildMode,
  activeStage,
  isOverTime,
  totalClassMin,
  onBuildModeChange,
  onExportPDF,
  onStageChange,
}) => (
  <>
    {activeStage !== 'run' && (
      <TopBar>
      <div>
        <Title className="lens2-display">Boot Camp Class Builder</Title>
        <Subtitle>Swan Coach + manual class creation with {EXERCISE_LIBRARY_CLAIM} exercises and inline regressions</Subtitle>
      </div>
      <HeaderActions>
        {bootcamp && (
          <FloorModeToggle onClick={onExportPDF} title="Export class plan as PDF">
            <Download size={16} /> PDF
          </FloorModeToggle>
        )}
        <TeachMeToggle
          sectionId="bootcamp-builder"
          title="How to Use the Bootcamp Builder"
          content={BOOTCAMP_TEACH_ME_CONTENT}
        />
      </HeaderActions>
      </TopBar>
    )}
    {activeStage === 'build' && (
      <ModeBar>
        <ModeBtn $active={buildMode === 'ai'} onClick={() => onBuildModeChange('ai')}>
          <Wand2 size={14} /> Swan Coach Generate
        </ModeBtn>
        <ModeBtn $active={buildMode === 'manual'} onClick={() => onBuildModeChange('manual')}>
          <Hand size={14} /> Manual
        </ModeBtn>
        <ModeBtn $active={buildMode === 'hybrid'} onClick={() => onBuildModeChange('hybrid')}>
          <Shuffle size={14} /> Hybrid
        </ModeBtn>
        <TimingAlert $over={isOverTime}>
          {isOverTime ? 'Over' : 'On'} {totalClassMin}/55 min
        </TimingAlert>
      </ModeBar>
    )}
    <BootcampClassRail
      bootcamp={bootcamp}
      buildMode={buildMode}
      activeStage={activeStage}
      onStageChange={onStageChange}
    />
  </>
);

export default BootcampBuilderChrome;
