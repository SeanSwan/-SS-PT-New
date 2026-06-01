import React from 'react';
import {
  VIEW_LABELS,
  formatHeaderDate,
  shiftDate,
  type ViewType,
} from './ViewSelector.logic';
import {
  DateControls,
  DateLabel,
  NavButton,
  SelectorContainer,
  Tabs,
  TodayButton,
  ViewTab,
} from './ViewSelector.styles';

export type { ViewType } from './ViewSelector.logic';

export interface ViewSelectorProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({
  activeView,
  onViewChange,
  currentDate,
  onDateChange
}) => {
  return (
    <SelectorContainer>
      <Tabs role="tablist" aria-label="Schedule views">
        {VIEW_LABELS.map((view) => {
          const isActive = view.value === activeView;
          return (
            <ViewTab
              key={view.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              $active={isActive}
              onClick={() => onViewChange(view.value)}
            >
              {view.label}
            </ViewTab>
          );
        })}
      </Tabs>

      <DateControls>
        <NavButton
          type="button"
          aria-label="Previous"
          title="Previous"
          onClick={() => onDateChange(shiftDate(currentDate, activeView, 'prev'))}
        >
          &#x2039;
        </NavButton>

        <DateLabel>{formatHeaderDate(currentDate, activeView)}</DateLabel>

        <NavButton
          type="button"
          aria-label="Next"
          title="Next"
          onClick={() => onDateChange(shiftDate(currentDate, activeView, 'next'))}
        >
          &#x203A;
        </NavButton>

        <TodayButton
          type="button"
          title="Today"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </TodayButton>
      </DateControls>
    </SelectorContainer>
  );
};

export default ViewSelector;
