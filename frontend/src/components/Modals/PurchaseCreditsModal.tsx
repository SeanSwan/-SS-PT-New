import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import theme from '../../theme/tokens';
import GlowButton from '../ui/buttons/GlowButton';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    credits: number;
  };
  onPurchased: () => void;
}

const ModalBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: rgba(30, 30, 60, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.7;
    z-index: -1;
  }
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(25, 25, 50, 0.5);
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  max-height: calc(90vh - 180px);
`;

const ModalFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 20, 40, 0.5);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const PackageOption = styled(motion.div)`
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: rgba(35, 35, 70, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 0.5rem;
`;

const MoreOptionsToggle = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 1rem 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: #00ffff;
  }
`;

const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ 
  isOpen, 
  onClose, 
  client,
  onPurchased
}) => {
  const { toast } = useToast();
  const { authAxios } = useAuth();
  
  const [selectedOption, setSelectedOption] = useState<string>('rhodium');
  const [quantity, setQuantity] = useState<number>(1);
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      // Call backend endpoint to grant credits
      await authAxios.post('/api/admin/credits/purchase-and-grant', {
        clientId: client.id,
        storefrontItemId: selectedOption === 'rhodium' ? 57 : 50, // Rhodium ID=57, Single Session ID=50
        quantity,
        grantReason: 'purchase_pending'
      });

      toast({
        title: 'Success',
        description: 'Credits granted successfully. Payment will be processed shortly.',
      });
      onPurchased();
      onClose();
    } catch (error) {
      console.error('Failed to grant credits:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant credits. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const packageOptions = [
    {
      id: 'rhodium',
      name: 'Rhodium Swan Royalty',
      description: '12 months • 4/week • 208 sessions',
      pricePerSession: '$140',
      total: '$29,120',
      isBestValue: true
    },
    {
      id: 'single',
      name: 'Single Session',
      description: 'One-time session',
      pricePerSession: '$175',
      total: '$175',
      isBestValue: false
    }
  ];

  const additionalOptions = [
    {
      id: 'gold',
      name: 'Golden Swan Flight',
      description: '8 sessions package',
      pricePerSession: '$170',
      total: '$1,360',
      isBestValue: false
    },
    {
      id: 'emerald',
      name: 'Emerald Swan Evolution',
      description: '52 sessions package',
      pricePerSession: '$155',
      total: '$8,060',
      isBestValue: false
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalBackdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <ModalHeader>
              <h2>Purchase Credits for {client.name}</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                Current credits: {client.credits}
              </p>
            </ModalHeader>

            <ModalBody>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Select Package</h3>
                
                {packageOptions.map(option => (
                  <PackageOption
                    key={option.id}
                    className={selectedOption === option.id ? 'selected' : ''}
                    onClick={() => setSelectedOption(option.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h4 style={{ margin: 0 }}>
                      {option.name}
                      {option.isBestValue && <Badge>Best Value</Badge>}
                    </h4>
                    <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>
                      {option.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{option.pricePerSession}/session</span>
                      <span style={{ fontWeight: 'bold' }}>Total: {option.total}</span>
                    </div>
                  </PackageOption>
                ))}

                <MoreOptionsToggle onClick={() => setShowMoreOptions(!showMoreOptions)}>
                  {showMoreOptions ? 'Hide options' : 'Show more options'}
                </MoreOptionsToggle>

                {showMoreOptions && (
                  <PackageGrid>
                    {additionalOptions.map(option => (
                      <PackageOption
                        key={option.id}
                        className={selectedOption === option.id ? 'selected' : ''}
                        onClick={() => setSelectedOption(option.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <h4 style={{ margin: 0 }}>{option.name}</h4>
                        <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>
                          {option.description}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{option.pricePerSession}/session</span>
                          <span style={{ fontWeight: 'bold' }}>Total: {option.total}</span>
                        </div>
                      </PackageOption>
                    ))}
                  </PackageGrid>
                )}
              </div>

              {selectedOption === 'single' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="quantity" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Quantity
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: `1px solid ${theme.colors.brand.cyan}`,
                      background: 'rgba(0,0,0,0.3)',
                      color: 'white',
                      width: '80px'
                    }}
                  />
                </div>
              )}

              <div style={{ 
                padding: '1rem',
                background: 'rgba(230, 80, 80, 0.1)',
                border: '1px solid rgba(230, 80, 80, 0.3)',
                borderRadius: '8px',
                marginTop: '1rem'
              }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>
                  ⚠️ Payment not completed - we'll process and notify you. You can schedule now while we finalize payment.
                </p>
              </div>
            </ModalBody>

            <ModalFooter>
              <GlowButton
                variant="purple"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </GlowButton>
              <GlowButton
                variant="primary"
                onClick={handlePurchase}
                isLoading={isProcessing}
              >
                Grant Credits & Continue to Booking
              </GlowButton>
            </ModalFooter>
          </ModalContent>
        </ModalBackdrop>
      )}
    </AnimatePresence>
  );
};

export default PurchaseCreditsModal;