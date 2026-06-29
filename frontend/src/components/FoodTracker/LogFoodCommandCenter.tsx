import React from 'react';
import { Building2, Camera, Mic, ScanBarcode, Search, Sparkles, Utensils } from 'lucide-react';
import {
  CommandButton,
  CommandButtonLabel,
  CommandButtonMeta,
  CommandButtonText,
  CommandCenterShell,
  CommandCopy,
  CommandEyebrow,
  CommandGrid,
  CommandIntro,
  CommandTitle,
} from './LogFoodCommandCenter.styles';

export type LogFoodCommand = 'manual' | 'voice' | 'snap' | 'scan' | 'search' | 'restaurant';

interface LogFoodCommandCenterProps {
  onCommand: (command: LogFoodCommand) => void;
}

const commands: Array<{
  id: LogFoodCommand;
  label: string;
  meta: string;
  icon: React.ReactNode;
  primary?: boolean;
}> = [
  { id: 'manual', label: 'Manual log', meta: 'Fast typed macro row', icon: <Utensils size={18} />, primary: true },
  { id: 'voice', label: 'Speak meal', meta: 'Talk it through first', icon: <Mic size={18} /> },
  { id: 'snap', label: 'Snap meal', meta: 'Photo estimate review', icon: <Camera size={18} /> },
  { id: 'scan', label: 'Scan barcode', meta: 'Product lens', icon: <ScanBarcode size={18} /> },
  { id: 'search', label: 'Open food search', meta: 'USDA and food DB', icon: <Search size={18} /> },
  { id: 'restaurant', label: 'Restaurant', meta: 'Brand/menu lookup', icon: <Building2 size={18} /> },
];

const LogFoodCommandCenter: React.FC<LogFoodCommandCenterProps> = ({ onCommand }) => (
  <CommandCenterShell role="region" aria-label="Log food command center">
    <CommandIntro>
      <CommandEyebrow><Sparkles size={14} /> Nutrition OS</CommandEyebrow>
      <CommandTitle>Capture food once, review it before it counts.</CommandTitle>
      <CommandCopy>
        Choose the fastest capture mode. Swan keeps estimates visible until you approve the row into My Macros.
      </CommandCopy>
    </CommandIntro>
    <CommandGrid>
      {commands.map((command) => (
        <CommandButton
          key={command.id}
          type="button"
          $primary={command.primary}
          onClick={() => onCommand(command.id)}
          aria-label={command.label}
        >
          {command.icon}
          <CommandButtonText>
            <CommandButtonLabel>{command.label}</CommandButtonLabel>
            <CommandButtonMeta>{command.meta}</CommandButtonMeta>
          </CommandButtonText>
        </CommandButton>
      ))}
    </CommandGrid>
  </CommandCenterShell>
);

export default LogFoodCommandCenter;
