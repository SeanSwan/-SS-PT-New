import React from 'react';
import { Film, MessageSquare, Dumbbell, Gamepad2 } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'video-studio', label: 'Video Studio', icon: <Film size={18} />, path: '/dashboard/content/video-studio' },
  { id: 'moderation', label: 'Moderation', icon: <MessageSquare size={18} />, path: '/dashboard/content/moderation' },
  { id: 'exercises', label: 'Exercises', icon: <Dumbbell size={18} />, path: '/dashboard/content/exercises' },
  { id: 'gamification', label: 'Gamification', icon: <Gamepad2 size={18} />, path: '/dashboard/content/gamification' },
];

const ContentWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Content Studio"
    subtitle="Video library, content moderation, and engagement systems"
    tabs={tabs}
  />
);

export default ContentWorkspace;
