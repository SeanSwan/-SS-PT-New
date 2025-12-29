# PHASE 0: COMPREHENSIVE TESTING STRATEGY

**Created:** 2025-10-29
**Status:** 🔄 PENDING AI VILLAGE APPROVAL (0/5)
**Priority:** 🔥 CRITICAL - Must Be Approved Before ANY Code Changes
**Estimated Duration:** Days 6-7 of Week 0

---

## 📋 PURPOSE

This Phase 0 packet defines the **COMPLETE testing strategy** for SwanStudios to ensure:
1. **Least amount of errors possible** (user's #1 concern)
2. 90%+ code coverage across frontend and backend
3. Pixel-perfect responsive design validation
4. Accessibility compliance (WCAG 2.1 AA)
5. Performance targets (Lighthouse >90, <2s load time)
6. Automated testing in CI/CD pipeline

**NO CODE WILL BE WRITTEN** until all 5 AIs approve this testing strategy.

---

## 🎯 TESTING PHILOSOPHY

### **Test Pyramid:**
```
      /\
     /  \  10% - E2E Tests (Critical User Flows)
    /    \
   /------\ 30% - Integration Tests (API + Component Integration)
  /        \
 /----------\ 60% - Unit Tests (Individual Functions + Components)
/            \
```

**Rationale:**
- **Unit tests** are fast, cheap, and catch most bugs early
- **Integration tests** verify components work together correctly
- **E2E tests** validate critical user journeys but are slow/expensive

---

## 🧪 TESTING TYPES (6 CATEGORIES)

### **1. UNIT TESTS (60% of test suite)**

**Goal:** Test individual functions and components in isolation
**Coverage Target:** 90%+ per file
**Tools:** Jest, React Testing Library
**Run Frequency:** On every file save (watch mode), on every commit

**What to Test:**
- Pure functions (utilities, helpers, hooks)
- Component rendering (props → output)
- Component state changes (user interactions)
- Edge cases (null, undefined, empty arrays)
- Error handling (try/catch, error boundaries)

**Example: Testing a Button Component**
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PrimaryButton } from '@/components/ui-kit/Button';
import { ThemeProvider } from 'styled-components';
import { galaxySwanTheme } from '@/styles/galaxySwanTheme';

