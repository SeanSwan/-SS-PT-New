/**
 * WorkoutPlanPdfDialog.tsx
 *
 * Trainer/admin dialog for viewing or replacing a saved workout plan PDF.
 *
 * BLUEPRINT
 * Purpose: mobile-first PDF viewer/editor for a selected saved plan.
 * Data: SavedPlanSummary.pdfFile metadata persisted in WorkoutPlan.metadata.
 * Actions: view existing PDF, replace URL/file name, close without mutation.
 * A11y: modal semantics, named close action, native labels, 44px controls.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Save, UploadCloud, X } from 'lucide-react';
import type { SavedPlanSummary } from './SavedPlanCard';
import {
  ActionRow,
  Body,
  Button,
  Dialog,
  Eyebrow,
  FallbackLink,
  Field,
  Form,
  Header,
  IconButton,
  Input,
  Overlay,
  Title,
  TitleGroup,
  ViewerFrame,
} from './WorkoutPlanPdfDialog.styles';

export type WorkoutPlanPdfDialogMode = 'view' | 'edit';

interface WorkoutPlanPdfDialogProps {
  plan: SavedPlanSummary | null;
  mode: WorkoutPlanPdfDialogMode;
  saving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSave: (planId: string, pdfUrl: string, fileName: string) => void;
  onUpload: (planId: string, file: File) => void;
}

const WorkoutPlanPdfDialog: React.FC<WorkoutPlanPdfDialogProps> = ({
  plan,
  mode,
  saving,
  onClose,
  onEdit,
  onSave,
  onUpload,
}) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setPdfUrl(plan?.pdfFile?.url || '');
    setFileName(plan?.pdfFile?.fileName || '');
    setSelectedFile(null);
  }, [plan]);

  if (!plan) return null;

  const canView = mode === 'view' && Boolean(plan.pdfFile?.url);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedFile) {
      onUpload(plan.id, selectedFile);
      return;
    }
    onSave(plan.id, pdfUrl, fileName);
  };

  const content = (
    <Overlay role="presentation">
      <Dialog role="dialog" aria-modal="true" aria-labelledby="workout-plan-pdf-title">
        <Header>
          <TitleGroup>
            <Eyebrow>{canView ? 'PDF Plan' : 'Attach PDF Plan'}</Eyebrow>
            <Title id="workout-plan-pdf-title">{plan.name}</Title>
          </TitleGroup>
          <IconButton type="button" onClick={onClose} aria-label="Close workout plan PDF dialog">
            <X size={18} />
          </IconButton>
        </Header>

        <Body>
          {canView ? (
            <>
              <ViewerFrame
                data={plan.pdfFile?.url}
                type="application/pdf"
                title={`${plan.name} PDF plan`}
              >
                <FallbackLink href={plan.pdfFile?.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Open PDF
                </FallbackLink>
              </ViewerFrame>
              <ActionRow>
                <Button type="button" $primary onClick={onEdit}>
                  Replace PDF
                </Button>
                <Button as="a" href={plan.pdfFile?.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Open PDF
                </Button>
              </ActionRow>
            </>
          ) : (
            <Form onSubmit={submit}>
              <Field>
                Upload PDF plan file
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </Field>
              <Field>
                PDF URL
                <Input
                  value={pdfUrl}
                  onChange={(event) => setPdfUrl(event.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                  required={!selectedFile}
                />
              </Field>
              <Field>
                File Name
                <Input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="Six Month Plan.pdf"
                />
              </Field>
              <ActionRow>
                <Button type="submit" $primary disabled={saving}>
                  {selectedFile ? <UploadCloud size={16} /> : <Save size={16} />}
                  {saving ? 'Saving' : selectedFile ? 'Upload PDF Plan' : 'Save PDF'}
                </Button>
                <Button type="button" onClick={onClose}>
                  Cancel
                </Button>
              </ActionRow>
            </Form>
          )}
        </Body>
      </Dialog>
    </Overlay>
  );

  return createPortal(content, document.body);
};

export default WorkoutPlanPdfDialog;
