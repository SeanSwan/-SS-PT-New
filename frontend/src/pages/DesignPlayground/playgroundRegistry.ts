/**
 * Design Studio parked-surface manifest.
 *
 * This is the only module allowed to import redesign implementations. Canonical public routes never consume
 * this registry; promotion happens by changing a real route import in a normal reviewed commit.
 */
import { createElement, type ComponentType } from 'react';

export type PlaygroundStatus = 'parked' | 'iterating' | 'approved';

export interface PlaygroundEntry {
  id: string;
  title: string;
  lazyImport: () => Promise<{ default: ComponentType }>;
  status: PlaygroundStatus;
  sourceRoute: string;
  mobbinRefs: string[];
  notes: string;
}

export const playgroundRegistry: PlaygroundEntry[] = [
  {
    id: 'home',
    title: 'Home vNext',
    lazyImport: () => import('../HomePage/v-next/HomeVNext'),
    status: 'parked',
    sourceRoute: '/',
    mobbinRefs: [],
    notes: 'Pre-Mobbin cinematic home exploration; harvest motion tiers, lens bindings, and token scope only.',
  },
  {
    id: 'store',
    title: 'Store V4',
    lazyImport: () => import('../shop/store-v4/StoreV4'),
    status: 'parked',
    sourceRoute: '/store',
    mobbinRefs: [],
    notes: 'Pre-Mobbin jeweler-case direction; preserve real catalog and cart bindings during future study.',
  },
  {
    id: 'about',
    title: 'About vNext',
    lazyImport: () => import('../about/v-next/AboutVNext'),
    status: 'parked',
    sourceRoute: '/about',
    mobbinRefs: [],
    notes: 'Pre-Mobbin brand-story experiment; retain animation tiers and accessible reduced-motion behavior.',
  },
  {
    id: 'contact',
    title: 'Contact vNext',
    lazyImport: () => import('../contactpage/vnext/ContactVNext'),
    status: 'parked',
    sourceRoute: '/contact',
    mobbinRefs: [],
    notes: 'Pre-Mobbin contact composition; preserve the canonical form contract when re-grounding.',
  },
  {
    id: 'video',
    title: 'Video Library vNext',
    lazyImport: () => import('../video-vnext/VideoLibraryVNext'),
    status: 'parked',
    sourceRoute: '/video-library',
    mobbinRefs: [],
    notes: 'Pre-Mobbin library shell; retain the V3 data hook and content-type behavior.',
  },
  {
    id: 'gallery',
    title: 'Gallery vNext',
    lazyImport: () => import('../gallery-vnext/GalleryVNext'),
    status: 'parked',
    sourceRoute: '/gallery',
    mobbinRefs: [],
    notes: 'Pre-Mobbin gallery study; money, credit, download, and passcode contracts remain protected.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard v2 shell',
    lazyImport: async () => {
      const module = await import('../../components/DashBoard/v2/shell/DashboardShell');
      return { default: () => createElement(module.default, { role: 'admin' }) };
    },
    status: 'parked',
    sourceRoute: '/dashboard/:role/*',
    mobbinRefs: [],
    notes: 'Pre-Mobbin density shell shown in admin mode; finance remains a dormant feature switch.',
  },
];

export const getPlaygroundEntry = (id: string | undefined): PlaygroundEntry | undefined =>
  playgroundRegistry.find((entry) => entry.id === id);