describe('PrimaryButton', () => {
  const renderButton = (props = {}) => {
    return render(
      <ThemeProvider theme={galaxySwanTheme}>
        <PrimaryButton {...props}>Click Me</PrimaryButton>
      </ThemeProvider>
    );
  };

  it('renders with correct text', () => {
    renderButton();
    expect(screen.getByRole('button')).toHaveTextContent('Click Me');
  });

  it('uses Galaxy-Swan theme colors', () => {
    const { container } = renderButton();
    const button = container.firstChild;
    expect(button).toHaveStyle(`background: linear-gradient(...)`);
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    renderButton({ onClick: handleClick });
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    renderButton({ disabled: true });
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveStyle('opacity: 0.5');
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    renderButton({ onClick: handleClick, disabled: true });
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has correct focus styles for keyboard navigation', () => {
    renderButton();
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
    expect(button).toHaveStyle('outline: 2px solid ...');
  });

  it('respects reduced motion preference', () => {
    // Mock prefers-reduced-motion
    const matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMedia,
    });

    renderButton();
    const button = screen.getByRole('button');
    expect(button).toHaveStyle('transition: none');
  });

  it('applies fullWidth style on mobile', () => {
    renderButton({ fullWidth: true });
    const button = screen.getByRole('button');
    expect(button).toHaveStyle('width: 100%');
  });

  it('matches snapshot', () => {
    const { container } = renderButton();
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

**Coverage Report Example:**
```
File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------|---------|----------|---------|---------|-------------------
Button.tsx              |   95.23 |    90.00 |  100.00 |   95.00 | 45, 67
Typography.tsx          |   92.85 |    85.71 |  100.00 |   92.30 | 23, 56
Card.tsx                |   88.88 |    80.00 |  100.00 |   88.88 | 78, 92, 103
```

**Target:** >90% coverage for all categories

---

### **2. INTEGRATION TESTS (30% of test suite)**

**Goal:** Test components working together with real API calls (mocked)
**Coverage Target:** 70%+ of critical user flows
**Tools:** Jest, React Testing Library, MSW (Mock Service Worker)
**Run Frequency:** On every commit, on every PR

**What to Test:**
- API requests + responses (success, error, loading states)
- Component interactions (parent ↔ child communication)
- Data flow (fetch → render → update)
- Form submissions (validation → API → success/error)
- Authentication flows (login → redirect → protected routes)

**Example: Testing Admin Dashboard with API**
```typescript
// AdminDashboardView.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { AdminDashboardView } from './admin-dashboard-view';

// Setup MSW server
const server = setupServer(
  rest.get('/api/admin/system-health', (req, res, ctx) => {
    return res(
      ctx.json({
        cpu: 45,
        memory: 60,
        disk: 70,
        status: 'healthy',
      })
    );
  }),
  rest.get('/api/admin/users/stats', (req, res, ctx) => {
    return res(
      ctx.json({
        totalUsers: 1200,
        activeUsers: 850,
        newUsersToday: 12,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('AdminDashboardView Integration', () => {
  it('loads and displays system health data', async () => {
    render(<AdminDashboardView />);

    // Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/cpu: 45%/i)).toBeInTheDocument();
      expect(screen.getByText(/memory: 60%/i)).toBeInTheDocument();
      expect(screen.getByText(/disk: 70%/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Override with error response
    server.use(
      rest.get('/api/admin/system-health', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    render(<AdminDashboardView />);

    await waitFor(() => {
      expect(screen.getByText(/error loading system health/i)).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button clicked', async () => {
    let callCount = 0;
    server.use(
      rest.get('/api/admin/system-health', (req, res, ctx) => {
        callCount++;
        return res(ctx.json({ cpu: 45 + callCount, memory: 60, disk: 70 }));
      })
    );

    render(<AdminDashboardView />);

    await waitFor(() => {
      expect(screen.getByText(/cpu: 46%/i)).toBeInTheDocument();
    });

    // Click refresh
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(screen.getByText(/cpu: 47%/i)).toBeInTheDocument();
    });
  });

  it('displays user stats alongside system health', async () => {
    render(<AdminDashboardView />);

    await waitFor(() => {
      expect(screen.getByText(/1200/i)).toBeInTheDocument(); // Total users
      expect(screen.getByText(/850/i)).toBeInTheDocument(); // Active users
    });
  });

  it('handles concurrent API requests correctly', async () => {
    render(<AdminDashboardView />);

    // Both requests should complete
    await waitFor(() => {
      expect(screen.getByText(/cpu: 45%/i)).toBeInTheDocument(); // System health
      expect(screen.getByText(/1200/i)).toBeInTheDocument(); // User stats
    });
  });
});
```

**MSW Setup (setupTests.ts):**
```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

**MSW Handlers (src/mocks/handlers.ts):**
```typescript
import { rest } from 'msw';

export const handlers = [
  // Auth
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({ token: 'fake-jwt-token', user: { id: '1', name: 'Test User' } }));
  }),

  // Admin
  rest.get('/api/admin/system-health', (req, res, ctx) => {
    return res(ctx.json({ cpu: 45, memory: 60, disk: 70 }));
  }),

  // Client
  rest.get('/api/users/:userId/dashboard', (req, res, ctx) => {
    return res(ctx.json({ user: { name: 'John Doe' }, workouts: [] }));
  }),
];
```

**Target:** 70%+ coverage of API interactions

---

### **3. E2E TESTS (10% of test suite)**

**Goal:** Test critical user journeys from start to finish
**Coverage Target:** 100% of critical paths (login, workout completion, payment)
**Tools:** Playwright (or Cypress)
**Run Frequency:** On every PR, nightly builds

**What to Test:**
- User authentication (login, logout, session persistence)
- Workout completion flow (start → complete exercises → save)
- Payment flow (select package → checkout → confirmation)
- Admin operations (create user, edit workout, view analytics)
- Constellation persistence (complete workout → verify star added → refresh → verify persisted)

**Example: Playwright E2E Test**
```typescript
// tests/e2e/client-workout-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Client Workout Flow', () => {
  test('client logs in, completes workout, sees constellation update', async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto('https://swanstudios.com');

    // 2. Login
    await page.fill('[data-testid="email-input"]', 'client@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // 3. Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Welcome back');

    // 4. Verify constellation visible (initial state)
    const initialStarCount = await page.locator('[data-testid="constellation-svg"] circle').count();
    expect(initialStarCount).toBeGreaterThanOrEqual(0);

    // 5. Start workout
    await page.click('[data-testid="start-workout-button"]');
    await expect(page).toHaveURL(/.*workout/);

    // 6. Complete first exercise
    await page.click('[data-testid="exercise-1-complete"]');
    await expect(page.locator('[data-testid="exercise-1-status"]')).toHaveText('Completed');

    // 7. Complete second exercise
    await page.click('[data-testid="exercise-2-complete"]');

    // 8. Finish workout
    await page.click('[data-testid="finish-workout-button"]');

    // 9. Verify success message
    await expect(page.locator('[data-testid="workout-complete-message"]')).toBeVisible();

    // 10. Return to dashboard
    await page.click('[data-testid="back-to-dashboard"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 11. Verify constellation updated (new star)
    const updatedStarCount = await page.locator('[data-testid="constellation-svg"] circle').count();
    expect(updatedStarCount).toBe(initialStarCount + 1);

    // 12. CRITICAL: Refresh page - constellation should persist
    await page.reload();
    const persistedStarCount = await page.locator('[data-testid="constellation-svg"] circle').count();
    expect(persistedStarCount).toBe(updatedStarCount); // Same as before refresh!

    // 13. Verify XP increased
    const xpElement = await page.locator('[data-testid="user-xp"]');
    const xpText = await xpElement.textContent();
    expect(parseInt(xpText!)).toBeGreaterThan(0);
  });

  test('client can share constellation publicly', async ({ page, context }) => {
    await page.goto('https://swanstudios.com/dashboard');

    // Login
    await page.fill('[data-testid="email-input"]', 'client@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Open constellation sharing settings
    await page.click('[data-testid="constellation-share-button"]');
    await page.check('[data-testid="make-public-checkbox"]');
    await page.click('[data-testid="generate-share-link"]');

    // Copy share link
    const shareLink = await page.locator('[data-testid="share-link"]').textContent();
    expect(shareLink).toContain('/constellation/');

    // Open share link in new tab (unauthenticated)
    const newPage = await context.newPage();
    await newPage.goto(shareLink!);

    // Verify constellation visible without login
    await expect(newPage.locator('[data-testid="constellation-svg"]')).toBeVisible();
    const starCount = await newPage.locator('[data-testid="constellation-svg"] circle').count();
    expect(starCount).toBeGreaterThan(0);
  });
});

