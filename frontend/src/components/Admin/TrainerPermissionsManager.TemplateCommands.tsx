import React from 'react';
import { Award, Calendar, Sparkles } from 'lucide-react';
import {
  Button,
  TemplateCommandStrip,
  TemplateSelectionCount,
  TemplateSelector
} from './TrainerPermissionsManager.styles';
import { PERMISSION_TEMPLATES } from './TrainerPermissionsManager.logic';

interface TrainerTemplateCommandsProps {
  applyTemplate: (templateKey: string, trainerIds: number[]) => void;
  bulkProcessing: boolean;
  selectedTemplate: string;
  selectedTrainers: Set<number>;
  setSelectedTemplate: (template: string) => void;
}

const QUICK_TEMPLATE_COMMANDS = [
  {
    key: 'new_trainer',
    label: 'New Trainer',
    ariaLabel: 'Apply New Trainer starter template to selected trainers',
    icon: Sparkles,
    variant: 'success' as const
  },
  {
    key: 'session_manager',
    label: 'Session Manager',
    ariaLabel: 'Apply Session Manager template to selected trainers',
    icon: Calendar,
    variant: 'primary' as const
  }
];

export const TrainerTemplateCommands: React.FC<TrainerTemplateCommandsProps> = ({
  applyTemplate,
  bulkProcessing,
  selectedTemplate,
  selectedTrainers,
  setSelectedTemplate
}) => {
  const selectedTrainerIds = Array.from(selectedTrainers);
  const isTemplateLocked = selectedTrainerIds.length === 0 || bulkProcessing;

  return (
    <TemplateCommandStrip aria-label="Trainer permission template commands">
      <TemplateSelectionCount>{selectedTrainerIds.length} selected</TemplateSelectionCount>

      {QUICK_TEMPLATE_COMMANDS.map((command) => {
        const Icon = command.icon;
        return (
          <Button
            key={command.key}
            variant={command.variant}
            onClick={() => applyTemplate(command.key, selectedTrainerIds)}
            disabled={isTemplateLocked}
            aria-label={command.ariaLabel}
            title={command.ariaLabel}
          >
            <Icon size={16} />
            {command.label}
          </Button>
        );
      })}

      <TemplateSelector
        value={selectedTemplate}
        onChange={(event) => setSelectedTemplate(event.target.value)}
        aria-label="Select a broader permission template"
        title="Select a broader permission template to apply to selected trainers"
      >
        <option value="">More Templates</option>
        {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
          <option key={key} value={key}>
            {template.name} ({template.permissions.length} permissions)
          </option>
        ))}
      </TemplateSelector>

      <Button
        variant="secondary"
        onClick={() => {
          if (selectedTemplate && selectedTrainerIds.length > 0) {
            applyTemplate(selectedTemplate, selectedTrainerIds);
          }
        }}
        disabled={!selectedTemplate || isTemplateLocked}
        aria-label="Apply selected broader permission template to selected trainers"
      >
        <Award size={16} />
        Apply
      </Button>
    </TemplateCommandStrip>
  );
};
