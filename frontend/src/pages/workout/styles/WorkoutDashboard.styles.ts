/**
 * WorkoutDashboard Styles
 * =====================
 * Styled components for the workout dashboard
 */

import styled from 'styled-components';

export const DashboardContainer = styled.div`
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin: 20px 0;
  max-width: 100%;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

export const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 16px;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

export const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
  
  @media (max-width: 576px) {
    font-size: 1.5rem;
  }
`;

export const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.95rem;
  color: #555;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  
  &:hover {
    background-color: #e8e8e8;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
  
  &:before {
    content: "↻";
    font-size: 1.1rem;
  }
`;

export const DashboardControls = styled.div`
  display: flex;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

export const ErrorMessage = styled.div`
  background-color: #fff1f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 0.95rem;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px;
  color: #888;
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #4a90e2;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  p {
    font-size: 1rem;
    color: #555;
  }
`;

export const ContentContainer = styled.div`
  flex: 1;
`;
