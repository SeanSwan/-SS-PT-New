import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HOME_COMPOSER_ACCEPT,
  HOME_COMPOSER_MAX_MEDIA_BYTES,
  validateHomeComposerMediaFile,
} from './HomeComposerMediaPolicy';

function sourceFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function withSize(file: File, size: number): File {
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('HomeComposerMediaPolicy', () => {
  it('accepts community-safe image and video media types', () => {
    expect(validateHomeComposerMediaFile(
      new File(['image'], 'progress.jpg', { type: 'image/jpeg' }),
    )).toEqual({ accepted: true, error: null });

    expect(validateHomeComposerMediaFile(
      new File(['video'], 'set-pr.mp4', { type: 'video/mp4' }),
    )).toEqual({ accepted: true, error: null });
  });

  it('rejects unsupported file types before they enter composer state', () => {
    expect(validateHomeComposerMediaFile(
      new File(['bad'], 'payload.exe', { type: 'application/x-msdownload' }),
    )).toMatchObject({
      accepted: false,
      error: expect.stringMatching(/image or video/i),
    });
  });

  it('rejects oversized quick-post media', () => {
    expect(validateHomeComposerMediaFile(withSize(
      new File(['video'], 'long-session.mp4', { type: 'video/mp4' }),
      HOME_COMPOSER_MAX_MEDIA_BYTES + 1,
    ))).toMatchObject({
      accepted: false,
      error: expect.stringMatching(/50 MB/i),
    });
  });

  it('keeps Home file input accept attributes aligned to the validator allowlist', () => {
    expect(HOME_COMPOSER_ACCEPT).toContain('image/jpeg');
    expect(HOME_COMPOSER_ACCEPT).toContain('video/mp4');

    const homeSource = sourceFile('src/components/UserDashboard/components/HomeTab.tsx');
    const clientHomeSource = sourceFile('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');

    expect(homeSource).toContain("import useHomeComposer, { HOME_COMPOSER_ACCEPT } from './useHomeComposer'");
    expect(clientHomeSource).toContain("import useHomeComposer, { HOME_COMPOSER_ACCEPT } from './useHomeComposer'");
    expect(homeSource).toContain('accept={HOME_COMPOSER_ACCEPT}');
    expect(clientHomeSource).toContain('accept={HOME_COMPOSER_ACCEPT}');
    expect(homeSource).toContain('mediaError={composer.mediaError}');
    expect(clientHomeSource).toContain('mediaError={composer.mediaError}');
    expect(homeSource).not.toContain('accept="image/*,video/*"');
    expect(clientHomeSource).not.toContain('accept="image/*,video/*"');
  });

  it('keeps selected media preview and remove controls wired into visible Quick Post cards', () => {
    const homeSource = sourceFile('src/components/UserDashboard/components/HomeTab.tsx');
    const clientHomeSource = sourceFile('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const visionSource = sourceFile('src/components/UserDashboard/components/HomeTabVisionCenter.tsx');
    const visionPreviewSource = sourceFile('src/components/UserDashboard/components/HomeTabSelectedMediaPreview.tsx');
    const visionStyleSource = sourceFile('src/components/UserDashboard/components/HomeTabVisionCenter.styles.ts');
    const feedSource = sourceFile('src/components/UserDashboard/components/ClientDashboardHome.feedSections.tsx');
    const styleSource = sourceFile('src/components/UserDashboard/components/ClientDashboardHome.feedStyles.ts');
    const typesSource = sourceFile('src/components/UserDashboard/components/ClientDashboardHome.types.ts');

    expect(homeSource).toContain('selectedMediaPreviewUrl={composer.selectedMediaPreviewUrl}');
    expect(homeSource).toContain('selectedMediaType={composer.selectedMedia?.type}');
    expect(homeSource).toContain('onClearMedia={composer.clearSelectedMedia}');
    expect(clientHomeSource).toContain('selectedMediaPreviewUrl={composer.selectedMediaPreviewUrl}');
    expect(clientHomeSource).toContain('selectedMediaType={composer.selectedMedia?.type}');
    expect(clientHomeSource).toContain('onClearMedia={composer.clearSelectedMedia}');
    expect(typesSource).toContain('selectedMediaPreviewUrl?: string | null;');
    expect(typesSource).toContain('onClearMedia: () => void;');
    expect(visionSource).toContain('<HomeTabSelectedMediaPreview');
    expect(visionPreviewSource).toContain('Selected media preview');
    expect(visionPreviewSource).toContain('Remove media');
    expect(visionStyleSource).toContain('export const SelectedMediaPreview');
    expect(feedSource).toContain('<MediaPreviewShell');
    expect(feedSource).toContain('Selected media preview');
    expect(feedSource).toContain('Remove media');
    expect(styleSource).toContain('export const MediaPreviewShell');
    expect(styleSource).toContain('min-height: 44px');
  });
});