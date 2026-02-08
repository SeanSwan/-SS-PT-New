import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  fullWidthOnMobile?: boolean;
  ariaLabel?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'right',
  fullWidthOnMobile = true,
  ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <Container ref={containerRef}>
      <TriggerWrapper
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
      >
        {trigger}
      </TriggerWrapper>
      {open && (
        <Menu $align={align} $fullWidthOnMobile={fullWidthOnMobile} role="menu">
          {React.Children.map(children, (child) => (
            <MenuItemWrapper
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {child}
            </MenuItemWrapper>
          ))}
        </Menu>
      )}
    </Container>
  );
};

export default Dropdown;

const Container = styled.div`
  position: relative;
  display: inline-flex;
  z-index: 100;
`;

const TriggerWrapper = styled.div`
  display: inline-flex;
  align-items: center;
`;

const Menu = styled.div<{ $align: 'left' | 'right'; $fullWidthOnMobile: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  ${({ $align }) => ($align === 'right' ? 'right: 0;' : 'left: 0;')}
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.35rem;
  min-width: 220px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  z-index: 1000;

  @media (max-width: 480px) {
    ${({ $fullWidthOnMobile }) => $fullWidthOnMobile && `
      left: 0;
      right: 0;
      min-width: auto;
      width: 100%;
    `}
  }
`;

const MenuItemWrapper = styled.div`
  & > * {
    width: 100%;
    justify-content: flex-start;
  }
`;
