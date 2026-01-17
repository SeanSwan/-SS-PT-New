# Gemini Phase 1.3 UX/UI Implementation Prompt
**Date:** 2026-01-16
**Phase:** 1.3 - UX/UI Protocol Optimization
**Approved By:** User + Claude Code
**Reference:** `docs/ai-workflow/blueprints/UX-UI-DESIGN-PROTOCOL.md`

---

## Context

You previously conducted a UI/UX audit of the SwanStudios platform and provided excellent recommendations. Those recommendations have been approved and incorporated into our permanent design protocol. **You are now authorized to implement the P0 and P1 changes you suggested.**

---

## Your Mission

Implement the UX/UI improvements you recommended in your audit, following the **priority order** (P0 → P1 → P2). Each improvement has been approved and documented in `docs/ai-workflow/blueprints/UX-UI-DESIGN-PROTOCOL.md`.

---

## Implementation Instructions

### **CRITICAL RULES**

1. **Implement ONLY P0 and P1 changes** in this phase
2. **Do NOT refactor** unrelated code - surgical edits only
3. **Preserve all existing functionality** - these are UI/UX enhancements, not rewrites
4. **Test each change** before moving to the next
5. **Follow the design protocol** exactly as specified in UX-UI-DESIGN-PROTOCOL.md

### **Technology Constraints**

- **Framework:** React 18 + TypeScript
- **Styling:** Styled Components (do NOT convert to Tailwind/CSS)
- **Animation:** Framer Motion (already in use)
- **Icons:** Lucide React (already imported)
- **Theme:** Dark mode with blue accents (colors specified in protocol)

---

## P0 (Critical) - Must Fix Before Launch

### **1. MovementScreenManager.tsx - Replace Dropdowns with Segmented Controls**

**File:** `frontend/src/pages/admin/MovementScreenManager.tsx`

**Current Implementation (Lines ~580-750):**
```tsx
// 9 dropdowns for OHSA checkpoints
<Select value={ohsa.feetTurnout} onChange={(e) => setOhsa({...ohsa, feetTurnout: e.target.value})}>
  <option value="none">None</option>
  <option value="minor">Minor</option>
  <option value="significant">Significant</option>
</Select>
```

**Required Implementation:**
Create a styled `SegmentedControl` component:

```tsx
const SegmentedControl = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const SegmentedButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.75rem;
  background: ${props => props.$active ? 'rgba(59, 130, 246, 0.8)' : 'transparent'};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: all 0.2s ease;
  min-height: 44px; /* Touch target */

  &:hover {
    background: ${props => props.$active ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.2)'};
  }
`;
```

**Replace ALL 9 OHSA dropdowns** with:
```tsx
<SegmentedControl>
  <SegmentedButton
    $active={ohsa.feetTurnout === 'none'}
    onClick={() => setOhsa({...ohsa, feetTurnout: 'none'})}
  >
    None
  </SegmentedButton>
  <SegmentedButton
    $active={ohsa.feetTurnout === 'minor'}
    onClick={() => setOhsa({...ohsa, feetTurnout: 'minor'})}
  >
    Minor
  </SegmentedButton>
  <SegmentedButton
    $active={ohsa.feetTurnout === 'significant'}
    onClick={() => setOhsa({...ohsa, feetTurnout: 'significant'})}
  >
    Significant
  </SegmentedButton>
</SegmentedControl>
```

**Apply to these 9 checkpoints:**
1. feetTurnout
2. feetFlattening
3. kneeValgus
4. kneeVarus
5. excessiveForwardLean
6. lowBackArch
7. armsFallForward
8. forwardHead
9. asymmetricWeightShift

**Testing:**
- [ ] All 9 checkpoints use segmented controls
- [ ] Active state highlights selected option
- [ ] Click toggles between None/Minor/Significant
- [ ] NASM score still auto-calculates correctly
- [ ] Mobile: Buttons are 44px minimum height (touch target)

---

### **2. OnboardingManagement.tsx - Mobile Responsive Table**

**File:** `frontend/src/pages/admin/OnboardingManagement.tsx`

**Current Implementation:**
- Table layout for all screen sizes (lines 503-588)

**Required Implementation:**
Add media query responsive cards:

```tsx
const ResponsiveWrapper = styled.div`
  @media (max-width: 768px) {
    display: none; /* Hide table on mobile */
  }
`;

const MobileCardList = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;

const MobileCard = styled(motion.div)`
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MobileCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1rem;
`;

const MobileCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MobileCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MobileCardLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
`;
```

**JSX Structure:**
```tsx
<ResponsiveWrapper>
  <Table>
    {/* Existing table code */}
  </Table>
</ResponsiveWrapper>

<MobileCardList>
  {clients.map((client) => (
    <MobileCard key={client.userId}>
      <MobileCardHeader>
        <ClientInfo>
          <ClientName>{client.client.firstName} {client.client.lastName}</ClientName>
          <ClientEmail>{client.client.email}</ClientEmail>
        </ClientInfo>
      </MobileCardHeader>

      <MobileCardBody>
        <MobileCardRow>
          <MobileCardLabel>Package</MobileCardLabel>
          <span>{client.package.name}</span>
        </MobileCardRow>

        <MobileCardRow>
          <MobileCardLabel>Questionnaire</MobileCardLabel>
          <StatusBadge status={getStatusText(client.questionnaire)}>
            {getStatusIcon(client.questionnaire?.status || 'not_started')}
            {client.questionnaire?.completionPercentage || 0}% Complete
          </StatusBadge>
        </MobileCardRow>

        <MobileCardRow>
          <MobileCardLabel>Movement Screen</MobileCardLabel>
          {client.movementScreen?.nasmAssessmentScore !== null ? (
            <ScoreBadge score={client.movementScreen.nasmAssessmentScore}>
              {client.movementScreen.nasmAssessmentScore}/100
            </ScoreBadge>
          ) : (
            <StatusBadge status="not_started">
              <Clock size={14} />
              Pending
            </StatusBadge>
          )}
        </MobileCardRow>

        <MobileCardRow>
          <MobileCardLabel>Primary Goal</MobileCardLabel>
          <span>{client.questionnaire?.primaryGoal?.replace('_', ' ') || 'N/A'}</span>
        </MobileCardRow>
      </MobileCardBody>

      <ActionButton
        onClick={() => handleViewClient(client.userId)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Eye size={14} />
        View Details
      </ActionButton>
    </MobileCard>
  ))}
</MobileCardList>
```

**Testing:**
- [ ] Desktop (>768px): Table displays normally
- [ ] Mobile (<768px): Cards display instead of table
- [ ] All client data visible in card format
- [ ] "View Details" button works on mobile
- [ ] No horizontal scrolling on any device

---

### **3. OnboardingStatusCard.tsx - Actionable Pending Items**

**File:** `frontend/src/components/ClientDashboard/OnboardingStatusCard.tsx`

**Current Implementation:**
Status items show "Pending" but are non-clickable.

**Required Implementation:**
Add clickable links to pending items:

```tsx
const StatusLink = styled.a`
  color: rgba(59, 130, 246, 1);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: rgba(59, 130, 246, 0.8);
    text-decoration: underline;
  }
`;
```

**Update Status Item Logic:**
```tsx
const getActionLink = (status: string, type: 'questionnaire' | 'movement') => {
  if (status === 'completed') return null;

  const links = {
    questionnaire: '/onboarding/questionnaire',
    movement: '/onboarding/movement-screen'
  };

  return (
    <StatusLink href={links[type]}>
      Complete Now <ArrowRight size={14} />
    </StatusLink>
  );
};

// In JSX:
<StatusItem $status={onboardingStatus}>
  <StatusLabel>Onboarding Questionnaire</StatusLabel>
  <StatusValue>
    {data.onboardingStatus.completionPercentage}% Complete
    {data.onboardingStatus.completionPercentage < 100 &&
      getActionLink('pending', 'questionnaire')
    }
  </StatusValue>
</StatusItem>
```

**Testing:**
- [ ] Pending questionnaire shows "Complete Now →" link
- [ ] Pending movement screen shows "Complete Now →" link
- [ ] Completed items do NOT show link
- [ ] Links navigate to correct pages
- [ ] Hover state works

---

## P1 (High Priority) - Workflow Optimization

### **4. Create Unified Client Profile View**

**New File:** `frontend/src/pages/admin/ClientProfile.tsx`

**Implementation:**
Create a tabbed interface that consolidates:
- Onboarding Management
- Movement Screen Manager
- Baseline Measurements Entry

**Structure:**
```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { User, FileText, Activity, Heart, Dumbbell, Apple } from 'lucide-react';

// Import existing page components
import MovementScreenManager from './MovementScreenManager';
import BaselineMeasurementsEntry from './BaselineMeasurementsEntry';

const ProfileContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ClientName = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: white;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;

  @media (max-width: 768px) {
    gap: 0.25rem;
  }
`;

