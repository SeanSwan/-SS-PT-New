/**
 * BLUEPRINT: ContentStudioProjectQueue
 * PURPOSE: Real Content Studio project queue for the Creator Command Center.
 * DATA: Uses the authenticated /api/content-studio/projects API only.
 * CONTROLS: Create a titled project and advance existing projects one stage.
 * SAFETY: No demo rows, no raw fetch lane, no unauthenticated writes.
 */

import React, { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  ContentProjectStatus,
  getNextProjectStatus,
  useContentStudioProjects,
} from './ContentStudioProjects.api';
import {
  ProjectBadge,
  ProjectButton,
  ProjectCard,
  ProjectCardHeader,
  ProjectCreateForm,
  ProjectList,
  ProjectMetaRow,
  ProjectQueueCopy,
  ProjectQueueHeader,
  ProjectQueuePanel,
  ProjectQueueTitle,
  ProjectStateLine,
  ProjectTitle,
  ProjectTitleInput,
} from './ContentStudioProjectQueue.styles';

interface WorkflowStageOption {
  id: ContentProjectStatus;
  label: string;
}

interface ContentStudioProjectQueueProps {
  stages: WorkflowStageOption[];
}

const MAX_VISIBLE_PROJECTS = 6;

const formatStatus = (status: ContentProjectStatus, stageLabels: Map<ContentProjectStatus, string>) => (
  stageLabels.get(status) || status.replace(/_/g, ' ')
);

const ContentStudioProjectQueue: React.FC<ContentStudioProjectQueueProps> = ({ stages }) => {
  const { authAxios } = useAuth();
  const [draftTitle, setDraftTitle] = useState('');
  const { projects, isLoading, isMutating, error, refreshProjects, createProject, updateProject } = useContentStudioProjects(authAxios);

  const stageLabels = useMemo(() => new Map(stages.map(stage => [stage.id, stage.label])), [stages]);
  const visibleProjects = projects.slice(0, MAX_VISIBLE_PROJECTS);
  const canCreate = draftTitle.trim().length > 0 && !isMutating;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    try {
      await createProject({ title, status: 'idea', sourceType: 'manual' });
      setDraftTitle('');
    } catch {
      // Error is surfaced by the hook state.
    }
  };

  const handleAdvance = async (projectId: string, status: ContentProjectStatus) => {
    const nextStatus = getNextProjectStatus(status);
    if (!nextStatus) return;
    try {
      await updateProject(projectId, { status: nextStatus });
    } catch {
      // Error is surfaced by the hook state.
    }
  };

  return (
    <ProjectQueuePanel aria-label="Content Studio project queue">
      <ProjectQueueHeader>
        <div>
          <ProjectQueueTitle><ClipboardList size={16} /> Project Queue</ProjectQueueTitle>
          <ProjectQueueCopy>
            Persist real creator projects here, then move them stage by stage toward a YouTube-ready package and library import.
          </ProjectQueueCopy>
        </div>
        <ProjectButton type="button" onClick={() => void refreshProjects()} disabled={isLoading || isMutating} aria-label="Refresh Content Studio projects">
          <RefreshCw size={15} /> Refresh
        </ProjectButton>
      </ProjectQueueHeader>

      <ProjectCreateForm onSubmit={handleCreate}>
        <ProjectTitleInput
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          maxLength={180}
          placeholder="Project title"
          aria-label="New Content Studio project title"
        />
        <ProjectButton type="submit" disabled={!canCreate}>
          <Plus size={15} /> Create Project
        </ProjectButton>
      </ProjectCreateForm>

      {error && <ProjectStateLine role="alert">{error}</ProjectStateLine>}
      {isLoading && <ProjectStateLine>Loading real project queue...</ProjectStateLine>}
      {!isLoading && visibleProjects.length === 0 && <ProjectStateLine>No creator projects have been started yet.</ProjectStateLine>}

      <ProjectList>
        {visibleProjects.map(project => {
          const nextStatus = getNextProjectStatus(project.status);
          const nextLabel = nextStatus ? formatStatus(nextStatus, stageLabels) : null;
          return (
            <ProjectCard key={project.id}>
              <ProjectCardHeader>
                <ProjectTitle>{project.title}</ProjectTitle>
                <ProjectButton
                  type="button"
                  disabled={!nextStatus || isMutating}
                  onClick={() => void handleAdvance(project.id, project.status)}
                  aria-label={nextLabel ? `Move ${project.title} to ${nextLabel}` : `${project.title} is already uploaded`}
                >
                  <ArrowRight size={15} /> {nextLabel ? `Next: ${nextLabel}` : 'Uploaded'}
                </ProjectButton>
              </ProjectCardHeader>
              <ProjectMetaRow>
                <ProjectBadge>{formatStatus(project.status, stageLabels)}</ProjectBadge>
                <ProjectBadge>{project.priority}</ProjectBadge>
                <ProjectBadge>{project.sourceType}</ProjectBadge>
              </ProjectMetaRow>
            </ProjectCard>
          );
        })}
      </ProjectList>
    </ProjectQueuePanel>
  );
};

export default ContentStudioProjectQueue;