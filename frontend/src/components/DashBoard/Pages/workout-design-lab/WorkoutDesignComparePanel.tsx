import React from "react";
import type { StyleLensManifest } from "../../../../core/style-lens-os";
import type { ConceptRegistryItem } from "./conceptRegistry";
import type { WorkoutDesignViewModel } from "./workoutDesignViewModel";
import {
  CompareGrid,
  ComparePanel,
  CompareSelectors,
} from "./WorkoutDesignLabModes.styles";

interface WorkoutDesignComparePanelProps {
  worlds: readonly ConceptRegistryItem[];
  lenses: readonly StyleLensManifest[];
  world: ConceptRegistryItem;
  lens: StyleLensManifest;
  model: WorkoutDesignViewModel;
  onWorldChange: (id: string) => void;
  onLensChange: (id: string) => void;
}

const WorkoutDesignComparePanel: React.FC<WorkoutDesignComparePanelProps> = ({
  worlds,
  lenses,
  world,
  lens,
  model,
  onWorldChange,
  onLensChange,
}) => (
  <>
    <CompareSelectors>
      <label>
        World environment
        <select aria-label="Compare workout world" value={world.id} onChange={(event) => onWorldChange(event.target.value)}>
          {worlds.map((item) => <option key={item.id} value={item.id}>{item.number} | {item.name}</option>)}
        </select>
      </label>
      <label>
        Structural Style Lens
        <select aria-label="Compare Style Lens" value={lens.id} onChange={(event) => onLensChange(event.target.value)}>
          {lenses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
    </CompareSelectors>
    <CompareGrid role="region" aria-label="World and Style comparison">
      <ComparePanel data-testid="comparison-panel">
        <span>World | content atmosphere</span>
        <h2>{world.name}</h2>
        <p>{world.description}</p>
        <ul>
          <li>{world.environmentFamily} environment | {world.interactionModel}</li>
          <li>{world.typographyDirection}</li>
          <li>{model.exercises.length} shared exercises remain in session</li>
        </ul>
      </ComparePanel>
      <ComparePanel data-testid="comparison-panel">
        <span>Style | interface system</span>
        <h2>{lens.name}</h2>
        <p>{lens.description}</p>
        <ul>
          <li>{lens.emotionalJob} | {lens.layoutSignature.replace(/-/g, " ")}</li>
          <li>{lens.navigationRenderer.replace(/-/g, " ")}</li>
          <li>{lens.accessibilityReceipt.minimumTouchTargetPx}px minimum touch target</li>
        </ul>
      </ComparePanel>
    </CompareGrid>
  </>
);

export default WorkoutDesignComparePanel;
