/**
 * Blueprint: SlashMenu
 * Parent: WorkspaceComposer. The "/" popover: a listbox the composer drives with
 * the keyboard (aria-activedescendant — focus never leaves the textarea), and
 * that a pointer or a tap can pick from. Pure presentation; the item list and
 * the pick semantics live in slashCommands.ts.
 */
import React, { useEffect, useRef } from 'react';
import { SlashPopover } from './CoachWorkspace.conversation.styles';
import type { SlashItem } from './slashCommands';

type Props = {
  id: string;
  items: SlashItem[];
  activeIndex: number;
  onPick: (item: SlashItem) => void;
  onHover: (index: number) => void;
};

export const slashOptionId = (menuId: string, index: number) => `${menuId}-opt-${index}`;

const SlashMenu: React.FC<Props> = ({ id, items, activeIndex, onPick, onHover }) => {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.getElementById(slashOptionId(id, activeIndex))?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, id]);

  let lastGroup = '';
  return (
    <SlashPopover id={id} role="listbox" aria-label="Coach commands" ref={listRef}>
      {items.length ? items.map((item, index) => {
        const header = item.group !== lastGroup ? item.group : null;
        lastGroup = item.group;
        return (
          <React.Fragment key={`${item.kind}-${item.trigger}-${index}`}>
            {header ? <div className="ws-slash-group" aria-hidden="true">{header}</div> : null}
            <button
              type="button"
              role="option"
              id={slashOptionId(id, index)}
              aria-selected={index === activeIndex}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(item)}
            >
              <code>/{item.trigger}</code>
              <span>{item.label}</span>
            </button>
          </React.Fragment>
        );
      }) : <div className="ws-slash-empty" role="status">No command matches. Keep typing to send it as a message.</div>}
    </SlashPopover>
  );
};

export default SlashMenu;
