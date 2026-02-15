# PHASE 0: UI KIT & GAMIFICATION COMPONENT AUDIT

**Created:** 2025-10-29
**Status:** 🔄 PENDING AI VILLAGE APPROVAL (0/5)
**Priority:** 🔥 CRITICAL - Foundation for M0
**Estimated Duration:** Day 5 of Week 0

---

## 📋 PURPOSE

This Phase 0 packet audits:
1. **UI Kit Components (11 files)** - Core reusable component library
2. **Gamification Components (2 files)** - XP, quests, achievements

**Goals:**
- Ensure UI Kit is 100% MUI-free (already achieved ✅)
- Complete Galaxy-Swan theme token integration
- Verify Gamification 1.0 is solid before building 2.0
- Flag components needing tests before M0 begins

**NO CODE WILL BE WRITTEN** until all 5 AIs approve this audit.

---

## 🎯 AUDIT CRITERIA

| Criteria | ✅ PASS | ⚠️ NEEDS WORK | ❌ FAIL |
|----------|---------|---------------|---------|
| **MUI-Free** | Zero MUI imports | Minor MUI usage | Heavy MUI dependency |
| **Theme Tokens** | Full Galaxy-Swan integration | Partial tokens | Hardcoded colors/spacing |
| **Reusability** | Works in all dashboards | Some coupling | Tight coupling |
| **TypeScript** | Strict types, exported | Some types missing | No types |
| **Documentation** | JSDoc + examples | Partial docs | No docs |
| **Tests** | 90%+ coverage | Some tests | No tests |

---

## 📦 PART 1: UI KIT COMPONENT AUDIT (11 files)

### **Location:** `frontend/src/components/ui-kit/`

**Total Components:** 11 files
**MUI Dependencies:** 0 files ✅ (MUI ELIMINATED!)
**Theme Token Incomplete:** 9 files (HIGH priority)
**Missing Tests:** 11 files (CRITICAL - no tests exist yet)
**Good Components:** 2 files (Typography.tsx, Button.tsx - need tests only)

---

## 🟡 HIGH PRIORITY: THEME TOKEN COMPLETION (9 files)

