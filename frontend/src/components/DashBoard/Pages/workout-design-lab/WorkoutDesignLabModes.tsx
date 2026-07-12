import React from "react";
import { Columns, Layers3, LayoutDashboard } from "lucide-react";
import { ModeRail, ModeTab } from "./WorkoutDesignLabModes.styles";

export type WorkoutDesignLabMode = "world" | "style" | "compare";

interface WorkoutDesignLabModesProps {
  mode: WorkoutDesignLabMode;
  onChange: (mode: WorkoutDesignLabMode) => void;
}

const modes = [
  { id: "world", label: "World", Icon: LayoutDashboard },
  { id: "style", label: "Style", Icon: Layers3 },
  { id: "compare", label: "Compare", Icon: Columns },
] as const;

const WorkoutDesignLabModes: React.FC<WorkoutDesignLabModesProps> = ({
  mode,
  onChange,
}) => (
  <ModeRail role="tablist" aria-label="Lab view mode">
    {modes.map(({ id, label, Icon }) => (
      <ModeTab
        key={id}
        type="button"
        role="tab"
        aria-label={label}
        aria-selected={mode === id}
        $active={mode === id}
        onClick={() => onChange(id)}
      >
        <Icon aria-hidden="true" size={18} />
        <span>{label}</span>
        <small>
          {id === "world" ? "25 environments" : id === "style" ? "25 systems" : "2-panel view"}
        </small>
      </ModeTab>
    ))}
  </ModeRail>
);

export default WorkoutDesignLabModes;
