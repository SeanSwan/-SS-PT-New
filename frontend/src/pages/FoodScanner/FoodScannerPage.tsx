/**
 * FoodScannerPage
 * ===============
 * Public food ingredient scanner — barcode scan / product search / scan history.
 * Phase 4E (2026-08-04): styles extracted to FoodScannerPage.styles.ts and fully
 * tokenized (51 raw color literals removed); framer animations now respect
 * prefers-reduced-motion. Logic, API calls, and component structure unchanged.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import BarcodeScanner from '../../components/FoodScanner/BarcodeScanner';
import ProductAnalysis, { foodScannerRatingLabel, type FoodProduct } from '../../components/FoodScanner/ProductAnalysis';
import axios from 'axios';
import { StyledBox } from '@/components/ui/StyledBox';
import {
  ContentContainer,
  ErrorMessage,
  FavoriteStar,
  Header,
  InstructionsCard,
  LoadingContainer,
  LoadingSpinner,
  LoadingText,
  NoResultsMessage,
  PageContainer,
  PrimaryActionButton,
  ScanHistoryContent,
  ScanHistoryDetails,
  ScanHistoryImage,
  ScanHistoryItem,
  ScanHistoryList,
  ScanHistoryName,
  ScanHistoryRating,
  ScanResultsContainer,
  SearchButton,
  SearchContainer,
  SearchInput,
  SecondaryActionButton,
  Step,
  StepContent,
  StepNumber,
  StepsList,
  Subtitle,
  TabButton,
  TabsContainer,
  Title,
} from './FoodScannerPage.styles';

// Types
// /api/food-scanner/history returns a denormalized scan log (backend schema-truth fix
// 2026-07-29): rows carry productName/productCode/imageUrl directly — there is NO nested
// product object, and favorites/ratings need a DB migration before they can return (SWA-87).
// The legacy optional fields below keep old code paths compile-safe; they are absent from
// API responses today, so every consumer must optional-chain them.
interface ScanHistoryItemShape {
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
  const [scanHistory, setScanHistory] = useState<ScanHistoryItemShape[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const { isAuthenticated, authAxios } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  /** prefers-reduced-motion guard: collapse enter/exit transitions to instant. */
  const motionTransition = prefersReducedMotion ? { duration: 0 } : { duration: 0.3 };
  const spinnerAnimate = prefersReducedMotion ? undefined : { rotate: 360 };
  const spinnerTransition = prefersReducedMotion
    ? undefined
    : { duration: 1, repeat: Infinity, ease: 'linear' as const };

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
      } else {
        // Scan-history rows are a denormalized log with no editable columns, so no row ever
        // matches here and the endpoint answers 400 by design. Say so instead of silently doing
        // nothing — a button that no-ops with zero feedback reads as a broken app (rule 75).
        toast({
          title: 'Favorites not available yet',
          description: 'Saving products to favorites is coming soon. Your scan is still in your history.',
        });
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
          initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
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
              initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
              transition={motionTransition}
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
                  <LoadingSpinner animate={spinnerAnimate} transition={spinnerTransition} />
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
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
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
                        <SecondaryActionButton
                          type="button"
                          onClick={() => {
                            setScannedProduct(null);
                          }}
                        >
                          Scan Another Product
                        </SecondaryActionButton>
                      </StyledBox>
                    </ScanResultsContainer>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history-tab"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
              transition={motionTransition}
            >
              {!isAuthenticated ? (
                <InstructionsCard>
                  <h3>Login Required</h3>
                  <StyledBox as="p" $style={{ margin: '1rem 0' }}>
                    Please login to view your scan history and save products
                  </StyledBox>
                  <PrimaryActionButton type="button" onClick={() => navigate('/login')}>
                    Login
                  </PrimaryActionButton>
                </InstructionsCard>
              ) : loading ? (
                <LoadingContainer>
                  <LoadingSpinner animate={spinnerAnimate} transition={spinnerTransition} />
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
                    // Only rows that still carry a nested product object can be
                    // re-opened. Post-SWA-87 rows are denormalized scan records
                    // (productName/productCode/imageUrl) with no product object, so
                    // advertising role="button" on them would hand keyboard and
                    // screen-reader users a control that does nothing.
                    <ScanHistoryItem
                      key={scan.id}
                      role={scan.product ? 'button' : undefined}
                      tabIndex={scan.product ? 0 : undefined}
                      onKeyDown={scan.product
                        ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }
                        : undefined}
                      onClick={scan.product ? () => handleHistoryItemClick(scan.product!) : undefined}
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
                      {scan.isFavorite && <FavoriteStar>&#9733;</FavoriteStar>}
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
