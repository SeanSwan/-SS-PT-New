import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Bug,
  LogIn,
  X,
  LayoutDashboard,
  RotateCcw,
  Settings
} from 'lucide-react';

// Import debug components
import CrossDashboardDebugger from './CrossDashboardDebugger';
import DevLogin from '../DevTools/DevLogin';
import ApiDebugger from './ApiDebugger';

// Styled Components
const FloatingButton = styled.button`
  position: fixed;
  bottom: 16px;
  right: 16px;
  background-color: #7851A9;
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #5F3E8E;
    transform: scale(1.1);
  }
`;

const DevToolsPanel = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #141427;
  color: white;
  z-index: 9999;
  overflow: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #1a1a2e;
  border-bottom: 1px solid #3f3f5f;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: #00ffff;
  margin: 0;
  margin-left: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const Content = styled.div`
  padding: 16px;
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid #3f3f5f;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  color: ${({ $active }) => $active ? '#00ffff' : '#f5f5f5'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 2px solid ${({ $active }) => $active ? '#00ffff' : 'transparent'};
  transition: all 0.3s ease;
  
  &:hover {
    color: #00ffff;
    background-color: rgba(0, 255, 255, 0.1);
  }
`;

const TabContent = styled.div`
  min-height: 300px;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: #00ffff;
  margin-bottom: 16px;
`;

const Description = styled.p`
  color: #ccc;
  margin-bottom: 16px;
  line-height: 1.5;
`;
const DevTools: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<number>(0);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleTabChange = (tabIndex: number) => {
    setCurrentTab(tabIndex);
  };

  return (
    <>
      {/* Floating button to access DevTools */}
      {!open && (
        <FloatingButton onClick={handleToggle}>
          <Bug size={24} />
        </FloatingButton>
      )}

      {/* DevTools Panel */}
      {open && (
        <DevToolsPanel>
          <Header>
            <HeaderLeft>
              <Bug size={28} color="#00ffff" />
              <Title>SwanStudios Developer Tools</Title>
            </HeaderLeft>
            <CloseButton onClick={handleToggle}>
              <X size={24} />
            </CloseButton>
          </Header>

          <Content>
            <TabsContainer>
              <Tab 
                $active={currentTab === 0} 
                onClick={() => handleTabChange(0)}
              >
                <LayoutDashboard size={20} />
                Dashboard Debugger
              </Tab>
              <Tab 
                $active={currentTab === 1} 
                onClick={() => handleTabChange(1)}
              >
                <LogIn size={20} />
                Dev Login
              </Tab>
              <Tab 
                $active={currentTab === 2} 
                onClick={() => handleTabChange(2)}
              >
                <RotateCcw size={20} />
                API Tester
              </Tab>
              <Tab 
                $active={currentTab === 3} 
                onClick={() => handleTabChange(3)}
              >
                <Settings size={20} />
                Settings
              </Tab>
            </TabsContainer>

            <TabContent>
              {/* Dashboard Debugger Tab */}
              {currentTab === 0 && (
                <CrossDashboardDebugger />
              )}

              {/* Dev Login Tab */}
              {currentTab === 1 && (
                <DevLogin />
              )}

              {/* API Tester Tab */}
              {currentTab === 2 && (
                <div>
                  <SectionTitle>API Connection Debugger</SectionTitle>
                  <Description>
                    Use this tool to diagnose backend connection issues and enable mock data mode when needed.
                  </Description>
                  <ApiDebugger />
                </div>
              )}

              {/* Settings Tab */}
              {currentTab === 3 && (
                <div>
                  <SectionTitle>Dev Settings</SectionTitle>
                  <Description>
                    Configure development settings, mock data, and debug options.
                  </Description>
                </div>
              )}
            </TabContent>
          </Content>
        </DevToolsPanel>
      )}
    </>
  );
};

export default DevTools;
