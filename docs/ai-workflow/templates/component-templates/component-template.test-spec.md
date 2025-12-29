# [Component Name] - Test Specification

**Component:** [Component Name]
**Created:** [Date]
**Last Updated:** [Date]
**Assigned To:** ChatGPT-5 (QA Engineer)

---

## 📋 OVERVIEW

This file documents ALL test scenarios for [Component Name].

**Coverage Targets:**
- **Unit Tests:** 90%+ coverage
- **Integration Tests:** 70%+ coverage of critical paths
- **E2E Tests:** 100% of user flows

---

## 🧪 UNIT TESTS (Target: 90%+ coverage)

### **Category 1: Rendering Tests**

**Purpose:** Verify component renders correctly in all states

#### **Test 1.1: Renders without crashing**
```typescript
it('renders without crashing', () => {
  render(<ComponentName />);
});
```

#### **Test 1.2: Renders loading state**
```typescript
it('renders loading state with skeleton UI', () => {
  render(<ComponentName isLoading={true} />);

  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  expect(screen.queryByTestId('component-content')).not.toBeInTheDocument();
});
```

#### **Test 1.3: Renders empty state**
```typescript
it('renders empty state when no data', () => {
  render(<ComponentName data={[]} />);

  expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add first/i })).toBeInTheDocument();
});
```

#### **Test 1.4: Renders error state**
```typescript
it('renders error state with retry button', () => {
  render(<ComponentName error="Failed to load data" />);

  expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

#### **Test 1.5: Renders success state with data**
```typescript
it('renders success state with data', () => {
  const mockData = [/* test data */];
  render(<ComponentName data={mockData} />);

  expect(screen.getByTestId('component-content')).toBeInTheDocument();
  expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
});
```

---

### **Category 2: Props Tests**

**Purpose:** Verify component accepts and uses props correctly

#### **Test 2.1: Accepts data prop**
```typescript
it('accepts data prop and renders it', () => {
  const mockData = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' }
  ];

  render(<ComponentName data={mockData} />);

  expect(screen.getByText('Item 1')).toBeInTheDocument();
  expect(screen.getByText('Item 2')).toBeInTheDocument();
});
```

#### **Test 2.2: Accepts callback props**
```typescript
it('calls onRefresh when refresh button clicked', () => {
  const handleRefresh = jest.fn();

  render(<ComponentName onRefresh={handleRefresh} />);

  fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

  expect(handleRefresh).toHaveBeenCalledTimes(1);
});
```

#### **Test 2.3: Accepts className prop for styling**
```typescript
it('applies custom className', () => {
  const { container } = render(<ComponentName className="custom-class" />);

  expect(container.firstChild).toHaveClass('custom-class');
});
```

---

### **Category 3: State Tests**

**Purpose:** Verify component state changes work correctly

#### **Test 3.1: Transitions from loading to success**
```typescript
it('transitions from loading to success when data loads', async () => {
  const { rerender } = render(<ComponentName isLoading={true} />);

  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

  rerender(<ComponentName isLoading={false} data={mockData} />);

  await waitFor(() => {
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('component-content')).toBeInTheDocument();
  });
});
```

#### **Test 3.2: Transitions from error to loading on retry**
```typescript
it('transitions from error to loading when retry clicked', async () => {
  const handleRetry = jest.fn();

  render(<ComponentName error="Failed" onRetry={handleRetry} />);

  fireEvent.click(screen.getByRole('button', { name: /retry/i }));

  expect(handleRetry).toHaveBeenCalled();
});
```

---

### **Category 4: Theme & Styling Tests**

**Purpose:** Verify Galaxy-Swan theme tokens are used (no hardcoded values)

#### **Test 4.1: Uses theme tokens for colors**
```typescript
it('uses Galaxy-Swan theme tokens for colors', () => {
  const { container } = render(
    <ThemeProvider theme={galaxySwanTheme}>
      <ComponentName />
    </ThemeProvider>
  );

  const element = container.firstChild;

  // Should NOT have hardcoded colors
  expect(element).not.toHaveStyle('background: #fff');
  expect(element).not.toHaveStyle('color: #000');

  // Should use theme tokens (check computed styles)
  const computedStyle = window.getComputedStyle(element);
  expect(computedStyle.background).toContain('rgba'); // Glass effect
});
```

#### **Test 4.2: Applies responsive breakpoints**
```typescript
it('applies responsive styles at mobile breakpoint', () => {
  global.innerWidth = 375; // iPhone size
  global.dispatchEvent(new Event('resize'));

  render(<ComponentName />);

  const element = screen.getByTestId('component-container');

  // Check mobile-specific styles
  expect(element).toHaveStyle('padding: 16px'); // Mobile padding
});
```

---

### **Category 5: Accessibility Tests**

**Purpose:** Verify WCAG 2.1 AA compliance

#### **Test 5.1: Has no accessibility violations (axe-core)**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<ComponentName data={mockData} />);

  const results = await axe(container);

  expect(results).toHaveNoViolations();
});
```

