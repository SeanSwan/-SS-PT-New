/**
 * RecentSessions Styles
 * ====================
 * Styled components for the recent sessions component
 */

import styled from 'styled-components';

export const SessionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin: 20px 0;
  max-width: 100%;
`;

export const SessionsHeader = styled.h2`
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 12px;
`;

export const SessionFilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const FilterSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.95rem;
  min-width: 150px;
  max-width: 200px;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  max-width: 300px;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

export const NoSessionsMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #888;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px dashed #ddd;
  margin: 20px 0;
`;

export const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const SessionCard = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

export const SessionDate = styled.span`
  font-size: 0.85rem;
  color: #888;
  display: block;
  margin-bottom: 6px;
`;

export const SessionTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
`;

export const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const SessionMetrics = styled.div`
  display: flex;
  justify-content: space-between;
  background-color: white;
  border-radius: 6px;
  padding: 16px;
  
  @media (max-width: 576px) {
    flex-wrap: wrap;
    gap: 12px;
  }
`;

export const MetricItem = styled.div`
  text-align: center;
  flex: 1;
  min-width: 70px;
  
  @media (max-width: 576px) {
    min-width: 80px;
    flex: 0 0 calc(50% - 6px);
  }
`;

export const MetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
`;

export const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
`;

export const ViewDetailsButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: background-color 0.2s ease-in-out;
  
  &:hover {
    background-color: #3a7bc8;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.4);
  }
`;

export const SessionNotes = styled.p`
  font-size: 0.95rem;
  color: #666;
  margin: 0;
  line-height: 1.5;
  padding: 12px;
  background-color: white;
  border-radius: 6px;
  border-left: 3px solid #4a90e2;
`;

export const SessionDetailsModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  
  & > div {
    background-color: white;
    border-radius: 10px;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eaeaea;
  
  h3 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }
`;

export const ModalContent = styled.div`
  padding: 20px;
  overflow-y: auto;
  
  .session-overview {
    margin-bottom: 24px;
    
    .session-date {
      font-size: 0.9rem;
      color: #888;
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    .session-metrics-detailed {
      display: flex;
      justify-content: space-between;
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      
      @media (max-width: 576px) {
        flex-wrap: wrap;
        gap: 12px;
      }
    }
    
    .session-notes-full {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 16px;
      
      h4 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1.1rem;
        color: #333;
      }
      
      p {
        margin: 0;
        line-height: 1.6;
        color: #666;
      }
    }
  }
  
  .exercises-list {
    h4 {
      font-size: 1.2rem;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eaeaea;
    }
  }
`;

export const ExerciseListItem = styled.div`
  margin-bottom: 24px;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
`;

export const ExerciseHeader = styled.div`
  margin-bottom: 12px;
  
  h5 {
    margin: 0 0 4px 0;
    font-size: 1.1rem;
    color: #333;
  }
  
  .muscle-groups {
    font-size: 0.85rem;
    color: #888;
  }
`;

export const SetsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: white;
  border-radius: 6px;
  overflow: hidden;
  
  .sets-header {
    display: grid;
    grid-template-columns: 40px 1fr 1fr 1fr 2fr;
    padding: 10px 16px;
    background-color: #f0f0f0;
    font-weight: 500;
    font-size: 0.85rem;
    color: #666;
    
    @media (max-width: 768px) {
      display: none;
    }
  }
`;

export const SetItem = styled.li`
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

export const SetNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #666;
  font-weight: 500;
  font-size: 0.9rem;
  width: 40px;
  flex-shrink: 0;
`;

export const SetDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr;
  flex: 1;
  
  span {
    padding: 12px 16px;
    font-size: 0.95rem;
    color: #333;
  }
  
  .set-notes {
    font-size: 0.9rem;
    color: #666;
    font-style: italic;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    
    span {
      padding: 8px 12px;
      
      &:before {
        content: attr(data-label);
        font-size: 0.8rem;
        color: #888;
        display: block;
        margin-bottom: 4px;
      }
    }
  }
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #eaeaea;
  gap: 12px;
  
  button {
    padding: 10px 16px;
    border-radius: 4px;
    font-size: 0.95rem;
    cursor: pointer;
    
    &.edit-button {
      background-color: white;
      color: #4a90e2;
      border: 1px solid #4a90e2;
      
      &:hover {
        background-color: rgba(74, 144, 226, 0.1);
      }
    }
    
    &.close-button {
      background-color: #4a90e2;
      color: white;
      border: none;
      
      &:hover {
        background-color: #3a7bc8;
      }
    }
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #888;
  cursor: pointer;
  
  &:hover {
    color: #333;
  }
`;
