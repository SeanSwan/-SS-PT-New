/**
 * WorkoutPlanner Styles
 * ====================
 * Styled components for the workout planner
 */

import styled from 'styled-components';

export const PlannerContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin: 20px 0;
  max-width: 100%;
`;

export const PlannerHeader = styled.h2`
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 12px;
`;

export const FormGroup = styled.div`
  margin-bottom: 20px;
  width: 100%;
`;

export const InputLabel = styled.label`
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: #555;
`;

export const TextInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease-in-out;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  background-color: white;
  transition: border-color 0.2s ease-in-out;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease-in-out;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

export const SaveButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  
  &:hover {
    background-color: #3a7bc8;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.4);
  }
`;

export const CancelButton = styled.button`
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  
  &:hover {
    background-color: #e9e9e9;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
`;

export const ErrorText = styled.p`
  color: #e74c3c;
  margin: 10px 0;
  font-size: 0.9rem;
`;

export const WorkoutDayContainer = styled.div`
  border: 1px solid #eaeaea;
  border-radius: 6px;
  padding: 20px;
  margin-top: 20px;
  background-color: #f9f9f9;
`;

export const WorkoutDayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  button {
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    
    &:hover {
      background-color: #3a7bc8;
    }
  }
  
  input {
    max-width: 60%;
    font-size: 1.1rem;
    font-weight: 500;
  }
`;

export const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  p {
    color: #888;
    text-align: center;
    padding: 20px;
  }
`;

export const ExerciseItem = styled.div`
  background-color: white;
  border: 1px solid #eaeaea;
  border-radius: 6px;
  padding: 16px;
  position: relative;
  
  h4 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.1rem;
    color: #333;
  }
  
  textarea {
    margin-top: 12px;
  }
`;

export const ExerciseDetails = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  
  div {
    flex: 1;
    
    label {
      display: block;
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 4px;
    }
    
    input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  }
`;

export const RemoveButton = styled.button`
  background-color: transparent;
  color: #e74c3c;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  position: absolute;
  top: 16px;
  right: 16px;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const AddDayButton = styled.button`
  background-color: transparent;
  color: #4a90e2;
  border: 1px dashed #4a90e2;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  
  &:hover {
    background-color: rgba(74, 144, 226, 0.1);
  }
`;

export const DaySelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eaeaea;
  
  button {
    background-color: #f5f5f5;
    color: #666;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    
    &.active {
      background-color: #4a90e2;
      color: white;
      border-color: #4a90e2;
    }
    
    &:hover:not(.active) {
      background-color: #e9e9e9;
    }
  }
`;

export const TabContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid #eaeaea;
`;

export const Tab = styled.button<{ active: boolean }>`
  background-color: transparent;
  color: ${props => props.active ? '#4a90e2' : '#666'};
  border: none;
  font-size: 1rem;
  font-weight: ${props => props.active ? '600' : '400'};
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-bottom: 2px solid ${props => props.active ? '#4a90e2' : 'transparent'};
  
  &:hover {
    color: #4a90e2;
  }
`;
