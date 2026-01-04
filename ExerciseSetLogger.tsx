import React from 'react';
import styled from 'styled-components';
import { useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

const ExerciseSetLogger = ({ nestIndex, control, register, errors }: any) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `exercises.${nestIndex}.sets`,
  });

  return (
    <SetsContainer>
      <SetHeader>
        <HeaderLabel>Set</HeaderLabel>
        <HeaderLabel>Weight (lbs)</HeaderLabel>
        <HeaderLabel>Reps</HeaderLabel>
        <HeaderLabel>Notes</HeaderLabel>
        <HeaderLabel></HeaderLabel>
      </SetHeader>

      {fields.map((item, k) => (
        <SetRow key={item.id}>
          <SetNumber>{k + 1}</SetNumber>
          <input
            type="hidden"
            {...register(`exercises.${nestIndex}.sets.${k}.setNumber`)}
            value={k + 1}
          />
          <Input
            type="number"
            placeholder="0"
            {...register(`exercises.${nestIndex}.sets.${k}.weight`, { valueAsNumber: true })}
          />
          <Input
            type="number"
            placeholder="0"
            {...register(`exercises.${nestIndex}.sets.${k}.reps`, { valueAsNumber: true })}
          />
          <Input
            placeholder="e.g., felt strong"
            {...register(`exercises.${nestIndex}.sets.${k}.notes`)}
          />
          <RemoveSetButton type="button" onClick={() => remove(k)}>
            <Trash2 size={16} />
          </RemoveSetButton>
        </SetRow>
      ))}
      
      <AddSetButton
        type="button"
        onClick={() => append({ setNumber: fields.length + 1, weight: 0, reps: 0, notes: '' })}
      >
        <Plus size={16} /> Add Set
      </AddSetButton>
    </SetsContainer>
  );
};

const SetsContainer = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SetHeader = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 1fr 2fr 40px;
  gap: 1rem;
  padding: 0 0.5rem;
`;

const HeaderLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary, #B8B8B8);
  text-transform: uppercase;
  font-weight: 600;
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 1fr 2fr 40px;
  gap: 1rem;
  align-items: center;
`;

const SetNumber = styled.span`
  font-weight: 600;
  color: var(--primary-cyan, #00CED1);
  text-align: center;
`;

const Input = styled.input`
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 0.75rem;
  color: var(--text-primary, #FFFFFF);
  font-size: 1rem;
  width: 100%;
`;

const RemoveSetButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #B8B8B8);
  cursor: pointer;
  padding: 4px;
  display: flex;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: var(--error, #FF4444);
  }
`;

const AddSetButton = styled.button`
  margin-top: 0.5rem;
  background: rgba(0, 206, 209, 0.1);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  color: var(--primary-cyan, #00CED1);
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 206, 209, 0.2);
  }
`;

export default ExerciseSetLogger;