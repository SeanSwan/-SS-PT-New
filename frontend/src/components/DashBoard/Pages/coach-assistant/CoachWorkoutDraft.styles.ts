import styled from 'styled-components';
import { Wrapper as ExerciseLibraryWrapper } from '../../../WorkoutLogger/NASMExerciseRolodex.styles';

/** Dark-first, keyboard-safe presentation primitives for the standalone draft editor. */
export const DraftForm = styled.form`
  display: grid;
  gap: 1rem;
  color: ${({ theme }) => theme?.colors?.textPrimary || 'var(--text-primary, #ecf3f8)'};
  min-width: 0;

  .coach-workout-draft-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    min-width: 0;
  }

  .coach-workout-draft-field {
    display: grid;
    gap: 0.375rem;
    min-width: 0;
  }

  .coach-workout-draft-exercises {
    display: grid;
    gap: 1rem;
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 0;
  }

  .coach-workout-draft-exercise {
    min-width: 0;
    border: 1px solid ${({ theme }) => theme?.colors?.border || 'var(--border-subtle, #34516b)'};
    border-radius: 0.75rem;
    background: ${({ theme }) => theme?.colors?.surface || 'var(--bg-surface, #102536)'};
    padding: 0.75rem;
  }

  .coach-workout-draft-exercise-head {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(7rem, 0.75fr) auto auto;
    gap: 0.625rem;
    align-items: center;
    min-width: 0;
  }

  .coach-workout-draft-sets {
    min-width: 0;
    margin-top: 0.75rem;
  }

  .coach-workout-draft-set-table {
    width: 100%;
    min-width: 32rem;
    border-collapse: collapse;
  }

  .coach-workout-draft-set-table th,
  .coach-workout-draft-set-table td {
    padding: 0.375rem;
    text-align: left;
    vertical-align: middle;
  }

  .coach-workout-draft-library-panel {
    max-width: 100%;
    min-width: 0;
  }

  /* NASMExerciseRolodex is absolute in standalone Logger; contain it in this picker. */
  .coach-workout-draft-library-panel > div {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    z-index: auto;
    max-width: 100%;
  }

  input,
  select,
  textarea,
  button {
    min-height: 44px;
    font: inherit;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid ${({ theme }) => theme?.colors?.border || 'var(--border-subtle, #34516b)'};
    border-radius: 0.5rem;
    background: ${({ theme }) => theme?.colors?.background || 'var(--bg-primary, #071521)'};
    color: inherit;
    padding: 0.625rem 0.75rem;
  }

  textarea { resize: vertical; min-height: 72px; }

  button {
    border: 1px solid ${({ theme }) => theme?.colors?.border || 'var(--border-prominent, #52728c)'};
    border-radius: 0.5rem;
    background: ${({ theme }) => theme?.colors?.surface || 'var(--bg-surface, #173248)'};
    color: inherit;
    padding: 0.625rem 0.875rem;
    cursor: pointer;
  }

  button:disabled { cursor: not-allowed; opacity: 0.6; }
  :is(input, select, textarea, button):focus-visible {
    outline: 3px solid ${({ theme }) => theme?.colors?.primary || 'var(--accent-primary, #62b1e9)'};
    outline-offset: 2px;
  }

  @media (max-width: 767px) {
    .coach-workout-draft-meta { grid-template-columns: 1fr; }
    .coach-workout-draft-exercise-head {
      grid-template-columns: 1fr;
      align-items: stretch;
    }
    .coach-workout-draft-exercise-head button { width: 100%; }
    .coach-workout-draft-sets { overflow-x: visible; }
    .coach-workout-draft-set-table,
    .coach-workout-draft-set-table tbody,
    .coach-workout-draft-set-table tr,
    .coach-workout-draft-set-table td { display: block; }
    .coach-workout-draft-set-table { min-width: 0; }
    .coach-workout-draft-set-table thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .coach-workout-draft-set-table tr {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
      border-top: 1px solid ${({ theme }) => theme?.colors?.border || 'var(--border-subtle, #34516b)'};
      padding: 0.625rem 0;
    }
    .coach-workout-draft-set-table td {
      display: grid;
      gap: 0.25rem;
      padding: 0;
      min-width: 0;
    }
    .coach-workout-draft-set-table td::before {
      content: attr(data-label);
      font-size: 0.75rem;
      font-weight: 700;
      opacity: 0.8;
    }
    .coach-workout-draft-set-table td:first-child,
    .coach-workout-draft-set-table td:last-child { grid-column: 1 / -1; }
    .coach-workout-draft-set-table td:last-child button { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  }
`;

export const LibraryToggle = styled.button`
  justify-self: start;
  font-weight: 700;
`;

export const LibraryPanel = styled.div`
  position: relative;
  min-width: 0;
  ${ExerciseLibraryWrapper} {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    width: 100%;
    margin-top: 0.75rem;
    max-height: min(42rem, 70dvh);
    z-index: auto;
  }

  border: 1px solid ${({ theme }) => theme?.colors?.border || 'var(--border-subtle, #34516b)'};
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme?.colors?.surface || 'var(--bg-surface, #102536)'};
`;

export const DraftError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme?.colors?.error || 'var(--color-error, #f7b4b4)'};
`;