const Tab = styled(motion.button)<{ $active: boolean }>`
  padding: 1rem 1.5rem;
  background: ${props => props.$active ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
  color: ${props => props.$active ? 'rgba(59, 130, 246, 1)' : 'rgba(255, 255, 255, 0.7)'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? 'rgba(59, 130, 246, 1)' : 'transparent'};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: rgba(59, 130, 246, 1);
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
  }
`;

const TabContent = styled(motion.div)`
  min-height: 400px;
`;

type TabType = 'overview' | 'onboarding' | 'movement' | 'vitals' | 'workouts' | 'nutrition';

const ClientProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'onboarding', label: 'Onboarding', icon: FileText },
    { id: 'movement', label: 'Movement Screen', icon: Activity },
    { id: 'vitals', label: 'Baseline Vitals', icon: Heart },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
  ];

  return (
    <ProfileContainer>
      <ProfileHeader>
        <User size={32} />
        <ClientName>Client Profile</ClientName>
      </ProfileHeader>

      <TabBar>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Tab
              key={tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={18} />
              {tab.label}
            </Tab>
          );
        })}
      </TabBar>

      <TabContent
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && <div>Overview content (Phase 1.4)</div>}
        {activeTab === 'onboarding' && <div>Onboarding questionnaire view (Phase 1.4)</div>}
        {activeTab === 'movement' && <MovementScreenManager preSelectedUserId={userId} />}
        {activeTab === 'vitals' && <BaselineMeasurementsEntry preSelectedUserId={userId} />}
        {activeTab === 'workouts' && <div>Workouts content (Phase 2)</div>}
        {activeTab === 'nutrition' && <div>Nutrition content (Phase 2)</div>}
      </TabContent>
    </ProfileContainer>
  );
};

export default ClientProfile;
```

**Route Registration:**
Add to `frontend/src/App.tsx`:
```tsx
<Route path="/admin/clients/:userId" element={<ClientProfile />} />
```

**Update OnboardingManagement.tsx:**
Change "View" button to navigate to new profile page:
```tsx
const handleViewClient = (userId: number) => {
  window.location.href = `/admin/clients/${userId}`;
};
```

**Testing:**
- [ ] Profile page loads at `/admin/clients/:userId`
- [ ] All 6 tabs render
- [ ] Movement tab shows MovementScreenManager with pre-selected user
- [ ] Vitals tab shows BaselineMeasurementsEntry with pre-selected user
- [ ] Tab switching animates smoothly
- [ ] Mobile: Tabs scroll horizontally if needed

---

### **5. BaselineMeasurementsEntry.tsx - Smart Defaults**

**File:** `frontend/src/pages/admin/BaselineMeasurementsEntry.tsx`

**Implementation:**
Modify `fetchMeasurementHistory` to populate form fields with ghosted placeholders:

```tsx
useEffect(() => {
  if (measurementHistory.length > 0 && !formTouched) {
    const lastMeasurement = measurementHistory[0];

    // Set placeholder attribute to show last value
    const inputs = {
      restingHeartRate: lastMeasurement.restingHeartRate,
      bloodPressureSystolic: lastMeasurement.bloodPressureSystolic,
      bloodPressureDiastolic: lastMeasurement.bloodPressureDiastolic,
      bodyWeight: lastMeasurement.bodyWeight,
      bodyFatPercentage: lastMeasurement.bodyFatPercentage,
      // ... all other fields
    };

    // Set as placeholders, not values (so form starts empty but shows hints)
    Object.keys(inputs).forEach(key => {
      const input = document.getElementById(key) as HTMLInputElement;
      if (input && inputs[key]) {
        input.placeholder = `Last: ${inputs[key]}`;
      }
    });
  }
}, [measurementHistory]);
```

**Update Input Components:**
```tsx
<Input
  id="restingHeartRate"
  type="number"
  value={restingHeartRate}
  onChange={(e) => {
    setRestingHeartRate(e.target.value);
    setFormTouched(true);
  }}
  placeholder="72" // Will be replaced with "Last: XX" dynamically
/>
```

**Testing:**
- [ ] Form inputs show "Last: XX" as placeholder when history exists
- [ ] Typing replaces placeholder with new value
- [ ] Empty form state still works (no errors)
- [ ] All 12+ input fields use smart defaults

---

### **6. OnboardingManagement.tsx - Bulk Actions**

**File:** `frontend/src/pages/admin/OnboardingManagement.tsx`

**Implementation:**
Add checkbox column and bulk action bar:

```tsx
const [selectedClients, setSelectedClients] = useState<number[]>([]);