#### **Test 5.2: Has correct ARIA labels**
```typescript
it('has correct ARIA labels', () => {
  render(<ComponentName />);

  const button = screen.getByRole('button', { name: /refresh/i });

  expect(button).toHaveAttribute('aria-label', 'Refresh data');
});
```

#### **Test 5.3: Is keyboard navigable**
```typescript
it('is keyboard navigable', () => {
  render(<ComponentName />);

  const firstButton = screen.getAllByRole('button')[0];

  firstButton.focus();

  expect(firstButton).toHaveFocus();
  expect(firstButton).toHaveStyle('outline: 2px solid'); // Focus ring
});
```

---

### **Category 6: Performance Tests**

**Purpose:** Verify component meets performance targets

#### **Test 6.1: Renders quickly (<100ms)**
```typescript
it('renders in under 100ms', () => {
  const start = performance.now();

  render(<ComponentName data={mockData} />);

  const end = performance.now();
  const renderTime = end - start;

  expect(renderTime).toBeLessThan(100);
});
```

#### **Test 6.2: Doesn't cause layout shift**
```typescript
it('does not cause layout shift', () => {
  const { container } = render(<ComponentName />);

  const initialHeight = container.firstChild.clientHeight;

  // Simulate data loading
  rerender(<ComponentName data={mockData} />);

  const finalHeight = container.firstChild.clientHeight;

  // Height should stay stable (skeleton same height as content)
  expect(Math.abs(finalHeight - initialHeight)).toBeLessThan(10);
});
```

---

## 🔗 INTEGRATION TESTS (Target: 70%+ critical paths)

### **Test Suite 1: API Integration (with MSW)**

**Purpose:** Verify component integrates correctly with API

