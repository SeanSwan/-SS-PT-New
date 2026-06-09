/**
 * Responsive client-card smoke fixtures.
 *
 * Purpose: centralizes local-only QA users, API mocks, and DOM layout probes for
 * the admin/trainer client card mobile matrix.
 * Privacy: all identities use swanstudios.local test data; no production PII.
 * Verification: imported by client-card-responsive-smoke.spec.ts for overlap,
 * touch-target, horizontal-scroll, and mobile fixed-overlay assertions.
 */
import type { Page, Route } from '@playwright/test';

export const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

export const trainerUser = {
  id: 7,
  email: 'qa.trainer@swanstudios.local',
  username: 'qa_trainer',
  firstName: 'QA',
  lastName: 'Trainer',
  role: 'trainer',
  isActive: true,
};

const stressClient = {
  id: 501,
  firstName: 'Alexandria-Cassandra',
  lastName: 'Van Der Performance-Rebuild',
  email: 'alexandria.measurements.biometrics.programs@swanstudios.local',
  phone: '+1 555 010 2219',
  clientSource: 'swanstudios',
  isActive: true,
  availableSessions: 12,
  totalWorkouts: 47,
  fitnessGoal: 'Programs, biometrics, measurements, and strength rebuild tracked without cramped mobile overlap.',
  trainingExperience: 'advanced return-to-training',
  onboardingPct: 86,
  onboardingCompletionPercentage: 86,
  membershipLevel: 'elite',
  createdAt: '2026-05-01T12:00:00.000Z',
  joinDate: '2026-05-01T12:00:00.000Z',
  lastWorkoutDate: '2026-06-05T12:00:00.000Z',
  nextSessionDate: '2026-06-12T12:00:00.000Z',
};

const secondClient = {
  id: 502,
  firstName: 'Jordan',
  lastName: 'Mobility',
  email: 'jordan.mobility@swanstudios.local',
  phone: null,
  clientSource: 'move_fitness',
  isActive: true,
  availableSessions: 0,
  totalWorkouts: 3,
  fitnessGoal: 'Rebuild conditioning and keep plan accountability visible.',
  trainingExperience: 'returning',
  onboardingPct: 100,
  membershipLevel: 'premium',
  createdAt: '2026-05-02T12:00:00.000Z',
};

export const responsiveViewports = [
  { name: 'phone', width: 414, height: 896 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'qhd', width: 2560, height: 1440 },
  { name: '4k', width: 3840, height: 2160 },
] as const;

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function seedAuth(page: Page, user: typeof adminUser | typeof trainerUser) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: user },
  );
}