test.describe('Admin Operations', () => {
  test('admin creates new client and assigns workout', async ({ page }) => {
    await page.goto('https://swanstudios.com/admin');

    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@swanstudios.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    // Navigate to user management
    await page.click('[data-testid="user-management-link"]');

    // Create new user
    await page.click('[data-testid="create-user-button"]');
    await page.fill('[data-testid="user-name-input"]', 'New Client');
    await page.fill('[data-testid="user-email-input"]', 'newclient@test.com');
    await page.click('[data-testid="submit-user-button"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('User created');

    // Assign workout
    await page.click('[data-testid="assign-workout-button"]');
    await page.selectOption('[data-testid="workout-select"]', 'Upper Body Strength');
    await page.click('[data-testid="confirm-assignment"]');

    // Verify assignment
    await expect(page.locator('[data-testid="assigned-workout"]')).toContainText('Upper Body Strength');
  });
});

test.describe('Payment Flow', () => {
  test('client completes Stripe checkout', async ({ page }) => {
    await page.goto('https://swanstudios.com/shop');

    // Select package
    await page.click('[data-testid="package-10-sessions"]');
    await page.click('[data-testid="buy-now-button"]');

    // Verify redirected to Stripe Checkout
    await expect(page).toHaveURL(/.*checkout.stripe.com.*/);

    // Fill Stripe test card (in test mode)
    await page.fill('[data-testid="cardNumber"]', '4242424242424242');
    await page.fill('[data-testid="cardExpiry"]', '12/34');
    await page.fill('[data-testid="cardCvc"]', '123');
    await page.fill('[data-testid="billingName"]', 'Test User');

    // Submit payment
    await page.click('[data-testid="submitButton"]');

    // Verify redirected to success page
    await expect(page).toHaveURL(/.*success/);
    await expect(page.locator('h1')).toContainText('Payment Successful');
  });
});
```

**Playwright Config (playwright.config.ts):**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000', // Local dev
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Target:** 100% of critical paths tested

---

### **4. VISUAL REGRESSION TESTS**

**Goal:** Catch unintended UI changes (pixel-perfect validation)
**Tools:** Percy (or Chromatic) + Storybook
**Run Frequency:** On every PR

**What to Test:**
- Component snapshots (all variants, all states)
- Responsive breakpoints (mobile, tablet, desktop)
- Theme variations (if applicable)
- Dark mode (if implemented)

**Setup:**

1. **Install Percy:**
```bash
npm install --save-dev @percy/cli @percy/storybook
```

2. **Create Storybook Stories:**
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { PrimaryButton, SecondaryButton, DangerButton } from './Button';

const meta: Meta<typeof PrimaryButton> = {
  title: 'UI Kit/Button',
  component: PrimaryButton,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <PrimaryButton>Primary</PrimaryButton>
      <SecondaryButton>Secondary</SecondaryButton>
      <DangerButton>Danger</DangerButton>
    </div>
  ),
};
```

3. **Run Percy:**
```bash
# Local testing
npx percy storybook http://localhost:6006

# CI/CD (GitHub Actions)
- name: Run Percy
  run: npx percy storybook http://localhost:6006
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

4. **Review Visual Diffs:**
Percy will capture screenshots and compare against baseline. Any pixel differences will be flagged for review.

**Target:** 100% of UI Kit components + critical dashboards

---

### **5. ACCESSIBILITY TESTS**

**Goal:** Ensure WCAG 2.1 AA compliance
**Tools:** axe-core, jest-axe, Lighthouse
**Run Frequency:** On every commit, on every PR

**What to Test:**
- Contrast ratios (≥4.5:1 for text, ≥3:1 for large text)
- Keyboard navigation (tab order, focus indicators)
- Screen reader support (ARIA labels, semantic HTML)
- Form validation (error messages, labels)
- Touch targets (≥44x44px)

**Setup:**

1. **Install jest-axe:**
```bash
npm install --save-dev jest-axe
```

2. **Write Accessibility Tests:**
```typescript
// Button.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PrimaryButton } from './Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<PrimaryButton>Click Me</PrimaryButton>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has sufficient color contrast', async () => {
    const { container } = render(<PrimaryButton>Click Me</PrimaryButton>);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('is keyboard navigable', () => {
    const { getByRole } = render(<PrimaryButton>Click Me</PrimaryButton>);
    const button = getByRole('button');

    button.focus();
    expect(button).toHaveFocus();

    // Verify focus styles are visible
    expect(button).toHaveStyle('outline: 2px solid ...');
  });

  it('has correct ARIA attributes when disabled', () => {
    const { getByRole } = render(<PrimaryButton disabled>Click Me</PrimaryButton>);
    const button = getByRole('button');

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeDisabled();
  });
});
```

3. **Lighthouse CI:**
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/dashboard
          uploadArtifacts: true
          temporaryPublicStorage: true
```