#### **Test 1.1: Fetches data on mount**
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/[resource]', (req, res, ctx) => {
    return res(ctx.json({ data: mockData }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('fetches data on mount', async () => {
  render(<ComponentName />);

  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
```

#### **Test 1.2: Handles API errors gracefully**
```typescript
it('shows error message when API fails', async () => {
  server.use(
    rest.get('/api/[resource]', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<ComponentName />);

  await waitFor(() => {
    expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
  });
});
```

#### **Test 1.3: Handles 404 (no data) gracefully**
```typescript
it('shows empty state when API returns 404', async () => {
  server.use(
    rest.get('/api/[resource]', (req, res, ctx) => {
      return res(ctx.status(404));
    })
  );

  render(<ComponentName />);

  await waitFor(() => {
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});
```

#### **Test 1.4: Retries on network error**
```typescript
it('retries API call when network error occurs', async () => {
  let callCount = 0;

  server.use(
    rest.get('/api/[resource]', (req, res, ctx) => {
      callCount++;
      if (callCount === 1) {
        return res.networkError('Network error');
      }
      return res(ctx.json({ data: mockData }));
    })
  );

  render(<ComponentName />);

  await waitFor(() => {
    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /retry/i }));

  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  expect(callCount).toBe(2); // Called twice (initial + retry)
});
```

---

### **Test Suite 2: Authentication Integration**

#### **Test 2.1: Redirects to login when unauthenticated**
```typescript
it('redirects to login when 401 received', async () => {
  const mockNavigate = jest.fn();
  jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
  }));

  server.use(
    rest.get('/api/[resource]', (req, res, ctx) => {
      return res(ctx.status(401));
    })
  );

  render(<ComponentName />);

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
```

---

## 🌐 END-TO-END TESTS (Target: 100% user flows)

### **Test Suite 1: Complete User Flow (Playwright)**

**Purpose:** Verify entire user journey works correctly

#### **Test 1.1: User loads component, sees data, refreshes**
```typescript
// tests/e2e/component-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user loads component and interacts with it', async ({ page }) => {
  // 1. Navigate to page
  await page.goto('https://swanstudios.com/[page]');

  // 2. Login (if required)
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');

  // 3. Wait for component to load
  await expect(page.locator('[data-testid="component-content"]')).toBeVisible();

  // 4. Verify data is displayed
  await expect(page.locator('text=Item 1')).toBeVisible();

  // 5. Click refresh button
  await page.click('[data-testid="refresh-button"]');

  // 6. Wait for refresh to complete
  await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();

  // 7. Verify data still displayed
  await expect(page.locator('text=Item 1')).toBeVisible();
});
```

#### **Test 1.2: Mobile user experience**
```typescript
test('mobile user can interact with component', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only test');

  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

  await page.goto('https://swanstudios.com/[page]');

  // Check mobile-specific layout
  const container = page.locator('[data-testid="component-container"]');
  const box = await container.boundingBox();

  // Verify full width on mobile
  expect(box?.width).toBeCloseTo(375, 10);

  // Verify touch targets are large enough (44x44px)
  const buttons = page.locator('button');
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const buttonBox = await button.boundingBox();

    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
  }
});
```

---

## ✅ TEST COVERAGE CHECKLIST

**Before marking this file as complete, verify:**

- [ ] All rendering states tested (loading, empty, error, success)
- [ ] All props tested (data, callbacks, styling)
- [ ] All state transitions tested (loading → success/error)
- [ ] All theme tokens tested (no hardcoded values)
- [ ] All accessibility tests passing (axe-core, ARIA, keyboard nav)
- [ ] All API integrations tested (success, error, 404, network error, auth)
- [ ] All user flows tested (E2E with Playwright)
- [ ] All mobile tests passing (responsive, touch targets)
- [ ] Coverage targets met (90% unit, 70% integration, 100% E2E)

---

## 📊 COVERAGE REPORT

**Run tests with coverage:**
```bash
npm run test:coverage
```

**Expected Output:**
```
File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
------------------------|---------|----------|---------|---------|------------------
ComponentName.tsx       |   92.50 |    87.50 |  100.00 |   92.30 | 45, 67
useComponentData.ts     |   95.00 |    90.00 |  100.00 |   95.00 | 23
ComponentHelpers.ts     |   88.00 |    80.00 |  100.00 |   88.00 | 12, 34, 56
------------------------|---------|----------|---------|---------|------------------
All files               |   91.83 |    85.83 |  100.00 |   91.76 |
```

**Target:** >90% overall coverage

---

## 🚀 RUNNING TESTS

**Unit Tests:**
```bash
npm run test:unit
```

**Integration Tests:**
```bash
npm run test:integration
```

**E2E Tests:**
```bash
npm run test:e2e
```

**All Tests:**
```bash
npm test
```

**Watch Mode (during development):**
```bash
npm run test:watch
```

---

## 📝 NOTES

**Assigned AI:** ChatGPT-5
**Review Status:** [ ] In Progress [ ] Complete [ ] Needs Revision
**Completion Date:** [Date]

**Test Strategy:**
- [Rationale for test approach]
- [Edge cases to focus on]
- [Performance considerations]

**Known Issues:**
- [Any testing challenges or limitations]
- [Flaky tests to watch out for]