export async function mockSharedApi(page: Page, user: typeof adminUser | typeof trainerUser) {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user });
    if (endpoint === '/api/admin/clients') {
      return fulfillJson(route, { success: true, data: { clients: [stressClient, secondClient] } });
    }
    if (endpoint === '/api/admin/clients/501') {
      return fulfillJson(route, { success: true, data: { client: stressClient } });
    }
    if (endpoint === '/api/admin/clients/activation-queue') {
      return fulfillJson(route, {
        success: true,
        data: {
          queue: [],
          summary: {
            total: 0,
            needsWaiver: 0,
            needsOnboarding: 0,
            awaitingSessionAllocation: 0,
            readyToSchedule: 0,
            byNextStep: {},
          },
        },
      });
    }
    if (endpoint === '/api/client-trainer-assignments/trainer/7') {
      return fulfillJson(route, {
        success: true,
        totalClients: 2,
        assignments: [
          { id: 9001, trainerId: 7, status: 'active', assignedAt: '2026-05-22T12:00:00.000Z', client: stressClient },
          { id: 9002, trainerId: 7, status: 'active', assignedAt: '2026-05-23T12:00:00.000Z', client: secondClient },
        ],
      });
    }
    if (endpoint === '/api/sessions/history/501') {
      return fulfillJson(route, [{ id: 1, status: 'completed', sessionDate: '2026-06-05T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/history/502') {
      return fulfillJson(route, [{ id: 2, status: 'completed', sessionDate: '2026-06-01T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/upcoming/501') {
      return fulfillJson(route, [{ id: 3, status: 'scheduled', sessionDate: '2026-06-12T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/upcoming/502') return fulfillJson(route, []);
    if (endpoint === '/api/measurements/user/501/latest') {
      return fulfillJson(route, {
        id: 7001,
        userId: 501,
        measurementDate: '2026-06-01',
        weight: 172,
        bodyFatPercentage: 18,
        muscleMassPercentage: 42,
        weightUnit: 'lbs',
        circumferenceUnit: 'inches',
      });
    }
    if (endpoint === '/api/measurements/user/501/stats') {
      return fulfillJson(route, { success: true, data: { totalMeasurements: 1, latestWeight: 172 } });
    }
    if (endpoint === '/api/measurements/user/501') {
      return fulfillJson(route, { success: true, data: { measurements: [{ id: 7001, measurementDate: '2026-06-01', weight: 172 }] } });
    }
    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

export async function inspectCardLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: Element) =>
      element.getAttribute('aria-label')
      || element.getAttribute('data-swan-card-section')
      || element.getAttribute('data-swan-client-card')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const overlapArea = (a: DOMRect, b: DOMRect) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    );
    const checkGroup = (group: Element) => {
      const groupRect = group.getBoundingClientRect();
      const children = Array.from(group.children).filter(visible);
      children.forEach((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.left < groupRect.left - 1 || rect.right > groupRect.right + 1) {
          issues.push(`${labelFor(child)} escapes ${labelFor(group)} horizontally`);
        }
      });
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          if (overlapArea(children[i].getBoundingClientRect(), children[j].getBoundingClientRect()) > 1) {
            issues.push(`${labelFor(children[i])} overlaps ${labelFor(children[j])} in ${labelFor(group)}`);
          }
        }
      }
    };

    document.querySelectorAll('[data-swan-client-card], [data-swan-card-section]').forEach((element) => {
      if (visible(element)) checkGroup(element);
    });
    document.querySelectorAll('[data-swan-client-card] button').forEach((button) => {
      if (!visible(button)) return;
      const rect = button.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        issues.push(`${labelFor(button)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}

export async function inspectClientDetailLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: HTMLElement) =>
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const tabBar = document.querySelector<HTMLElement>('[role="tablist"][aria-label="Client detail tabs"]');
    const isScrollable = (value: string) => value === 'auto' || value === 'scroll';

    if (!tabBar) {
      issues.push('missing client detail tablist');
    } else {
      const barRect = tabBar.getBoundingClientRect();
      const canScrollX = isScrollable(window.getComputedStyle(tabBar).overflowX);
      if (tabBar.scrollWidth > tabBar.clientWidth + 2 && !canScrollX) {
        issues.push(`client detail tabs clip ${tabBar.scrollWidth}px into ${tabBar.clientWidth}px`);
      }
      if (window.innerWidth <= 768 && tabBar.scrollWidth > tabBar.clientWidth + 2) {
        issues.push(`mobile client detail tabs require horizontal scroll ${tabBar.scrollWidth}px into ${tabBar.clientWidth}px`);
      }
      Array.from(tabBar.querySelectorAll<HTMLElement>('[role="tab"]')).forEach((tab) => {
        const rect = tab.getBoundingClientRect();
        const label = tab.textContent?.trim().replace(/\s+/g, ' ') || tab.id;
        const labelElement = tab.querySelector<HTMLElement>('span');
        if (rect.height < 43) issues.push(`${label} tab touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        if (!canScrollX && (rect.left < barRect.left - 1 || rect.right > barRect.right + 1)) {
          issues.push(`${label} tab escapes the visible tab bar`);
        }
        if (window.innerWidth <= 768 && labelElement) {
          const labelStyle = window.getComputedStyle(labelElement);
          const lineHeight = Number.parseFloat(labelStyle.lineHeight || '0');
          if (lineHeight > 0 && labelElement.getBoundingClientRect().height > lineHeight * 1.35) {
            issues.push(`${label} tab label wraps on mobile`);
          }
        }
      });
    }

    Array.from(document.querySelectorAll<HTMLElement>('body *')).forEach((control) => {
      if (window.innerWidth > 768 || !visible(control)) return;
      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      const bottomInset = window.innerHeight - rect.bottom;
      const rightInset = window.innerWidth - rect.right;
      const compactOverlay = rect.width <= 140 && rect.height <= 140;
      if (style.position === 'fixed' && compactOverlay && bottomInset <= 140 && rightInset <= 120) {
        issues.push(`mobile fixed control overlaps client detail surface: ${labelFor(control)}`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}

export function collectUnexpectedConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

export const isKnownConsoleNoise = (message: string) => (
  /preloaded using link preload/i.test(message)
  || /^Failed to load resource: the server responded with a status of 400 \(Bad Request\)$/.test(message)
);
