import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const routeComponentsSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const notesManagerSource = readFileSync(resolve(__dirname, './NotesManager.tsx'), 'utf8');
const photoManagerSource = readFileSync(resolve(__dirname, './PhotoManager.tsx'), 'utf8');
const notesHookSource = readFileSync(resolve(repoRoot, 'frontend/src/hooks/useClientNotes.ts'), 'utf8');
const photosHookSource = readFileSync(resolve(repoRoot, 'frontend/src/hooks/useClientPhotos.ts'), 'utf8');

describe('admin notes and photos auth pipeline', () => {
  it('covers mounted notes/photos routes and backend mounts', () => {
    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain("export const NotesManager = React.lazy(() => import('../Admin/NotesManager'))");
    expect(dashboardRoutesSource).toContain("{ path: '/notes/:clientId?', component: NotesManager");
    expect(routeComponentsSource).toContain("export const PhotoManager = React.lazy(() => import('../Admin/PhotoManager'))");
    expect(dashboardRoutesSource).toContain("{ path: '/photos/:clientId?', component: PhotoManager");
    expect(coreRoutes).toContain("app.use('/api/notes', clientNoteRoutes)");
    expect(coreRoutes).toContain("app.use('/api/photos', clientPhotoRoutes)");
  });

  it('keeps notes load and mutations on the shared API service', () => {
    expect(notesHookSource).toContain('apiService.get(`/api/notes/${userId}`)');
    expect(notesHookSource).toContain('apiService.post(`/api/notes/${userId}`');
    expect(notesManagerSource).toContain('apiService.post(`/api/notes/${numericClientId}`');
    expect(notesManagerSource).toContain('apiService.put(`/api/notes/${numericClientId}/${editingNoteId}`');
    expect(notesManagerSource).toContain('apiService.delete(`/api/notes/${clientId}/${noteId}`');
    expect(notesHookSource + notesManagerSource).not.toContain("localStorage.getItem('token')");
    expect(notesHookSource + notesManagerSource).not.toContain('fetch(`/api/notes/');
  });

  it('keeps photos load and mutations on the shared API service', () => {
    expect(photosHookSource).toContain('apiService.get(`/api/photos/${userId}${queryParams}`)');
    expect(photoManagerSource).toContain('apiService.post(`/api/photos/${numericClientId}`');
    expect(photoManagerSource).toContain('apiService.delete(`/api/photos/${clientId}/${photoId}`');
    expect(photosHookSource + photoManagerSource).not.toContain("localStorage.getItem('token')");
    expect(photosHookSource + photoManagerSource).not.toContain('fetch(`/api/photos/');
  });
});