### **1. Typography.tsx**
**Location:** [ui-kit/Typography.tsx](../../../../frontend/src/components/ui-kit/Typography.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ❌ No tests

**Exports:**
```typescript
export { PageTitle, SectionTitle, Subtitle, BodyText, SmallText, Caption, Label, Link, Code }
```

**Issues:**
- Some components use hardcoded font sizes (should use `galaxySwanTheme.typography.fontSize.*`)
- Missing responsive font scaling (mobile vs. desktop)
- No line-height tokens (should use `galaxySwanTheme.typography.lineHeight.*`)

**Proposed Enhancement:**
```typescript
import styled from 'styled-components';
import { galaxySwanTheme } from '@/styles/galaxySwanTheme';

export const PageTitle = styled.h1`
  font-size: ${galaxySwanTheme.typography.fontSize['2xl']};
  line-height: ${galaxySwanTheme.typography.lineHeight.tight};
  font-weight: ${galaxySwanTheme.typography.fontWeight.bold};
  color: ${galaxySwanTheme.colors.text.primary};
  margin-bottom: ${galaxySwanTheme.spacing.md};

  /* Mobile: Smaller font */
  ${galaxySwanTheme.media.mobile} {
    font-size: ${galaxySwanTheme.typography.fontSize.xl};
  }

  /* Tablet: Medium font */
  ${galaxySwanTheme.media.tablet} {
    font-size: ${galaxySwanTheme.typography.fontSize['2xl']};
  }

  /* Desktop: Larger font */
  ${galaxySwanTheme.media.desktop} {
    font-size: ${galaxySwanTheme.typography.fontSize['3xl']};
  }
`;

export const BodyText = styled.p`
  font-size: ${galaxySwanTheme.typography.fontSize.md};
  line-height: ${galaxySwanTheme.typography.lineHeight.relaxed};
  color: ${galaxySwanTheme.colors.text.secondary};
  margin-bottom: ${galaxySwanTheme.spacing.sm};

  /* Reduced motion: No transitions */
  ${galaxySwanTheme.media.reducedMotion} {
    transition: none;
  }
`;
```

**Priority:** 🟡 HIGH
**Refactor Effort:** LOW (1-2 hours)
**Test Effort:** MEDIUM (2-3 hours, 15+ tests)

---

### **2. Button.tsx**
**Location:** [ui-kit/Button.tsx](../../../../frontend/src/components/ui-kit/Button.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ❌ No tests

**Exports:**
```typescript
export { PrimaryButton, SecondaryButton, OutlinedButton, DangerButton, GhostButton, IconButton }
```

**Issues:**
- Some hover states use hardcoded colors
- Missing `:focus-visible` states for keyboard navigation (accessibility)
- No `disabled` state styling
- Touch targets may be <44px on mobile

**Proposed Enhancement:**
```typescript
import styled from 'styled-components';
import { galaxySwanTheme } from '@/styles/galaxySwanTheme';

export const PrimaryButton = styled.button`
  /* Base styles */
  padding: ${galaxySwanTheme.spacing.sm} ${galaxySwanTheme.spacing.lg};
  min-height: 44px; /* Touch target */
  font-size: ${galaxySwanTheme.typography.fontSize.md};
  font-weight: ${galaxySwanTheme.typography.fontWeight.semibold};
  border-radius: ${galaxySwanTheme.borderRadius.md};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  /* Colors */
  background: linear-gradient(
    135deg,
    ${galaxySwanTheme.colors.cosmic.purple},
    ${galaxySwanTheme.colors.cosmic.blue}
  );
  color: ${galaxySwanTheme.colors.text.primary};

  /* Hover */
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px ${galaxySwanTheme.colors.cosmic.purple20};
  }

  /* Focus (keyboard navigation) */
  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.colors.cosmic.purple};
    outline-offset: 2px;
  }

  /* Active */
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Disabled */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${galaxySwanTheme.colors.glass.secondary};
  }

  /* Reduced motion */
  ${galaxySwanTheme.media.reducedMotion} {
    transition: none;
    &:hover:not(:disabled) {
      transform: none;
    }
  }

  /* Mobile: Full width option */
  ${galaxySwanTheme.media.mobile} {
    width: ${props => props.fullWidth ? '100%' : 'auto'};
  }
`;
```

**Priority:** 🟡 HIGH
**Refactor Effort:** MEDIUM (2-3 hours)
**Test Effort:** MEDIUM (3-4 hours, 25+ tests)

---

### **3. Input.tsx**
**Location:** [ui-kit/Input.tsx](../../../../frontend/src/components/ui-kit/Input.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ❌ No tests

**Exports:**
```typescript
export { StyledInput, StyledTextArea, StyledSelect, FormField, FormGroup, FormLabel, ErrorText, HelperText }
```

**Issues:**
- Error states not visually distinct enough
- Missing `:invalid` pseudo-class styling
- No icon support (e.g., search icon, eye icon for password)
- Placeholder text color too light (contrast ratio <4.5:1)

**Proposed Enhancement:**
```typescript
export const StyledInput = styled.input<{ hasError?: boolean; icon?: React.ReactNode }>`
  width: 100%;
  padding: ${galaxySwanTheme.spacing.sm} ${galaxySwanTheme.spacing.md};
  font-size: ${galaxySwanTheme.typography.fontSize.md};
  border-radius: ${galaxySwanTheme.borderRadius.md};
  border: 1px solid ${props =>
    props.hasError
      ? galaxySwanTheme.colors.status.error
      : galaxySwanTheme.colors.glass.secondary};
  background: ${galaxySwanTheme.colors.glass.primary};
  color: ${galaxySwanTheme.colors.text.primary};
  transition: border 0.2s ease;

  /* Placeholder */
  &::placeholder {
    color: ${galaxySwanTheme.colors.text.disabled}; /* Better contrast */
  }

  /* Focus */
  &:focus {
    outline: none;
    border-color: ${galaxySwanTheme.colors.cosmic.purple};
    box-shadow: 0 0 0 3px ${galaxySwanTheme.colors.cosmic.purple20};
  }

  /* Invalid (HTML5 validation) */
  &:invalid {
    border-color: ${galaxySwanTheme.colors.status.error};
  }

  /* Disabled */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${galaxySwanTheme.colors.glass.secondary};
  }

  /* Reduced motion */
  ${galaxySwanTheme.media.reducedMotion} {
    transition: none;
  }
