/**
 * Dashboards v2 — shell a11y primitives (KIMI-DASHBOARDS §2.1). Skip link + polite live region.
 */
import styled from 'styled-components';

const Skip = styled.a`
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: var(--dash-z-toast);
  padding: 10px 16px;
  background: var(--dash-panel);
  color: var(--dash-accent);
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-panel);
  &:focus {
    left: 12px;
    top: 12px;
  }
`;

export function SkipLink() {
  return <Skip href="#dash-main">Skip to dashboard content</Skip>;
}

const Region = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export function LiveRegion({ message }: { message: string }) {
  return (
    <Region aria-live="polite" role="status">
      {message}
    </Region>
  );
}
