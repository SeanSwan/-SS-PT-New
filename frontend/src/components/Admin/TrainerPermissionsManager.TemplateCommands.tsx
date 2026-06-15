import React from 'react';
import { Award, Calendar, Sparkles } from 'lucide-react';
import {
  Button,
  TemplateCommandStrip,
  TemplateSelectionCount,
  TemplateSelector
} from './TrainerPermissionsManager.styles';
import { PERMISSION_TEMPLATES, PERMISSION_TYPES } from './TrainerPermissionsManager.logic';

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

const criticalPermissionLabels = new Map(
  PERMISSION_TYPES
    .filter((permission) => permission.critical)
    .map((permission) => [permission.key, permission.label])
);

const getElevatedCriticalLabels = (templateKey: string): string[] => {
  const template = PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];
  if (!template) return [];

  const labels = template.permissions
    .map((permissionType) => criticalPermissionLabels.get(permissionType))
    .filter(Boolean) as string[];

  return labels.length > 1 ? labels : [];
};

export const TrainerTemplateCommands: React.FC<TrainerTemplateCommandsProps> = ({
  applyTemplate,
  bulkProcessing,
  selectedTemplate,
  selectedTrainers,
  setSelectedTemplate
}) => {
  const selectedTrainerIds = Array.from(selectedTrainers);
  const isTemplateLocked = selectedTrainerIds.length === 0 || bulkProcessing;
  const applyWithConfirmation = (templateKey: string) => {
    if (!templateKey || selectedTrainerIds.length === 0) return;
    const template = PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];
    if (!template) return;

    const criticalLabels = getElevatedCriticalLabels(templateKey);
    if (criticalLabels.length > 0) {
      const confirmed = window.confirm(
        `${template.name} grants ${criticalLabels.join(' and ')} to ${selectedTrainerIds.length} selected trainer(s). Continue?`
      );
      if (!confirmed) return;
    }

    applyTemplate(templateKey, selectedTrainerIds);
  };

  return (
    <TemplateCommandStrip aria-label="Trainer permission template commands">
      <TemplateSelectionCount>{selectedTrainerIds.length} selected</TemplateSelectionCount>

      {QUICK_TEMPLATE_COMMANDS.map((command) => {
        const Icon = command.icon;
        return (
          <Button
            key={command.key}
            variant={command.variant}
            onClick={() => applyWithConfirmation(command.key)}
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
        onClick={() => applyWithConfirmation(selectedTemplate)}
        disabled={!selectedTemplate || isTemplateLocked}
        aria-label="Apply selected broader permission template to selected trainers"
      >
        <Award size={16} />
        Apply
      </Button>
    </TemplateCommandStrip>
  );
};