**Lighthouse Thresholds:**
```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

**Target:** 100% WCAG 2.1 AA compliance, Lighthouse accessibility score >90

---

### **6. PERFORMANCE TESTS**

**Goal:** Ensure fast load times and smooth interactions
**Metrics:** Lighthouse, Core Web Vitals, bundle size
**Run Frequency:** On every PR, nightly builds

**What to Test:**
- Page load time (<2s)
- Time to Interactive (TTI <3s)
- First Contentful Paint (FCP <1.5s)
- Largest Contentful Paint (LCP <2.5s)
- Cumulative Layout Shift (CLS <0.1)
- Bundle size (<200KB gzipped for main bundle)

**Setup:**

1. **Bundle Size Tracking:**
```bash
npm install --save-dev @next/bundle-analyzer
```

2. **Performance Budget (package.json):**
```json
{
  "performance": {
    "maxBundleSize": "200kb",
    "maxImageSize": "100kb",
    "maxAssetSize": "50kb"
  }
}
```

3. **Performance Tests:**
```typescript
// performance.test.ts
describe('Performance', () => {
  it('main bundle is under 200KB', () => {
    const bundleStats = require('../dist/stats.json');
    const mainBundleSize = bundleStats.assets.find(a => a.name === 'main.js').size;
    expect(mainBundleSize).toBeLessThan(200 * 1024); // 200KB
  });

  it('images are optimized', async () => {
    const images = await glob('public/images/**/*.{jpg,png,webp}');
    for (const img of images) {
      const size = fs.statSync(img).size;
      expect(size).toBeLessThan(100 * 1024); // 100KB
    }
  });

  it('dashboard loads in under 2 seconds', async () => {
    const start = Date.now();
    await page.goto('https://swanstudios.com/dashboard');
    await page.waitForLoadState('load');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });
});
```

**Target:** Lighthouse >90, all bundles <200KB

---

## 🔧 TESTING INFRASTRUCTURE

### **Jest Configuration (jest.config.js):**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/index.tsx',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
  ],
};
```

