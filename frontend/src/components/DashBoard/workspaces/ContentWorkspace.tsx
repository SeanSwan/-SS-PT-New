import React from 'react';
import { Film, MessageSquare, Dumbbell, Image } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';
import AITerminalPanel from '../../Shared/AITerminalPanel';

const tabs: WorkspaceTab[] = [
  { id: 'video-studio', label: 'Video Studio', icon: <Film size={18} />, path: '/dashboard/content/video-studio' },
  { id: 'moderation', label: 'Moderation', icon: <MessageSquare size={18} />, path: '/dashboard/content/moderation' },
  { id: 'exercises', label: 'Exercises', icon: <Dumbbell size={18} />, path: '/dashboard/content/exercises' },
  { id: 'gallery', label: 'Gallery', icon: <Image size={18} />, path: '/dashboard/content/gallery' },
];

const ContentWorkspace: React.FC = () => (
  <>
    <div style={{ padding: '24px 24px 0' }}>
      <AITerminalPanel
        context="general"
        label="Content Assistant"
        emptyHint="Ask about videos, exercises, content moderation..."
        defaultOpen={false}
      />
    </div>
    <WorkspaceContainer
      title="Content Studio"
      subtitle="Video library, content moderation, and exercises"
      tabs={tabs}
    />
  </>
);

export default ContentWorkspace;
