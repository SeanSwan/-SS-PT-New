import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import StoreFront from './StoreFront.component';
import ProductRecommendations from '../../components/Shop/ProductRecommendations';
import OrderHistory from '../../components/Shop/OrderHistory';
import { useNavigate, useLocation } from 'react-router-dom';

// Styled components
const ShopPageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  padding-bottom: 4rem;
`;

const ShopNav = styled.nav`
  display: flex;
  justify-content: center;
  padding: 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
  background: rgba(10, 10, 30, 0.7);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const NavTabs = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const NavTab = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'rgba(120, 81, 169, 0.5)' : 'transparent'};
  border: 1px solid ${props => props.active ? '#7851a9' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 30px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 'rgba(120, 81, 169, 0.6)' : 'rgba(255, 255, 255, 0.1)'};
  }
  
  @media (max-width: 768px) {
    flex: 1;
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
    text-align: center;
  }
`;

const SectionContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const ContentContainer = styled(motion.div)`
  margin-top: 2rem;
`;

// Tab definitions
const tabs = [
  { id: 'shop', label: 'Shop' },
  { id: 'orders', label: 'My Orders' },
];

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

// Main component
const ShopPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract the tab from the URL or default to 'shop'
  const urlParams = new URLSearchParams(location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'shop');
  
  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/shop?tab=${tabId}`, { replace: true });
  };
  
  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return isAuthenticated ? (
          <ContentContainer
            key="orders"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
          >
            <OrderHistory />
          </ContentContainer>
        ) : (
          <ContentContainer
            key="orders-login"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
          >
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <h2>Please log in to view your orders</h2>
              <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                You need to be logged in to access your order history.
              </p>
            </div>
          </ContentContainer>
        );
        
      case 'shop':
      default:
        return (
          <ContentContainer
            key="shop"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
          >
            <StoreFront />
            
            {/* Recommendations sections */}
            {isAuthenticated && (
              <ProductRecommendations 
                type="personalized" 
                title="Recommended Just for You" 
                limit={4} 
              />
            )}
            
            <ProductRecommendations 
              type="popular" 
              title="Best Sellers" 
              limit={4} 
            />
            
            {isAuthenticated && (
              <ProductRecommendations 
                type="cart" 
                title="Frequently Bought Together" 
                limit={3} 
              />
            )}
          </ContentContainer>
        );
    }
  };
  
  return (
    <ShopPageContainer>
      <ShopNav>
        <NavTabs>
          {tabs.map(tab => (
            <NavTab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </NavTab>
          ))}
        </NavTabs>
      </ShopNav>
      
      <SectionContainer>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </SectionContainer>
    </ShopPageContainer>
  );
};

export default ShopPage;