### **Test File Structure:**
```
src/
├── components/
│   ├── ui-kit/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx              # Unit tests
│   │   ├── Button.integration.test.tsx  # Integration tests
│   │   ├── Button.a11y.test.tsx         # Accessibility tests
│   │   └── Button.stories.tsx           # Storybook (visual tests)
│   └── ClientDashboard/
│       ├── RevolutionaryClientDashboard.tsx
│       └── RevolutionaryClientDashboard.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
├── utils/
│   ├── validators.ts
│   └── validators.test.ts
└── mocks/
    ├── server.ts                        # MSW server
    └── handlers.ts                      # MSW handlers
```

### **CI/CD Pipeline (GitHub Actions):**
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run storybook:build
      - run: npx percy storybook ./storybook-static
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:a11y
      - run: npx lighthouse-ci autorun

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run analyze:bundle
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=\\.test\\.tsx?$",
    "test:integration": "jest --testPathPattern=\\.integration\\.test\\.tsx?$",
    "test:e2e": "playwright test",
    "test:a11y": "jest --testPathPattern=\\.a11y\\.test\\.tsx?$",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build"
  }
}
```

---

## 📋 WEEK 0 CHECKLIST (Days 6-7)

**Day 6: Testing Infrastructure Setup**
- [ ] Install all testing libraries (Jest, RTL, MSW, Playwright, axe-core, Percy)
- [ ] Configure Jest (jest.config.js, setupTests.ts)
- [ ] Configure Playwright (playwright.config.ts)
- [ ] Set up MSW server and handlers
- [ ] Create Storybook configuration
- [ ] Configure CI/CD pipeline (GitHub Actions)
- [ ] Set coverage thresholds (90%+)
- [ ] Create test file structure guidelines

**Day 7: AI Village Review**
- [ ] Submit this Phase 0 packet to all 5 AIs
- [ ] Collect feedback on testing strategy
- [ ] Verify coverage targets are achievable
- [ ] Resolve disagreements on test types/tools
- [ ] Get 5 explicit ✅ approvals
- [ ] Ready for M0 Foundation (Weeks 1-2)

**Deliverables:**
- ✅ Complete testing strategy (6 test types)
- ✅ Testing infrastructure setup guide
- ✅ CI/CD pipeline configuration
- ✅ Coverage targets defined (90%+)
- ✅ 5 AI approvals (REQUIRED)

---

## 🚨 AI VILLAGE APPROVAL SECTION

**Instructions for AIs:**
- Review the entire testing strategy above
- **CRITICAL:** Verify coverage targets are realistic (90%+)
- Ensure all 6 test types are necessary (not over-engineering)
- Append feedback below (do NOT edit above sections)
- Provide explicit ✅ or ❌ approval

---

### Claude Code (Main Orchestrator) - 2025-10-29
**Approval:** ⏳ PENDING

**Initial Assessment:**
- Testing strategy is comprehensive and addresses user's concern ("least errors possible")
- 90% coverage target is achievable but ambitious
- Test pyramid (60/30/10) is industry best practice
- CI/CD integration ensures tests run automatically

**Questions for AI Village:**
1. **Coverage Targets:**
   - Is 90% too high (may slow development)?
   - Should we start at 70% and increase gradually?
   - Should coverage be enforced per-PR (block merge if <90%)?

2. **Testing Tools:**
   - Percy vs. Chromatic for visual regression? (Percy chosen, but open to feedback)
   - Playwright vs. Cypress for E2E? (Playwright chosen for multi-browser support)
   - Should we add mutation testing (Stryker)?

3. **Performance:**
   - Is <2s load time achievable with current tech stack?
   - Should we implement code splitting (React.lazy)?
   - Should we use CDN for static assets?

4. **Accessibility:**
   - Is WCAG 2.1 AA sufficient or should we target AAA?
   - Should we test with real screen readers (NVDA, JAWS)?

5. **Test Writing:**
   - Should we write tests BEFORE code (TDD)?
   - Should all PRs require tests (enforced in CI)?

**Waiting for:** Roo Code, Gemini, ChatGPT-5, Claude Desktop reviews

---

### Roo Code (Primary Coder) - [Pending]
**Approval:** ⏳ PENDING

---

### Gemini (Frontend Specialist) - [Pending]
**Approval:** ⏳ PENDING

---

### ChatGPT-5 (QA Engineer) - [Pending]
**Approval:** ⏳ PENDING

---

### Claude Desktop (Deployment Monitor) - [Pending]
**Approval:** ⏳ PENDING

---

## 🎯 SUCCESS CRITERIA

**This Phase 0 packet is approved when:**
- [ ] All 5 AIs have reviewed the testing strategy
- [ ] All 5 AIs agree on coverage targets (90%+)
- [ ] All 5 AIs agree on test types (6 categories)
- [ ] All 5 AIs agree on tooling (Jest, Playwright, Percy, axe-core)
- [ ] All 5 AIs have provided explicit ✅ approval
- [ ] All flagged concerns have been addressed

**After approval, we proceed to:**
- ✅ Day 6: Set up testing infrastructure (Jest, Playwright, MSW, Percy)
- ✅ Day 7: Configure CI/CD pipeline (GitHub Actions)
- ✅ Weeks 1-2 (M0): Write 100+ tests for refactored components
- ✅ M1-M9: Maintain 90%+ coverage for all new features

---

**Status:** 🔄 PENDING AI VILLAGE APPROVAL (0/5)
**Next Steps:** Distribute to all 5 AIs, collect feedback, get approvals
**Estimated Review Time:** 2-3 hours per AI

**CRITICAL:** This testing strategy is FOUNDATIONAL - all future code must follow these standards to ensure "least errors possible" (user's #1 goal)