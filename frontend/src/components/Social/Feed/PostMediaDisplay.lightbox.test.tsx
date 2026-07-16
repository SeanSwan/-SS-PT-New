import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PostMediaDisplay from './components/PostMediaDisplay';
import type { Post } from './types/PostCardTypes';

const imagePost: Post = {
  id: 'post-photo',
  content: 'Little cutie #SwanProgress #Milestone',
  type: 'achievement',
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    firstName: 'Sean',
    lastName: 'Swan',
    username: 'seanswan',
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  mediaUrl: '/api/serve-photo/social-photos/little-cutie.jpg',
  mediaType: 'image',
};

describe('PostMediaDisplay image lightbox', () => {
  it('renders uploaded photos as untinted media and opens the full image dialog', async () => {
    const user = userEvent.setup();

    render(<PostMediaDisplay post={imagePost} gradient="linear-gradient(#000, #111)" />);

    const openButton = screen.getByRole('button', { name: /view full image/i });
    const feedImage = screen.getByRole('img', { name: /little cutie/i });

    expect(feedImage).toHaveAttribute('src', imagePost.mediaUrl);
    expect(openButton).toContainElement(feedImage);

    await user.click(openButton);

    const dialog = screen.getByRole('dialog', { name: /full post image/i });
    expect(dialog).toBeInTheDocument();
    const overlay = dialog.parentElement;
    expect(overlay).not.toHaveAttribute('style');
    expect(overlay).toHaveStyle(
      `--post-lightbox-backdrop-image: url("${imagePost.mediaUrl}")`,
    );
    expect(screen.getByRole('img', { name: /full post image/i })).toHaveAttribute('src', imagePost.mediaUrl);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /full post image/i })).not.toBeInTheDocument();
    });
  });

  it('renders official feed enrichment URLs as the full post image frame and opens the viewer', async () => {
    const user = userEvent.setup();
    const nasaMediaUrl = 'https://images-assets.nasa.gov/image/GSFC_20260628/GSFC_20260628~thumb.jpg';
    const enrichmentPost: Post = {
      ...imagePost,
      id: 'feed-enrichment-nasa-images-GSFC_20260628',
      content: 'Earth glows beyond the blue horizon',
      mediaUrl: nasaMediaUrl,
      mediaType: 'image',
      user: {
        id: 'feed-enrichment-nasa-images',
        firstName: 'NASA',
        lastName: 'Image Library',
        username: 'nasa-images',
      },
    };

    render(<PostMediaDisplay post={enrichmentPost} gradient="linear-gradient(#000, #111)" />);

    const openButton = screen.getByRole('button', { name: /view full image/i });
    const feedImage = screen.getByRole('img', { name: /earth glows beyond the blue horizon/i });
    expect(feedImage).toHaveAttribute('src', nasaMediaUrl);
    expect(openButton).toContainElement(feedImage);

    await user.click(openButton);

    const dialog = screen.getByRole('dialog', { name: /full post image/i });
    expect(within(dialog).getByRole('link', { name: /open original/i })).toHaveAttribute('href', nasaMediaUrl);
    expect(screen.getByRole('img', { name: /full post image/i })).toHaveAttribute('src', nasaMediaUrl);
  });

  it('keeps uploaded images out of the gradient-backed hero and portals blurred contain-fit modal images', () => {
    const displaySource = readFileSync(resolve(__dirname, './components/PostMediaDisplay.tsx'), 'utf8');
    const lightboxSource = readFileSync(resolve(__dirname, './components/PostMediaLightbox.tsx'), 'utf8');
    const lightboxStyles = readFileSync(resolve(__dirname, './components/PostMediaLightbox.styles.ts'), 'utf8');

    expect(displaySource).toContain('<ImageMediaButton');
    expect(displaySource).toContain('<HeroArea $bgImage={null} $gradient={gradient} $hasImage={false}>');
    expect(displaySource).not.toContain('$bgImage={heroImage}');
    expect(lightboxSource).toContain('const safeSrc = sanitizeImageUrl(src);');
    expect(lightboxSource).toContain('cssUrlValue(safeSrc)');
    expect(lightboxSource).toContain('createPortal(');
    expect(lightboxSource).toContain('document.body');
    expect(lightboxSource).toContain('LightboxOpenLink href={safeSrc}');
    expect(lightboxStyles).toContain('background-image: var(--post-lightbox-backdrop-image);');
    expect(lightboxStyles).toContain('filter: blur(32px) saturate(1.22) brightness(0.58);');
    expect(lightboxStyles).toContain('object-fit: contain');
    expect(lightboxStyles).toContain('max-height: calc(92vh - 96px);');
  });
});