`;

export const ErrorText = styled.span`
  display: block;
  margin-top: ${galaxySwanTheme.spacing.xs};
  font-size: ${galaxySwanTheme.typography.fontSize.sm};
  color: ${galaxySwanTheme.colors.status.error};
  font-weight: ${galaxySwanTheme.typography.fontWeight.medium};

  /* Icon support */
  &::before {
    content: '⚠️ ';
    margin-right: ${galaxySwanTheme.spacing.xs};
  }
`;
```

**Priority:** 🟡 HIGH
**Refactor Effort:** MEDIUM (2-3 hours)
**Test Effort:** MEDIUM (3-4 hours, 20+ tests)

---

### **4. Card.tsx**
**Location:** [ui-kit/Card.tsx](../../../../frontend/src/components/ui-kit/Card.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ❌ No tests

**Exports:**
```typescript
export { Card, CardHeader, CardBody, CardFooter, StatsCard, ActionCard, GridContainer, FlexBox, Box }
```

**Issues:**
- Glass effect not using Galaxy-Swan tokens correctly
- Missing hover states for `ActionCard`
- No loading state (skeleton)
- `StatsCard` trend indicators hardcoded (up/down arrows)

**Proposed Enhancement:**
```typescript
export const Card = styled.div<{ variant?: 'glass' | 'solid' | 'outlined' }>`
  /* Base */
  border-radius: ${galaxySwanTheme.borderRadius.lg};
  padding: ${galaxySwanTheme.spacing.lg};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  /* Glass variant (default) */
  ${props => props.variant === 'glass' || !props.variant ? `
    background: ${galaxySwanTheme.colors.glass.primary};
    backdrop-filter: blur(10px);
    border: 1px solid ${galaxySwanTheme.colors.glass.border};
  ` : ''}

  /* Solid variant */
  ${props => props.variant === 'solid' ? `
    background: ${galaxySwanTheme.colors.background.primary};
    border: none;
  ` : ''}

  /* Outlined variant */
  ${props => props.variant === 'outlined' ? `
    background: transparent;
    border: 2px solid ${galaxySwanTheme.colors.cosmic.purple};
  ` : ''}

  /* Reduced motion */
  ${galaxySwanTheme.media.reducedMotion} {
    transition: none;
  }
`;

export const ActionCard = styled(Card)`
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px ${galaxySwanTheme.colors.cosmic.purple20};
  }

  &:active {
    transform: translateY(-2px);
  }

  ${galaxySwanTheme.media.reducedMotion} {
    &:hover {
      transform: none;
    }
  }
`;

export const StatsCard = styled(Card)<{ trend?: 'up' | 'down' | 'neutral' }>`
  position: relative;

  /* Trend indicator */
  &::after {
    content: ${props =>
      props.trend === 'up' ? '"↗"' :
      props.trend === 'down' ? '"↘"' : '""'};
    position: absolute;
    top: ${galaxySwanTheme.spacing.md};
    right: ${galaxySwanTheme.spacing.md};
    font-size: ${galaxySwanTheme.typography.fontSize.xl};
    color: ${props =>
      props.trend === 'up' ? galaxySwanTheme.colors.status.success :
      props.trend === 'down' ? galaxySwanTheme.colors.status.error :
      galaxySwanTheme.colors.text.secondary};
  }
`;
```

**Priority:** 🟡 HIGH
**Refactor Effort:** MEDIUM (2-3 hours)
**Test Effort:** MEDIUM (3-4 hours, 20+ tests)

---