const BulkActionBar = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

// Add to table header:
<TableHeader>
  <Checkbox
    type="checkbox"
    checked={selectedClients.length === clients.length}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedClients(clients.map(c => c.userId));
      } else {
        setSelectedClients([]);
      }
    }}
  />
</TableHeader>

// Add to each table row:
<TableCell>
  <Checkbox
    type="checkbox"
    checked={selectedClients.includes(client.userId)}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedClients([...selectedClients, client.userId]);
      } else {
        setSelectedClients(selectedClients.filter(id => id !== client.userId));
      }
    }}
  />
</TableCell>

// Bulk action bar (shown when selections > 0):
{selectedClients.length > 0 && (
  <BulkActionBar
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 100, opacity: 0 }}
  >
    <span>{selectedClients.length} selected</span>
    <Button onClick={handleBulkEmail}>
      <Mail size={18} />
      Send Reminder
    </Button>
    <Button onClick={handleBulkExport}>
      <Download size={18} />
      Export CSV
    </Button>
    <SecondaryButton onClick={() => setSelectedClients([])}>
      Cancel
    </SecondaryButton>
  </BulkActionBar>
)}
```

**Handlers:**
```tsx
const handleBulkEmail = async () => {
  // POST /api/admin/bulk-email with { userIds: selectedClients }
  toast({ title: 'Success', description: `Sent reminders to ${selectedClients.length} clients` });
};

const handleBulkExport = async () => {
  // GET /api/admin/export-clients?ids=1,2,3
  toast({ title: 'Success', description: 'CSV exported successfully' });
};
```

**Testing:**
- [ ] Checkbox column appears in table
- [ ] "Select all" checkbox works
- [ ] Individual checkboxes toggle selection
- [ ] Bulk action bar appears when >0 selected
- [ ] "Send Reminder" button works
- [ ] "Export CSV" button works
- [ ] "Cancel" clears selections

---

## Testing Checklist (After All Changes)

### Desktop (1920×1080)
- [ ] MovementScreenManager: Segmented controls render correctly
- [ ] OnboardingManagement: Table displays with bulk actions
- [ ] ClientProfile: Tabs switch smoothly
- [ ] All buttons have hover states

### Tablet (iPad - 1024×768)
- [ ] MovementScreenManager: Segmented buttons are 44px minimum (touch target)
- [ ] OnboardingManagement: Table adapts or shows warning
- [ ] ClientProfile: Tabs scroll horizontally

### Mobile (iPhone 14 - 390×844)
- [ ] OnboardingManagement: Card layout displays
- [ ] No horizontal scrolling
- [ ] All touch targets are 44px minimum
- [ ] Text is readable (14px+)

### Accessibility
- [ ] All segmented buttons keyboard-accessible (tab through)
- [ ] Focus indicators visible
- [ ] Screen reader announces tab changes
- [ ] Color contrast passes WCAG AA

---

## Deliverables

After completing P0 and P1 changes, provide:

1. **Summary Report**:
   - List of files modified
   - Line counts changed per file
   - Screenshots of before/after (desktop + mobile)

2. **Testing Results**:
   - Desktop testing: ✅/❌ for each item
   - Tablet testing: ✅/❌ for each item
   - Mobile testing: ✅/❌ for each item

3. **Performance Metrics**:
   - Movement screen input time: Before vs After (estimated clicks saved)
   - Admin workflow efficiency: Navigation clicks Before vs After

4. **Next Phase Recommendations**:
   - Which P2 items should be prioritized?
   - Any additional UX issues discovered during implementation?

---

## Success Criteria

- ✅ All P0 changes implemented and tested
- ✅ All P1 changes implemented and tested
- ✅ Zero regressions (existing functionality still works)
- ✅ Mobile responsive design functional
- ✅ Design protocol followed exactly
- ✅ Code is clean and maintainable

---

## Final Notes

- **Preserve all existing API calls** - do not change backend endpoints
- **Keep all existing component logic** - only update UI/UX
- **Follow UX-UI-DESIGN-PROTOCOL.md** for spacing, colors, typography
- **Ask for clarification** if any requirement is ambiguous
- **Test incrementally** - don't make all changes at once

Good luck! You're making a trainer's life 50% easier with these optimizations. 🚀
