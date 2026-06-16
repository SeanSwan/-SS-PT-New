import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Calendar, Sparkles } from 'lucide-react';
import {
  Button,
  TemplateCommandStrip,
  TemplateSelectionCount,
  TemplateSelector
} from './TrainerPermissionsManager.styles';
import {
  TemplateConfirmActions,
  TemplateConfirmCard,
  TemplateConfirmMeta,
  TemplateConfirmTitle
} from './TrainerPermissionsManager.templateCommandStyles';
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

  return template.permissions
    .map((permissionType) => criticalPermissionLabels.get(permissionType))
    .filter(Boolean) as string[];
};

interface PendingTemplateConfirmation {
  criticalLabels: string[];
  key: string;
  name: string;
  trainerIds: number[];
}

export const TrainerTemplateCommands: React.FC<TrainerTemplateCommandsProps> = ({
  applyTemplate,
  bulkProcessing,
  selectedTemplate,
  selectedTrainers,
  setSelectedTemplate
}) => {
  const selectedTrainerIds = useMemo(() => Array.from(selectedTrainers), [selectedTrainers]);
  const selectedTrainerKey = selectedTrainerIds.join(',');
  const [pendingTemplate, setPendingTemplate] = useState<PendingTemplateConfirmation | null>(null);
  const isTemplateLocked = selectedTrainerIds.length === 0 || bulkProcessing;

  useEffect(() => {
    setPendingTemplate(null);
  }, [bulkProcessing, selectedTrainerKey]);

  const requestTemplate = (templateKey: string) => {
    if (!templateKey || selectedTrainerIds.length === 0) return;
    const template = PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];
    if (!template) return;

    const criticalLabels = getElevatedCriticalLabels(templateKey);
    if (criticalLabels.length > 0) {
      setPendingTemplate({
        criticalLabels,
        key: templateKey,
        name: template.name,
        trainerIds: selectedTrainerIds,
      });
      return;
    }

    applyTemplate(templateKey, selectedTrainerIds);
  };

  const confirmPendingTemplate = () => {
    if (!pendingTemplate || bulkProcessing) return;
    applyTemplate(pendingTemplate.key, pendingTemplate.trainerIds);
    setPendingTemplate(null);
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
            onClick={() => requestTemplate(command.key)}
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
        onClick={() => requestTemplate(selectedTemplate)}
        disabled={!selectedTemplate || isTemplateLocked}
        aria-label="Apply selected broader permission template to selected trainers"
      >
        <Award size={16} />
        Apply
      </Button>

      {pendingTemplate ? (
        <TemplateConfirmCard
          role="alertdialog"
          aria-label={`Confirm ${pendingTemplate.name} template`}
          aria-modal="false"
        >
          <TemplateConfirmTitle>
            <AlertTriangle size={16} />
            Confirm {pendingTemplate.name}
          </TemplateConfirmTitle>
          <p>
            This grants {pendingTemplate.criticalLabels.join(' and ')} to {pendingTemplate.trainerIds.length} selected trainer(s).
            Review the selection before applying.
          </p>
          <TemplateConfirmMeta>Permission write requires confirmation</TemplateConfirmMeta>
          <TemplateConfirmActions>
            <Button
              type="button"
              variant="warning"
              onClick={confirmPendingTemplate}
              disabled={bulkProcessing}
              aria-label={`Confirm ${pendingTemplate.name} template`}
            >
              Confirm
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPendingTemplate(null)}
              aria-label="Cancel template confirmation"
            >
              Cancel
            </Button>
          </TemplateConfirmActions>
        </TemplateConfirmCard>
      ) : null}
    </TemplateCommandStrip>
  );
};