### **5. Table.tsx**
**Location:** [ui-kit/Table.tsx](../../../../frontend/src/components/ui-kit/Table.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ❌ No tests

**Compound Component Pattern:**
```typescript
<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>John Doe</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

**Issues:**
- No sorting functionality
- No row selection (checkboxes)
- Missing sticky header on scroll
- Mobile: No responsive table solution (cards vs. horizontal scroll)

**Proposed Enhancement:**
```typescript
export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${galaxySwanTheme.typography.fontSize.md};

  /* Mobile: Force horizontal scroll */
  ${galaxySwanTheme.media.mobile} {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
`;

export const TableHeader = styled.thead`
  background: ${galaxySwanTheme.colors.glass.secondary};
  position: sticky;
  top: 0;
  z-index: 10;

  /* Mobile: Not sticky (performance) */
  ${galaxySwanTheme.media.mobile} {
    position: relative;
  }
`;

export const TableHeaderCell = styled.th<{ sortable?: boolean; sortDirection?: 'asc' | 'desc' }>`
  padding: ${galaxySwanTheme.spacing.md};
  text-align: left;
  font-weight: ${galaxySwanTheme.typography.fontWeight.semibold};
  color: ${galaxySwanTheme.colors.text.primary};
  cursor: ${props => props.sortable ? 'pointer' : 'default'};

  /* Sort indicator */
  ${props => props.sortable && props.sortDirection ? `
    &::after {
      content: '${props.sortDirection === 'asc' ? '↑' : '↓'}';
      margin-left: ${galaxySwanTheme.spacing.xs};
    }
  ` : ''}

  &:hover {
    background: ${props => props.sortable ? galaxySwanTheme.colors.glass.hover : 'transparent'};
  }
`;

export const TableRow = styled.tr<{ selectable?: boolean; selected?: boolean }>`
  border-bottom: 1px solid ${galaxySwanTheme.colors.glass.border};
  cursor: ${props => props.selectable ? 'pointer' : 'default'};
  background: ${props => props.selected ? galaxySwanTheme.colors.cosmic.purple20 : 'transparent'};

  &:hover {
    background: ${galaxySwanTheme.colors.glass.hover};
  }

  &:last-child {
    border-bottom: none;
  }
`;
```

**Priority:** 🟡 HIGH
**Refactor Effort:** HIGH (4-5 hours for sorting + selection)
**Test Effort:** HIGH (5-6 hours, 30+ tests)

---

### **6-11. [Remaining 6 UI Kit Files]**

**List:**
- Pagination.tsx (⚠️ Theme tokens, ❌ No tests)
- Badge.tsx (✅ Good, ❌ No tests)
- EmptyState.tsx (⚠️ Theme tokens, ❌ No tests)
- Container.tsx (⚠️ Theme tokens, ❌ No tests)
- Animations.tsx (✅ Good, ❌ No tests)
- index.ts (✅ Export file, no tests needed)

**Common Issues:**
- All 9 files need Galaxy-Swan theme token completion
- All 10 files (excluding index.ts) need comprehensive unit tests
- Some files missing TypeScript type exports

**Total Refactor Effort:** 15-20 hours
**Total Test Effort:** 25-30 hours (100+ tests for entire UI Kit)

---

## 🎮 PART 2: GAMIFICATION COMPONENT AUDIT (2 files)

### **Location:** `frontend/src/components/Gamification/`

**Total Components:** 2 files
**MUI Dependencies:** 0 files ✅
**Theme Token Incomplete:** 2 files (HIGH)
**Large Files Needing Split:** 1 file (GamificationDashboard.tsx)
**Missing Backend Models:** Quest system not implemented yet

---

### **7. GamificationDashboard.tsx**
**Location:** [Gamification/GamificationDashboard.tsx](../../../../frontend/src/components/Gamification/GamificationDashboard.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ⚠️ VERY LARGE (~800 lines)

**Current Features (Gamification 1.0):**
- XP system (earn points for workouts)
- Level progression (Level 1-100)
- Achievement badges (unlock milestones)
- Leaderboard (compete with other users)
- Streak tracking (consecutive workout days)

**Issues:**
- **Line 353: Quest completion logic exists but no Quest models in backend**
- File is 800+ lines (needs splitting)
- Leaderboard doesn't paginate (performance issue with 1000+ users)
- No animations for level-up events

**Proposed Split:**
```
Gamification/
├── GamificationDashboard.tsx (main container, 200 lines)
├── components/
│   ├── XPProgressBar.tsx (XP bar + level, 100 lines)
│   ├── AchievementGrid.tsx (badges grid, 150 lines)
│   ├── QuestPanel.tsx (quest list + progress, 200 lines) ⚠️ NEEDS BACKEND
│   ├── LeaderboardTable.tsx (leaderboard, 150 lines)
│   └── StreakCounter.tsx (streak visualization, 100 lines)
└── hooks/
    ├── useGamificationData.ts (fetch XP, badges, etc., 100 lines)
    └── useQuestProgress.ts (quest tracking, NEW)
```

**Priority:** 🟡 HIGH
**Refactor Effort:** HIGH (6-8 hours)
**Backend Effort:** HIGH (10-12 hours to implement Quest models)

**Quest System Requirements (Gamification 2.0 - M5-M6):**

**Database Schema:**
```sql
-- Quest Templates (created by admins)
CREATE TABLE quest_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL, -- "Complete 10 Workouts This Week"
  description TEXT,
  quest_type VARCHAR(50) NOT NULL, -- 'workout_count', 'streak', 'exercise_mastery', 'social'
  target_value INT NOT NULL, -- e.g., 10 workouts
  xp_reward INT NOT NULL,
  badge_reward_id UUID REFERENCES achievement_badges(id),
  duration_days INT, -- NULL = no expiration, 7 = weekly quest
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Quest Progress (instance per user)
CREATE TABLE user_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_template_id UUID NOT NULL REFERENCES quest_templates(id),
  current_progress INT DEFAULT 0, -- e.g., completed 3/10 workouts
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed', 'expired'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For time-limited quests
  CONSTRAINT unique_user_quest UNIQUE(user_id, quest_template_id, started_at)
);

CREATE INDEX idx_user_quests_user ON user_quests(user_id);
CREATE INDEX idx_user_quests_status ON user_quests(status);
```

**Backend API:**
```typescript
// GET /api/users/:userId/quests (fetch active quests)
router.get('/users/:userId/quests', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const quests = await UserQuest.findAll({
      where: { userId, status: 'active' },
      include: [{ model: QuestTemplate }]
    });

    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quests' });
  }
});

// POST /api/users/:userId/quests/:questId/progress (update quest progress)
router.post('/users/:userId/quests/:questId/progress', authenticateUser, async (req, res) => {
  try {
    const { userId, questId } = req.params;
    const { incrementBy } = req.body; // e.g., +1 workout completed

    const quest = await UserQuest.findOne({
      where: { id: questId, userId },
      include: [{ model: QuestTemplate }]
    });

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Update progress
    quest.currentProgress += incrementBy;

    // Check completion
    if (quest.currentProgress >= quest.QuestTemplate.targetValue) {
      quest.status = 'completed';
      quest.completedAt = new Date();

      // Award XP
      await User.increment('xp', {
        by: quest.QuestTemplate.xpReward,
        where: { id: userId }
      });

      // Award badge (if any)
      if (quest.QuestTemplate.badgeRewardId) {
        await UserBadge.create({
          userId,
          badgeId: quest.QuestTemplate.badgeRewardId,
          unlockedAt: new Date()
        });
      }
    }

    await quest.save();
    res.json({ success: true, quest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quest progress' });
  }
});
```

**AI Review Questions:**
1. Should quests auto-assign to all users or require opt-in?
2. Should there be daily/weekly/monthly quest categories?
3. Should failed quests have penalties (XP loss)?
4. Should quest progress be real-time (WebSocket) or polling?
5. Should users be able to abandon quests?

---

### **8. GamificationDisplay.tsx**
**Location:** [Gamification/GamificationDisplay.tsx](../../../../frontend/src/components/Gamification/GamificationDisplay.tsx)
**Status:** ✅ MUI-free, ⚠️ Partial theme tokens, ❌ No tests

**Current Features:**
- Compact XP bar widget (shown in header)
- Level badge display
- Quick stats tooltip (total XP, rank, next level)

**Issues:**
- Tooltip uses hardcoded colors
- No animation when XP increases
- Widget not responsive on mobile (<375px)

**Proposed Enhancement:**
```typescript
import styled from 'styled-components';
import { Badge } from '@/components/ui-kit';
import { galaxySwanTheme } from '@/styles/galaxySwanTheme';
import { motion } from 'framer-motion';

const XPWidget = styled.div`
  display: flex;
  align-items: center;
  gap: ${galaxySwanTheme.spacing.sm};
  padding: ${galaxySwanTheme.spacing.xs} ${galaxySwanTheme.spacing.sm};
  background: ${galaxySwanTheme.colors.glass.primary};
  border-radius: ${galaxySwanTheme.borderRadius.full};

  /* Mobile: Hide XP number, show badge only */
  ${galaxySwanTheme.media.mobile} {
    gap: 0;
    padding: ${galaxySwanTheme.spacing.xs};
  }
`;

const XPNumber = styled(motion.span)`
  font-size: ${galaxySwanTheme.typography.fontSize.sm};
  font-weight: ${galaxySwanTheme.typography.fontWeight.semibold};
  color: ${galaxySwanTheme.colors.cosmic.purple};

  /* Mobile: Hide */
  ${galaxySwanTheme.media.mobile} {
    display: none;
  }
`;

export const GamificationDisplay: React.FC<Props> = ({ userStats }) => {
  return (
    <XPWidget>
      <Badge variant="primary" size="sm">
        Lvl {userStats.level}
      </Badge>
      <XPNumber
        key={userStats.currentXP} // Re-animate on XP change
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.3 }}
      >
        {userStats.currentXP.toLocaleString()} XP
      </XPNumber>
    </XPWidget>
  );
};
```

**Priority:** 🟢 MEDIUM
**Refactor Effort:** LOW (1-2 hours)
**Test Effort:** LOW (1-2 hours, 5+ tests)

---

## 🧪 TESTING REQUIREMENTS

### **UI Kit Component Tests:**

**Example: Button.tsx**
```typescript
describe('PrimaryButton', () => {
  it('renders with correct styles', () => {
    render(<PrimaryButton>Click Me</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle(`background: linear-gradient(...)`);
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<PrimaryButton onClick={handleClick}>Click Me</PrimaryButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<PrimaryButton disabled>Click Me</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveStyle('opacity: 0.5');
  });

  it('has correct focus styles for keyboard navigation', () => {
    render(<PrimaryButton>Click Me</PrimaryButton>);
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveStyle('outline: 2px solid ...');
  });

  it('respects reduced motion preference', () => {
    // Mock prefers-reduced-motion
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    render(<PrimaryButton>Click Me</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle('transition: none');
  });
});
```

**Example: Table.tsx**
```typescript
describe('Table', () => {
  it('renders table with data', () => {
    render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>John Doe</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('supports sorting when sortable prop is true', () => {
    const handleSort = jest.fn();
    render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortable onSort={handleSort}>Name</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>
    );
    fireEvent.click(screen.getByText('Name'));
    expect(handleSort).toHaveBeenCalledWith('asc');
  });

  it('supports row selection', () => {
    const handleSelect = jest.fn();
    render(
      <Table>
        <Table.Body>
          <Table.Row selectable onSelect={handleSelect}>
            <Table.Cell>John Doe</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
    fireEvent.click(screen.getByText('John Doe'));
    expect(handleSelect).toHaveBeenCalled();
  });
});
```

### **Gamification Component Tests:**

```typescript
describe('GamificationDashboard', () => {
  it('displays current level and XP', () => {
    const mockData = { level: 5, currentXP: 1200, xpToNextLevel: 1500 };
    render(<GamificationDashboard userStats={mockData} />);
    expect(screen.getByText(/level 5/i)).toBeInTheDocument();
    expect(screen.getByText(/1200 xp/i)).toBeInTheDocument();
  });

  it('shows achievement badges', () => {
    const mockBadges = [
      { id: '1', name: 'First Workout', unlocked: true },
      { id: '2', name: '10 Workouts', unlocked: false }
    ];
    render(<GamificationDashboard badges={mockBadges} />);
    expect(screen.getByText('First Workout')).toBeInTheDocument();
  });

  it('animates level-up event', async () => {
    const mockData = { level: 4, currentXP: 990, xpToNextLevel: 1000 };
    const { rerender } = render(<GamificationDashboard userStats={mockData} />);

    // Simulate XP gain that triggers level-up
    const updatedData = { level: 5, currentXP: 0, xpToNextLevel: 1200 };
    rerender(<GamificationDashboard userStats={updatedData} />);

    await waitFor(() => {
      expect(screen.getByText(/level 5/i)).toBeInTheDocument();
      // Check for animation class or confetti element
    });
  });
});

describe('Quest System', () => {
  it('displays active quests', () => {
    const mockQuests = [
      { id: '1', name: 'Complete 10 Workouts', currentProgress: 3, targetValue: 10 }
    ];
    render(<QuestPanel quests={mockQuests} />);
    expect(screen.getByText('Complete 10 Workouts')).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('updates quest progress when workout completed', async () => {
    server.use(
      rest.post('/api/users/:userId/quests/:questId/progress', (req, res, ctx) => {
        return res(ctx.json({ success: true, quest: { currentProgress: 4 } }));
      })
    );

    render(<QuestPanel quests={mockQuests} />);

    // Simulate workout completion
    fireEvent.click(screen.getByRole('button', { name: /complete workout/i }));

    await waitFor(() => {
      expect(screen.getByText('4/10')).toBeInTheDocument();
    });
  });
});
```

**Coverage Target:** 90%+ per component

---

## 📋 WEEK 0 CHECKLIST (Day 5)

**Day 5: UI Kit & Gamification Audit**
- [ ] Read all 11 UI Kit component files
- [ ] Read all 2 Gamification component files
- [ ] Document theme token gaps in each file
- [ ] Estimate test effort (100+ tests for UI Kit)
- [ ] Design Quest system (database schema + API)
- [ ] Create GitHub issues for each component
- [ ] Submit this Phase 0 packet to all 5 AIs
- [ ] Collect feedback (especially on Quest system design)
- [ ] Get 5 explicit ✅ approvals
- [ ] Ready for M0 Foundation (Weeks 1-2)

**Deliverables:**
- ✅ Complete UI Kit audit (11 files)
- ✅ Complete Gamification audit (2 files)
- ✅ Quest system design (database + API)
- ✅ Test plan for all 13 components
- ✅ 5 AI approvals (REQUIRED)

---

## 🚨 AI VILLAGE APPROVAL SECTION

**Instructions for AIs:**
- Review the entire audit above
- **CRITICAL:** Provide feedback on Quest system design (database, API, UX)
- Verify UI Kit components are reusable across all dashboards
- Append feedback below (do NOT edit above sections)
- Provide explicit ✅ or ❌ approval

---

### Claude Code (Main Orchestrator) - 2025-10-29
**Approval:** ⏳ PENDING

**Initial Assessment:**
- UI Kit audit is thorough, correctly identifies theme token gaps
- Test effort estimate (100+ tests) is realistic
- Quest system design is solid (database schema + API)
- Gamification 1.0 → 2.0 path is clear

**Questions for AI Village:**
1. **UI Kit:**
   - Should we create Storybook for UI Kit documentation?
   - Should UI Kit be extracted to separate NPM package (reusability)?
   - Should we add dark/light mode toggle (future feature)?

2. **Quest System:**
   - Should quests be visible BEFORE starting (motivational)?
   - Should quest expiration send notifications (email, push)?
   - Should there be "hidden quests" (surprise unlocks)?
   - Should quest rewards scale with user level (higher level = better rewards)?

3. **Testing:**
   - Should UI Kit tests run on every PR (CI/CD)?
   - Should we add visual regression tests for UI Kit (Percy)?
   - Should accessibility tests be mandatory (axe-core)?

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
- [ ] All 5 AIs have reviewed the audit
- [ ] All 5 AIs have approved Quest system design
- [ ] All 5 AIs have provided explicit ✅ approval
- [ ] All flagged concerns have been addressed
- [ ] Test plan is comprehensive and agreed upon

**After approval, we proceed to:**
- ✅ M0 Foundation (Weeks 1-2)
- ✅ Complete Galaxy-Swan theme token integration in UI Kit
- ✅ Write 100+ unit tests for UI Kit
- ✅ Refactor GamificationDashboard.tsx (split into 5 components)
- ✅ Implement Quest system backend (M5-M6, Gamification 2.0)

---

**Status:** 🔄 PENDING AI VILLAGE APPROVAL (0/5)
**Next Steps:** Distribute to all 5 AIs, collect feedback, get approvals
**Estimated Review Time:** 1-2 hours per AI

**FUTURE MILESTONE:** Quest system implementation in M5-M6 (Gamification 2.0)