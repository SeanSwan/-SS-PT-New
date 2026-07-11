import React from 'react';
import styled from 'styled-components';

export interface ConceptProps { onAction: (message: string) => void; }
export const workoutRows = [
  { name: 'Goblet squat', meta: 'Stability · lower body', dose: '3 × 10' },
  { name: 'Half-kneeling press', meta: 'Anti-rotation · push', dose: '3 × 8' },
  { name: 'Stability-ball row', meta: 'Core · pull', dose: '3 × 12' },
];
export const clientSignals = ['Readiness 82', 'Left knee 2/10', 'Missed Tuesday'];

const Note = styled.p`
  margin: 0; font-size: 12px; line-height: 1.4; opacity: .72;
`;
export const PrototypeNote: React.FC = () => <Note>Prototype only · no client data is written</Note>;
export const ActionReceipt: React.FC<{ message: string }> = ({ message }) => (
  <span aria-live="polite">{message}</span>
);
