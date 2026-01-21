/**
 * LaunchChecklist
 * ===============
 * Galaxy-Swan themed click-through checklist for launch readiness.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CheckSquare, RotateCcw } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  PrimaryButton,
  OutlinedButton
} from '../UniversalMasterSchedule/ui';

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
};

type ChecklistSection = {
  title: string;
  items: ChecklistItem[];
};

const checklistSections: ChecklistSection[] = [
  {
    title: 'Scheduling',
    items: [
      {
        id: 'schedule-booking',
        label: 'Client can book a session with credits',
        description: 'Quick Book flow shows credit balance and confirms booking.'
      },
      {
        id: 'schedule-recurring',
        label: 'Admin can create recurring sessions',
        description: 'Recurring modal enforces 52-occurrence cap.'
      },
      {
        id: 'schedule-block',
        label: 'Trainer can block time slots',
        description: 'Blocked slots show striped indicator and badge.'
      }
    ]
  },
  {
    title: 'Client Experience',
    items: [
      {
        id: 'client-progress',
        label: 'Client progress panel shows real data',
        description: 'Weight trend, NASM score, goals, and session count.'
      },
      {
        id: 'client-tabs',
        label: 'Workouts, nutrition, photos, notes tabs load real data',
        description: 'No mock data remains in GalaxySections.'
      },
      {
        id: 'client-automation',
        label: 'Notification preferences saved successfully',
        description: 'Quiet hours and channel toggles persist.'
      }
    ]
  },
  {
    title: 'Admin Operations',
    items: [
      {
        id: 'admin-nutrition',
        label: 'Admin can create nutrition plans',
        description: 'NutritionPlanBuilder saves macros and meals.'
      },
      {
        id: 'admin-workouts',
        label: 'Admin can create workout plans',
        description: 'WorkoutPlanBuilder saves days, exercises, and notes.'
      },
      {
        id: 'admin-notes-photos',
        label: 'Admin can manage notes and photos',
        description: 'NotesManager and PhotoManager support CRUD.'
      }
    ]
  },
  {
    title: 'Automation',
    items: [
      {
        id: 'automation-sms',
        label: 'SMS templates are available',
        description: 'SMS templates list loads and test send works (dev).'
      },
      {
        id: 'automation-process',
        label: 'Manual automation process endpoint works',
        description: 'POST /api/automation/process schedules pending messages.'
      }
    ]
  }
];

const LaunchChecklist: React.FC = () => {
  const allItemIds = useMemo(
    () => checklistSections.flatMap((section) => section.items.map((item) => item.id)),
    []
  );

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const completedCount = allItemIds.filter((id) => checkedItems[id]).length;

  const handleToggle = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMarkAll = () => {
    const nextState: Record<string, boolean> = {};
    allItemIds.forEach((id) => {
      nextState[id] = true;
    });
    setCheckedItems(nextState);
  };

  const handleReset = () => {
    setCheckedItems({});
  };

  return (
    <PageWrapper>
      <HeaderRow>
        <div>
          <PageTitle>Launch Checklist</PageTitle>
          <BodyText secondary>
            Manual verification checklist for release readiness.
          </BodyText>
        </div>
        <FlexBox gap="0.75rem" wrap>
          <OutlinedButton type="button" onClick={handleReset}>
            <RotateCcw size={16} />
            Reset
          </OutlinedButton>
          <PrimaryButton type="button" onClick={handleMarkAll}>
            <CheckSquare size={16} />
            Mark All Complete
          </PrimaryButton>
        </FlexBox>
      </HeaderRow>

      <SummaryCard>
        <SummaryTitle>{completedCount} of {allItemIds.length} checks complete</SummaryTitle>
        <SmallText secondary>
          Review each section before launch.
        </SmallText>
      </SummaryCard>

      <GridContainer columns={2} gap="1.5rem">
        {checklistSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <SectionTitle>{section.title}</SectionTitle>
            </CardHeader>
            <CardBody>
              <ChecklistStack>
                {section.items.map((item) => (
                  <ChecklistItemRow key={item.id}>
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => handleToggle(item.id)}
                      aria-label={item.label}
                    />
                    <div>
                      <ChecklistLabel>{item.label}</ChecklistLabel>
                      <SmallText secondary>{item.description}</SmallText>
                    </div>
                  </ChecklistItemRow>
                ))}
              </ChecklistStack>
            </CardBody>
          </Card>
        ))}
      </GridContainer>
    </PageWrapper>
  );
};

export default LaunchChecklist;

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SummaryCard = styled(Card)`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SummaryTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: #ffffff;
`;

const ChecklistStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChecklistItemRow = styled.label`
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 0.75rem;
  align-items: start;
  cursor: pointer;

  input {
    margin-top: 0.2rem;
    width: 18px;
    height: 18px;
    accent-color: #00ffff;
  }
`;

const ChecklistLabel = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: #ffffff;
`;
