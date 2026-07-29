import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import BarcodeScanner from '../../components/FoodScanner/BarcodeScanner';
import ProductAnalysis, { foodScannerRatingLabel, type FoodProduct } from '../../components/FoodScanner/ProductAnalysis';
import axios from 'axios';
import { StyledBox } from '@/components/ui/StyledBox';

// Styled components
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-secondary, #002060), var(--bg-elevated, #1e1e3f));
  color: var(--text-primary, #E0ECF4);
  padding: 1rem 1rem 6rem;
`;

const Header = styled.div`
  text-align: center;
  padding: 1rem 0 2rem;
`;

const Title = styled(motion.h1)`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 300;
  background: linear-gradient(to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const ContentContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const ScanResultsContainer = styled(motion.div)`
  width: 100%;
`;

const InstructionsCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 15px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
  text-align: left;
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const StepNumber = styled.div`
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
`;

const SearchContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  flex: 1;
  background: rgba(30, 30, 60, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 0 0 8px;
  padding: 0.8rem 1rem;
  color: white;
  font-size: 0.9rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const SearchButton = styled.button`
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  padding: 0 1.5rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: linear-gradient(135deg, #8961b9, #20ffff);
  }
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button<{ $active: boolean }>`
  background: transparent;
  color: ${({ $active }) => $active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  border: none;
  padding: 0.8rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => $active ? '#60C0F0' : 'transparent'};
  transition: all 0.3s ease;

  &:hover {
    color: white;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

const LoadingSpinner = styled(motion.div)`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #60C0F0;
  margin-bottom: 1rem;
`;

const LoadingText = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 70, 70, 0.1);
  border: 1px solid rgba(255, 70, 70, 0.2);
  color: rgba(255, 255, 255, 0.9);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
`;

const ScanHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ScanHistoryItem = styled.div`
  background: rgba(30, 30, 60, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
`;

const ScanHistoryImage = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ScanHistoryContent = styled.div`
  flex: 1;
`;

const ScanHistoryName = styled.div`
  font-weight: 500;
  margin-bottom: 0.2rem;
`;

const ScanHistoryDetails = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
`;

const ScanHistoryRating = styled.div<{ rating: string }>`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: ${({ rating }) => {
    switch (rating) {
      case 'good': return 'rgba(0, 200, 83, 0.2)';
      case 'bad': return 'rgba(255, 70, 70, 0.2)';
      case 'okay': return 'rgba(255, 193, 7, 0.2)';
      default: return 'rgba(100, 100, 100, 0.2)';
    }
  }};
  color: ${({ rating }) => {
    switch (rating) {
      case 'good': return '#00c853';
      case 'bad': return '#ff4646';
      case 'okay': return '#ffc107';
      default: return '#aaa';
    }
  }};
  border: 1px solid ${({ rating }) => {
    switch (rating) {
      case 'good': return 'rgba(0, 200, 83, 0.3)';
      case 'bad': return 'rgba(255, 70, 70, 0.3)';
      case 'okay': return 'rgba(255, 193, 7, 0.3)';
      default: return 'rgba(100, 100, 100, 0.3)';
    }
  }};
`;

const NoResultsMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
`;

// Types
// /api/food-scanner/history returns a denormalized scan log (backend schema-truth fix
// 2026-07-29): rows carry productName/productCode/imageUrl directly — there is NO nested
// product object, and favorites/ratings need a DB migration before they can return (SWA-87).
// The legacy optional fields below keep old code paths compile-safe; they are absent from
// API responses today, so every consumer must optional-chain them.
interface ScanHistoryItem {
  id: number;
  scanDate: string;
  productName: string;
  productCode?: string | null;
  imageUrl?: string | null;
  userRating?: number | null;
  isFavorite?: boolean;
  product?: FoodProduct;
}

const HISTORY_ERROR_COPY = 'Scan history is temporarily unavailable. Please try again.';
const SCAN_ERROR_COPY = 'Could not retrieve that product. Try another barcode or search.';
const PRODUCT_DETAILS_ERROR_COPY = 'Could not retrieve product details. Please try again.';
const SEARCH_ERROR_COPY = 'Product search is temporarily unavailable. Please try again.';
const SAVE_PRODUCT_ERROR_COPY = 'Could not update that product right now.';
const LOG_PRODUCT_ERROR_COPY = 'Could not log that product right now.';

// Main component
const FoodScannerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<FoodProduct | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const { isAuthenticated, authAxios } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch user's scan history
  const fetchScanHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAxios.get('/api/food-scanner/history');

      if (response.data && response.data.success) {
        setScanHistory(response.data.scans);
      } else {
        setError(HISTORY_ERROR_COPY);
      }
    } catch (error: any) {
      console.error('Error fetching scan history:', error);
      setError(HISTORY_ERROR_COPY);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Fetch scan history if user is authenticated
  useEffect(() => {
    if (isAuthenticated && activeTab === 'history') {
      fetchScanHistory();
    }
  }, [isAuthenticated, activeTab, fetchScanHistory]);

  // Handle barcode detection
  const handleBarcodeDetected = async (barcode: string) => {
    try {
      setLoading(true);
      setError(null);

      // Clear previous scan
      setScannedProduct(null);

      // Call API to get product information
      const api = isAuthenticated ? authAxios : axios;
      const response = await api.get(`/api/food-scanner/scan/${barcode}`);

      if (response.data && response.data.success) {
        setScannedProduct(response.data.product);
      } else {
        setError(SCAN_ERROR_COPY);
      }
    } catch (error: any) {
      console.error('Error processing barcode:', error);
      setError(SCAN_ERROR_COPY);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'scan' | 'history') => {
    setActiveTab(tab);

    // Clear any scan results when switching to history tab
    if (tab === 'history') {
      setScannedProduct(null);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchInput.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Clear previous scan
      setScannedProduct(null);

      // Call API to search for products
      const api = isAuthenticated ? authAxios : axios;
      const response = await api.get(`/api/food-scanner/search?query=${encodeURIComponent(searchInput)}`);

      if (response.data && response.data.success && response.data.products.length > 0) {
        // Get the first product
        const productId = response.data.products[0].id;

        // Fetch full product details
        const productResponse = await api.get(`/api/food-scanner/product/${productId}`);

        if (productResponse.data && productResponse.data.success) {
          setScannedProduct(productResponse.data.product);
        } else {
          setError(PRODUCT_DETAILS_ERROR_COPY);
        }
      } else {
        setError('No products found matching your search');
      }
    } catch (error: any) {
      console.error('Error searching for product:', error);
      setError(SEARCH_ERROR_COPY);
    } finally {
      setLoading(false);
    }
  };

  // Handle saving a scanned product
  const handleSaveProduct = async (isFavorite: boolean) => {
    if (!isAuthenticated || !scannedProduct) return;

    try {
      // Find the scan in history (history rows carry no product object today — this only
      // matches legacy-shaped rows, and the favorites endpoint answers 400 until an additive
      // migration restores editable scan fields)
      const scan = scanHistory.find(item => item.product?.id === scannedProduct.id);

      if (scan) {
        // Update existing scan
        await authAxios.put(`/api/food-scanner/history/${scan.id}`, {
          isFavorite
        });

        toast({
          title: isFavorite ? 'Product Saved' : 'Product Removed',
          description: isFavorite ?
            'Product has been added to your favorites' :
            'Product has been removed from your favorites',
        });

        // Refresh scan history
        if (activeTab === 'history') {
          fetchScanHistory();
        }
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: SAVE_PRODUCT_ERROR_COPY,
        variant: 'destructive'
      });
    }
  };

  // Handle clicking on a history item
  const handleHistoryItemClick = (product: FoodProduct) => {
    setScannedProduct(product);
    setActiveTab('scan');
  };

  // Handle adding scanned product to daily food log
  const handleAddToLog = async (mealType: string) => {
    if (!isAuthenticated || !scannedProduct) return;

    try {
      setLogLoading(true);

      await authAxios.post('/api/food-scanner/log-scan', {
        barcode: scannedProduct.barcode,
        mealType,
        servingSizeGrams: 100,
      });

      toast({
        title: 'Added to Food Log',
        description: `${scannedProduct.name} logged as ${mealType}`,
      });
    } catch (error: any) {
      console.error('Error logging scanned product:', error);
      toast({
        title: 'Log Error',
        description: LOG_PRODUCT_ERROR_COPY,
        variant: 'destructive',
      });
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Food Ingredient Scanner
        </Title>
        <Subtitle>
          Scan food products to review ingredient and nutrition signals before logging them
        </Subtitle>
      </Header>

      <ContentContainer>
        <TabsContainer>
          <TabButton
            $active={activeTab === 'scan'}
            onClick={() => handleTabChange('scan')}
          >
            Scanner
          </TabButton>
          <TabButton
            $active={activeTab === 'history'}
            onClick={() => handleTabChange('history')}
            disabled={!isAuthenticated}
          >
            History
          </TabButton>
        </TabsContainer>

        <AnimatePresence mode="wait">
          {activeTab === 'scan' ? (
            <motion.div
              key="scan-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {!scannedProduct && (
                <>
                  <SearchContainer>
                    <SearchInput
                      placeholder="Search by product name or barcode"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <SearchButton onClick={handleSearch}>
                      Search
                    </SearchButton>
                  </SearchContainer>

                  <InstructionsCard>
                    <h3>How It Works</h3>
                    <StepsList>
                      <Step>
                        <StepNumber>1</StepNumber>
                        <StepContent>
                          Tap &quot;Scan with Camera&quot; to activate your device&apos;s camera
                        </StepContent>
                      </Step>
                      <Step>
                        <StepNumber>2</StepNumber>
                        <StepContent>
                          Point your camera at a product barcode and hold steady
                        </StepContent>
                      </Step>
                      <Step>
                        <StepNumber>3</StepNumber>
                        <StepContent>
                          View ingredient classifications and nutrition information
                        </StepContent>
                      </Step>
                    </StepsList>
                  </InstructionsCard>
                </>
              )}

              {error && (
                <ErrorMessage>{error}</ErrorMessage>
              )}

              {loading ? (
                <LoadingContainer>
                  <LoadingSpinner
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  <LoadingText>Processing...</LoadingText>
                </LoadingContainer>
              ) : (
                <>
                  {!scannedProduct ? (
                    <BarcodeScanner
                      onDetected={handleBarcodeDetected}
                      disabled={loading}
                    />
                  ) : (
                    <ScanResultsContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <ProductAnalysis
                        product={scannedProduct}
                        onSave={handleSaveProduct}
                        onAddToLog={isAuthenticated ? handleAddToLog : undefined}
                        logLoading={logLoading}
                        isFavorite={scanHistory.some(item =>
                          item.product?.id === scannedProduct.id && item.isFavorite
                        )}
                      />

                      <StyledBox as="div" $style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <StyledBox as="button"
                          onClick={() => {
                            setScannedProduct(null);
                          }}
                          $style={{
                            background: 'rgba(60, 60, 100, 0.5)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.8rem 1.5rem',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          Scan Another Product
                        </StyledBox>
                      </StyledBox>
                    </ScanResultsContainer>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {!isAuthenticated ? (
                <InstructionsCard>
                  <h3>Login Required</h3>
                  <StyledBox as="p" $style={{ margin: '1rem 0' }}>
                    Please login to view your scan history and save products
                  </StyledBox>
                  <StyledBox as="button"
                    onClick={() => navigate('/login')}
                    $style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.8rem 1.5rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Login
                  </StyledBox>
                </InstructionsCard>
              ) : loading ? (
                <LoadingContainer>
                  <LoadingSpinner
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  <LoadingText>Loading scan history...</LoadingText>
                </LoadingContainer>
              ) : error ? (
                <ErrorMessage>{error}</ErrorMessage>
              ) : scanHistory.length === 0 ? (
                <NoResultsMessage>
                  Your scan history is empty. Start scanning products to build your history.
                </NoResultsMessage>
              ) : (
                <ScanHistoryList>
                  {scanHistory.map((scan) => (
                    <ScanHistoryItem
                      key={scan.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                      onClick={() => scan.product && handleHistoryItemClick(scan.product)}
                    >
                      <StyledBox as={ScanHistoryImage}
                        $style={{
                          backgroundImage: `url(${scan.product?.imageUrl || scan.imageUrl || '/placeholder-product.jpg'})`
                        }}
                      />
                      <ScanHistoryContent>
                        <ScanHistoryName>{scan.product?.name ?? scan.productName}</ScanHistoryName>
                        <ScanHistoryDetails>
                          <div>{scan.product?.brand || scan.productCode || 'Unknown Brand'}</div>
                          <div>
                            {new Date(scan.scanDate).toLocaleDateString()}
                          </div>
                        </ScanHistoryDetails>
                      </ScanHistoryContent>
                      <ScanHistoryRating rating={scan.product?.overallRating ?? ''}>
                        {foodScannerRatingLabel(scan.product?.overallRating ?? '')}
                      </ScanHistoryRating>
                      {scan.isFavorite && (
                        <StyledBox as="div" $style={{ color: '#ffc107', fontSize: '1.2rem' }}>&#9733;</StyledBox>
                      )}
                    </ScanHistoryItem>
                  ))}
                </ScanHistoryList>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ContentContainer>
    </PageContainer>
  );
};

export default FoodScannerPage;
