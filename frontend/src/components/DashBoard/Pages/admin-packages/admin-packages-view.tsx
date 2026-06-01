// admin-packages-view.tsx
// Migrated from MUI to styled-components + lucide-react (Crystalline Swan theme)
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";
import GlowButton from '../../../ui/buttons/GlowButton';

// Import Icons
import {
  Search,
  Edit,
  Package,
  DollarSign,
  Users,
  Plus,
  Download,
  Trash2,
  CheckCircle,
  RefreshCw,
  Send,
  CheckSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Reuse the styled components
import {
  PageContainer,
  ContentContainer,
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  StatsGridContainer,
  StatsCard,
  StatsIconContainer,
  StatsValue,
  StatsLabel,
  FilterContainer,
  FilterButtonsContainer,
  FilterButton,
  StyledTableContainer,
  StyledTableHead,
  StyledTableHeadCell,
  StyledTableCell,
  StyledTableRow,
  ChipContainer,
  IconButtonContainer,
  StyledIconButton,
  FooterActionsContainer,
  LoadingContainer,
  LoadingSpinner,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
  StyledDialog,
  DialogPanel,
  DialogTitleBar,
  DialogContentArea,
  DialogActionsBar,
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from '../admin-sessions/styled-admin-sessions';
import { logger } from '@/utils/logger';
import {
  BodyText,
  CaptionText,
  DialogHintText,
  FlexCol,
  FlexRow,
  Heading5,
  Heading6,
  InfoPanel,
  OfferHeaderRow,
  SearchIconSpan,
  SearchInput,
  SearchInputWrapper,
  SubtitleText
} from './admin-packages-view.layoutStyles';
import {
  AvatarCircle,
  CenteredFormField,
  ClientCheckItem,
  ClientListContainer,
  DiscountInput,
  DiscountInputWrapper,
  DiscountSuffix,
  FormField,
  FormGrid,
  FormGridFull,
  FormGroupLabel,
  FormInput,
  FormInputAccent,
  FormLabel,
  FormSelect,
  FormTextarea,
  HiddenCheckbox,
  SelectedClientIcon,
  SwitchLabel,
  SwitchThumb,
  SwitchTrack
} from './admin-packages-view.formStyles';
import {
  CapitalizedChip,
  PackagesTable,
  PaginationButton,
  PaginationContainer,
  PaginationSelect,
  RightAlignedCell,
  RightAlignedHeadCell,
  RowOpacityWrapper,
  ThemeDot
} from './admin-packages-view.tableStyles';

// Interface for session package data
interface SessionPackage {
  id: number;
  name: string;
  packageType: 'fixed' | 'monthly';
  description: string | null;
  price: number;
  displayPrice?: number;
  pricePerSession: number;
  sessions?: number | null;
  months?: number | null;
  sessionsPerWeek?: number | null;
  totalSessions?: number | null;
  totalCost?: number | null;
  imageUrl?: string | null;
  theme?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Interface for client data (simplified)
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message || fallback;
  if (isRecord(err)) {
    const response = err.response;
    if (isRecord(response)) {
      const data = response.data;
      if (isRecord(data) && typeof data.message === 'string') return data.message;
    }
    if (typeof err.message === 'string') return err.message;
  }
  return fallback;
};

/**
 * Admin Session Packages Management View
 *
 * Provides a comprehensive interface for managing training session packages:
 * - View all available packages
 * - Edit existing packages
 * - Create new packages
 * - Send special offers to clients
 */
const AdminPackagesView: React.FC = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();

  // State for data, loading and errors
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [, setLoadingClients] = useState(false);

  // State for UI controls
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // State for dialogs
  const [selectedPackage, setSelectedPackage] = useState<SessionPackage | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openSendOfferDialog, setOpenSendOfferDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Form state for edit package
  const [editPackageName, setEditPackageName] = useState('');
  const [editPackageDescription, setEditPackageDescription] = useState('');
  const [editPackageType, setEditPackageType] = useState<'fixed' | 'monthly'>('fixed');
  const [editPricePerSession, setEditPricePerSession] = useState<number>(0);
  const [editSessions, setEditSessions] = useState<number>(0);
  const [editMonths, setEditMonths] = useState<number>(0);
  const [editSessionsPerWeek, setEditSessionsPerWeek] = useState<number>(0);
  const [editTheme, setEditTheme] = useState('cosmic');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Form state for new package
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageDescription, setNewPackageDescription] = useState('');
  const [newPackageType, setNewPackageType] = useState<'fixed' | 'monthly'>('fixed');
  const [newPricePerSession, setNewPricePerSession] = useState<number>(175);
  const [newSessions, setNewSessions] = useState<number>(8);
  const [newMonths, setNewMonths] = useState<number>(3);
  const [newSessionsPerWeek, setNewSessionsPerWeek] = useState<number>(4);
  const [newTheme, setNewTheme] = useState('cosmic');

  // State for sending special offer
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [offerDiscount, setOfferDiscount] = useState<number>(10);
  const [offerMessage, setOfferMessage] = useState<string>('');

  // Stats summary data
  const [statsData, setStatsData] = useState({
    totalPackages: 0,
    activePackages: 0,
    purchasesThisMonth: 0,
    averagePrice: 0
  });

  // Fetch packages from API
  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!authAxios.get) {
        console.error('authAxios.get is not available');
        return;
      }
      const response = await authAxios.get('/api/admin/storefront');

      if (response.data && response.data.success && Array.isArray(response.data.items)) {
        setPackages(response.data.items);

        // Calculate stats
        const activePackagesCount = response.data.items.filter((pkg: SessionPackage) => pkg.isActive).length;
        const totalPrices = response.data.items.reduce((sum: number, pkg: SessionPackage) => sum + (Number(pkg.price) || 0), 0);
        const avgPrice = response.data.items.length > 0 ? Math.round(totalPrices / response.data.items.length) : 0;

        setStatsData({
          totalPackages: response.data.items.length,
          activePackages: activePackagesCount,
          purchasesThisMonth: 0, // This would need a separate API call
          averagePrice: avgPrice
        });

        toast({
          title: "Success",
          description: "Packages loaded successfully",
        });
      } else {
        logger.warn('Received unexpected data structure for packages:', response.data);
        setError('Failed to fetch packages: Invalid format');
        toast({
          title: "Error",
          description: "Failed to load packages (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      console.error('Error fetching packages:', err);
      const errorMsg = getErrorMessage(err, 'Error connecting to the server');
      setError(errorMsg);
      toast({
        title: "Error",
        description: `Could not load packages: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients for sending offers
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await authAxios.get('/api/auth/clients');

      const clientsData = response.data?.clients || response.data;
      if (clientsData && Array.isArray(clientsData)) {
        setClients(clientsData);
      } else {
        logger.warn('Received unexpected data structure for clients:', response.data);
        toast({
          title: "Warning",
          description: "Failed to load clients (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      console.error('Error fetching clients:', err);
      const errorMsg = getErrorMessage(err, 'Could not load clients');
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPackages();
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle pagination changes
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter packages based on search term and package type filter
  const filteredPackages = packages.filter(pkg => {
    const matchesSearch =
      (pkg.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.id?.toString() || '').includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || pkg.packageType === typeFilter;

    return matchesSearch && matchesType;
  });

  // Format currency for display
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  // Calculate total price
  const calculateTotalPrice = (pkg: SessionPackage): number => {
    let totalPrice = 0;

    if (pkg.packageType === 'fixed' && pkg.sessions) {
      totalPrice = pkg.pricePerSession * pkg.sessions;
    } else if (pkg.packageType === 'monthly' && pkg.months && pkg.sessionsPerWeek) {
      // Assume 4 weeks per month for calculation
      const totalSessions = pkg.months * pkg.sessionsPerWeek * 4;
      totalPrice = pkg.pricePerSession * totalSessions;
    }

    return totalPrice;
  };

  // Handle edit package dialog
  const handleEditPackage = (pkg: SessionPackage) => {
    setSelectedPackage(pkg);
    setEditPackageName(pkg.name || '');
    setEditPackageDescription(pkg.description || '');
    setEditPackageType(pkg.packageType || 'fixed');
    setEditPricePerSession(pkg.pricePerSession || 0);
    setEditSessions(pkg.sessions || 0);
    setEditMonths(pkg.months || 0);
    setEditSessionsPerWeek(pkg.sessionsPerWeek || 0);
    setEditTheme(pkg.theme || 'cosmic');
    setEditIsActive(pkg.isActive ?? true);
    setOpenEditDialog(true);
  };

  // Handle save edited package
  const handleSaveEditedPackage = async () => {
    if (!selectedPackage) return;

    try {
      const totalSessions = editPackageType === 'monthly'
        ? editMonths * editSessionsPerWeek * 4
        : editSessions;

      const totalCost = editPricePerSession * totalSessions;

      const updatedPackageData = {
        name: editPackageName,
        packageType: editPackageType,
        description: editPackageDescription,
        pricePerSession: editPricePerSession,
        sessions: editPackageType === 'fixed' ? editSessions : null,
        months: editPackageType === 'monthly' ? editMonths : null,
        sessionsPerWeek: editPackageType === 'monthly' ? editSessionsPerWeek : null,
        totalSessions: totalSessions,
        totalCost: totalCost,
        price: totalCost, // Set price field to match totalCost
        displayPrice: totalCost, // Set displayPrice as well
        theme: editTheme,
        isActive: editIsActive
      };

      const response = await authAxios.put(`/api/admin/storefront/${selectedPackage.id}`, updatedPackageData);

      if (response.status === 200 || response.status === 201) {
        toast({
          title: "Success",
          description: "Package updated successfully",
        });

        fetchPackages(); // Refresh packages list
        setOpenEditDialog(false);
      } else {
        logger.warn('Package update returned status:', response.status);
        toast({
          title: "Warning",
          description: `Package updated, but received status: ${response.status}`,
          variant: "default",
        });
        fetchPackages();
        setOpenEditDialog(false);
      }
    } catch (err: unknown) {
      console.error('Error updating package:', err);
      const errorMsg = getErrorMessage(err, 'Server error updating package');
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle create new package
  const handleCreateNewPackage = async () => {
    try {
      const totalSessions = newPackageType === 'monthly'
        ? newMonths * newSessionsPerWeek * 4
        : newSessions;

      const totalCost = newPricePerSession * totalSessions;

      const newPackageData = {
        name: newPackageName,
        packageType: newPackageType,
        description: newPackageDescription,
        pricePerSession: newPricePerSession,
        sessions: newPackageType === 'fixed' ? newSessions : null,
        months: newPackageType === 'monthly' ? newMonths : null,
        sessionsPerWeek: newPackageType === 'monthly' ? newSessionsPerWeek : null,
        totalSessions: totalSessions,
        totalCost: totalCost,
        price: totalCost, // Set price field to match totalCost
        displayPrice: totalCost, // Set displayPrice as well
        theme: newTheme,
        isActive: true
      };

      const response = await authAxios.post('/api/admin/storefront', newPackageData);

      if (response.status === 201) {
        toast({
          title: "Success",
          description: "New package created successfully",
        });

        fetchPackages(); // Refresh packages list
        setOpenNewDialog(false);

        // Reset form fields
        setNewPackageName('');
        setNewPackageDescription('');
        setNewPackageType('fixed');
        setNewPricePerSession(175);
        setNewSessions(8);
        setNewMonths(3);
        setNewSessionsPerWeek(4);
        setNewTheme('cosmic');
      } else {
        logger.warn('Package creation returned status:', response.status);
        toast({
          title: "Warning",
          description: `Package created, but received status: ${response.status}`,
          variant: "default",
        });
        fetchPackages();
        setOpenNewDialog(false);
      }
    } catch (err: unknown) {
      console.error('Error creating package:', err);
      const errorMsg = getErrorMessage(err, 'Server error creating package');
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle send special offer
  const handleSendSpecialOffer = async () => {
    if (!selectedPackage) return;
    if (selectedClients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one client to send the offer to",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate discounted price
      const originalPrice = selectedPackage.price || calculateTotalPrice(selectedPackage);
      const discountAmount = (originalPrice * offerDiscount) / 100;
      const discountedPrice = originalPrice - discountAmount;

      const offerData = {
        packageId: selectedPackage.id,
        clientIds: selectedClients,
        discountPercentage: offerDiscount,
        originalPrice: originalPrice,
        discountedPrice: discountedPrice,
        message: offerMessage,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };

      const response = await authAxios.post('/api/admin/special-offers', offerData);

      if (response.status === 201 || response.status === 200) {
        toast({
          title: "Success",
          description: `Offer sent to ${selectedClients.length} client(s)`,
        });
        setOpenSendOfferDialog(false);
        setSelectedClients([]);
        setOfferDiscount(10);
        setOfferMessage('');
      } else {
        toast({
          title: "Warning",
          description: `Unexpected response when sending offer: ${response.status}`,
          variant: "default",
        });
      }
    } catch (err: unknown) {
      console.error('Error sending special offer:', err);
      const errorMsg = getErrorMessage(err, 'Server error sending offer');
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle delete package confirmation
  const handleDeletePackage = async () => {
    if (!selectedPackage) return;

    try {
      const response = await authAxios.delete(`/api/admin/storefront/${selectedPackage.id}`);

      if (response.status === 200 || response.status === 204) {
        toast({
          title: "Success",
          description: "Package deleted successfully",
        });
        fetchPackages();
        setOpenDeleteDialog(false);
      } else {
        logger.warn('Package deletion returned status:', response.status);
        toast({
          title: "Warning",
          description: `Unexpected response when deleting package: ${response.status}`,
          variant: "default",
        });
        fetchPackages();
        setOpenDeleteDialog(false);
      }
    } catch (err: unknown) {
      console.error('Error deleting package:', err);
      const errorMsg = getErrorMessage(err, 'Server error deleting package');
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Refresh data
  const handleRefreshData = () => {
    toast({ title: "Refreshing...", description: "Fetching latest package data." });
    fetchPackages();
    fetchClients();
  };

  // Toggle client selection for offers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Pagination computed values
  const totalPages = Math.ceil(filteredPackages.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredPackages.length);

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <StyledCard as={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <FlexRow $gap="0.75rem">
                  <Package size={28} />
                  <Heading5>Session Packages Management</Heading5>
                </FlexRow>
              </CardTitle>
              <FlexRow $gap="0.75rem">
                <GlowButton
                  text="Create Package"
                  theme="emerald"
                  size="small"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setOpenNewDialog(true)}
                />
                <GlowButton
                  text="Refresh"
                  theme="purple"
                  size="small"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={handleRefreshData}
                  isLoading={loading}
                />
              </FlexRow>
            </CardHeader>

            <CardContent>
              {/* Stats Cards */}
              <StatsGridContainer>
                 {/* Stats Card 1: Total Packages */}
                 <StatsCard $variant="primary" as={motion.div} custom={0} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="primary"><Package size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.totalPackages}</StatsValue>
                             <StatsLabel>Total Packages</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 2: Active Packages */}
                 <StatsCard $variant="success" as={motion.div} custom={1} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="success"><CheckCircle size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.activePackages}</StatsValue>
                             <StatsLabel>Active Packages</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 3: Purchases This Month */}
                 <StatsCard $variant="info" as={motion.div} custom={2} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="info"><Users size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.purchasesThisMonth}</StatsValue>
                             <StatsLabel>Purchases This Month</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 4: Average Price */}
                 <StatsCard $variant="warning" as={motion.div} custom={3} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="warning"><DollarSign size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : formatCurrency(statsData.averagePrice)}</StatsValue>
                             <StatsLabel>Average Package Price</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
              </StatsGridContainer>

              {/* Filters and Search */}
              <FilterContainer as={motion.div} variants={itemVariants}>
                 <SearchInputWrapper>
                   <SearchIconSpan><Search size={20} /></SearchIconSpan>
                   <SearchInput
                     placeholder="Search packages..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </SearchInputWrapper>
                 <FilterButtonsContainer>
                     {/* Filter Buttons */}
                     <FilterButton
                        $isActive={typeFilter === 'all'}
                        onClick={() => setTypeFilter('all')}
                     >
                        All Types
                     </FilterButton>
                     <FilterButton
                        $isActive={typeFilter === 'fixed'}
                        $buttonColor="primary"
                        onClick={() => setTypeFilter('fixed')}
                     >
                        Fixed Sessions
                     </FilterButton>
                     <FilterButton
                        $isActive={typeFilter === 'monthly'}
                        $buttonColor="success"
                        onClick={() => setTypeFilter('monthly')}
                     >
                        Monthly Subscriptions
                     </FilterButton>
                 </FilterButtonsContainer>
              </FilterContainer>

              {/* Packages Table */}
              {loading ? (
                <LoadingContainer><LoadingSpinner /></LoadingContainer>
              ) : error ? (
                 <EmptyStateContainer>
                    <EmptyStateIcon>⚠️</EmptyStateIcon>
                    <EmptyStateText>Error loading packages: {error}</EmptyStateText>
                    <GlowButton text="Retry" onClick={fetchPackages} theme="ruby" size="small" />
                 </EmptyStateContainer>
              ) : (
                <StyledTableContainer>
                  <PackagesTable aria-label="session packages table">
                    <thead>
                      <StyledTableHead>
                        <StyledTableHeadCell>Package Name</StyledTableHeadCell>
                        <StyledTableHeadCell>Type</StyledTableHeadCell>
                        <StyledTableHeadCell>Sessions/Duration</StyledTableHeadCell>
                        <StyledTableHeadCell>Price Per Session</StyledTableHeadCell>
                        <StyledTableHeadCell>Total Price</StyledTableHeadCell>
                        <StyledTableHeadCell>Status</StyledTableHeadCell>
                        <RightAlignedHeadCell>Actions</RightAlignedHeadCell>
                      </StyledTableHead>
                    </thead>
                    <tbody>
                      {filteredPackages.length > 0 ? (
                        filteredPackages
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((pkg, index) => (
                            <RowOpacityWrapper
                              key={pkg.id || index}
                              $dimmed={!pkg.isActive}
                              custom={index}
                              variants={staggeredItemVariants}
                              initial="hidden"
                              animate="visible"
                              layout
                            >
                              {/* Package Name */}
                              <StyledTableCell>
                                <FlexRow $gap="0.5rem">
                                  <ThemeDot $theme={pkg.theme || 'cosmic'}>
                                    {pkg.name.charAt(0)}
                                  </ThemeDot>
                                  <BodyText $weight={500}>
                                    {pkg.name}
                                  </BodyText>
                                </FlexRow>
                                {pkg.description && (
                                  <CaptionText
                                    $block
                                    $maxWidth="200px"
                                    $truncate
                                    $top="0.25rem"
                                  >
                                    {pkg.description}
                                  </CaptionText>
                                )}
                              </StyledTableCell>

                              {/* Package Type */}
                              <StyledTableCell>
                                <CapitalizedChip
                                  chipstatus={pkg.packageType === 'fixed' ? 'available' : 'confirmed'}
                                >
                                  {pkg.packageType}
                                </CapitalizedChip>
                              </StyledTableCell>

                              {/* Sessions/Duration */}
                              <StyledTableCell>
                                {pkg.packageType === 'fixed' ? (
                                  <BodyText>
                                    {pkg.sessions} sessions
                                  </BodyText>
                                ) : (
                                  <FlexCol>
                                    <BodyText>
                                      {pkg.months} months, {pkg.sessionsPerWeek}x/week
                                    </BodyText>
                                    <CaptionText>
                                      ({pkg.totalSessions || pkg.months! * pkg.sessionsPerWeek! * 4} total sessions)
                                    </CaptionText>
                                  </FlexCol>
                                )}
                              </StyledTableCell>

                              {/* Price Per Session */}
                              <StyledTableCell>
                                {formatCurrency(pkg.pricePerSession)}
                              </StyledTableCell>

                              {/* Total Price */}
                              <StyledTableCell>
                                <BodyText $weight={500} $color="var(--accent-primary, #60C0F0)">
                                  {formatCurrency(pkg.totalCost || pkg.price || calculateTotalPrice(pkg))}
                                </BodyText>
                              </StyledTableCell>

                              {/* Status */}
                              <StyledTableCell>
                                <ChipContainer
                                  chipstatus={pkg.isActive ? 'completed' : 'cancelled'}
                                >
                                  {pkg.isActive ? 'Active' : 'Inactive'}
                                </ChipContainer>
                              </StyledTableCell>

                              {/* Actions */}
                              <RightAlignedCell>
                                <IconButtonContainer>
                                  <StyledIconButton
                                    btncolor="primary"
                                    onClick={() => handleEditPackage(pkg)}
                                    title="Edit Package"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Edit size={16} />
                                  </StyledIconButton>
                                  <StyledIconButton
                                    btncolor="success"
                                    onClick={() => {
                                      setSelectedPackage(pkg);
                                      setOpenSendOfferDialog(true);
                                    }}
                                    title="Send Special Offer"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Send size={16} />
                                  </StyledIconButton>
                                  <StyledIconButton
                                    btncolor="error"
                                    onClick={() => {
                                      setSelectedPackage(pkg);
                                      setOpenDeleteDialog(true);
                                    }}
                                    title="Delete Package"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Trash2 size={16} />
                                  </StyledIconButton>
                                </IconButtonContainer>
                              </RightAlignedCell>
                            </RowOpacityWrapper>
                          ))
                      ) : (
                        <StyledTableRow>
                          <StyledTableCell colSpan={7}>
                            <EmptyStateContainer>
                              <EmptyStateIcon>📦</EmptyStateIcon>
                              <EmptyStateText>
                                No packages found matching your criteria.
                              </EmptyStateText>
                            </EmptyStateContainer>
                          </StyledTableCell>
                        </StyledTableRow>
                      )}
                    </tbody>
                  </PackagesTable>
                </StyledTableContainer>
              )}

              {/* Pagination */}
              {filteredPackages.length > 0 && (
                <PaginationContainer>
                  <span>Rows per page:</span>
                  <PaginationSelect
                    value={rowsPerPage}
                    onChange={handleChangeRowsPerPage}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </PaginationSelect>
                  <span>
                    {startIndex + 1}–{endIndex} of {filteredPackages.length}
                  </span>
                  <FlexRow $gap="0.25rem">
                    <PaginationButton
                      $disabled={page === 0}
                      onClick={() => handleChangePage(page - 1)}
                      title="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </PaginationButton>
                    <PaginationButton
                      $disabled={page >= totalPages - 1}
                      onClick={() => handleChangePage(page + 1)}
                      title="Next page"
                    >
                      <ChevronRight size={18} />
                    </PaginationButton>
                  </FlexRow>
                </PaginationContainer>
              )}

              {/* Action Buttons */}
              <FooterActionsContainer>
                <GlowButton
                  text="Create New Package"
                  theme="cosmic"
                  leftIcon={<Plus size={18} />}
                  onClick={() => setOpenNewDialog(true)}
                />
                <GlowButton
                  text="Export Packages"
                  theme="ruby"
                  leftIcon={<Download size={18} />}
                  onClick={() => {
                    toast({
                      title: "Feature Pending",
                      description: "Package data export is not yet implemented.",
                    });
                  }}
                  disabled={loading || filteredPackages.length === 0}
                />
              </FooterActionsContainer>
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* --- DIALOGS --- */}

      {/* Edit Package Dialog */}
      <StyledDialog $open={openEditDialog} onClick={() => setOpenEditDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Edit size={20} />
              <Heading6>Edit Package</Heading6>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogHintText>
              Update the details for this session package.
            </DialogHintText>
            <FormGrid>
              {/* Package Name */}
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="edit-package-name">Package Name *</FormLabel>
                  <FormInput
                    id="edit-package-name"
                    value={editPackageName}
                    onChange={(e) => setEditPackageName(e.target.value)}
                    required
                  />
                </FormField>
              </FormGridFull>

              {/* Package Type */}
              <FormField>
                <FormLabel htmlFor="edit-package-type">Package Type</FormLabel>
                <FormSelect
                  id="edit-package-type"
                  value={editPackageType}
                  onChange={(e) => setEditPackageType(e.target.value as 'fixed' | 'monthly')}
                >
                  <option value="fixed">Fixed Sessions</option>
                  <option value="monthly">Monthly Subscription</option>
                </FormSelect>
              </FormField>

              {/* Theme */}
              <FormField>
                <FormLabel htmlFor="edit-package-theme">Theme</FormLabel>
                <FormSelect
                  id="edit-package-theme"
                  value={editTheme}
                  onChange={(e) => setEditTheme(e.target.value)}
                >
                  <option value="cosmic">Cosmic (Blue/Purple)</option>
                  <option value="purple">Purple</option>
                  <option value="ruby">Ruby (Red)</option>
                  <option value="emerald">Emerald (Green)</option>
                </FormSelect>
              </FormField>

              {/* Price Per Session */}
              <FormField>
                <FormLabel htmlFor="edit-price-per-session">Price Per Session ($) *</FormLabel>
                <FormInput
                  id="edit-price-per-session"
                  type="number"
                  value={editPricePerSession}
                  onChange={(e) => setEditPricePerSession(Number(e.target.value))}
                  required
                  min={0}
                  step={5}
                />
              </FormField>

              {/* Sessions (for fixed packages) */}
              {editPackageType === 'fixed' && (
                <FormField>
                  <FormLabel htmlFor="edit-number-of-sessions">Number of Sessions *</FormLabel>
                  <FormInput
                    id="edit-number-of-sessions"
                    type="number"
                    value={editSessions}
                    onChange={(e) => setEditSessions(Number(e.target.value))}
                    required
                    min={1}
                  />
                </FormField>
              )}

              {/* Months (for monthly packages) */}
              {editPackageType === 'monthly' && (
                <>
                  <FormField>
                    <FormLabel htmlFor="edit-number-of-months">Number of Months *</FormLabel>
                    <FormInput
                      id="edit-number-of-months"
                      type="number"
                      value={editMonths}
                      onChange={(e) => setEditMonths(Number(e.target.value))}
                      required
                      min={1}
                    />
                  </FormField>
                  <FormField>
                    <FormLabel htmlFor="edit-sessions-per-week">Sessions Per Week *</FormLabel>
                    <FormInput
                      id="edit-sessions-per-week"
                      type="number"
                      value={editSessionsPerWeek}
                      onChange={(e) => setEditSessionsPerWeek(Number(e.target.value))}
                      required
                      min={1}
                    />
                  </FormField>
                </>
              )}

              {/* Total Price Preview */}
              <FormField>
                <FormLabel htmlFor="edit-total-price">Total Price</FormLabel>
                <FormInputAccent
                  id="edit-total-price"
                  readOnly
                  value={formatCurrency(editPackageType === 'fixed'
                    ? editPricePerSession * editSessions
                    : editPricePerSession * editMonths * editSessionsPerWeek * 4)}
                />
              </FormField>

              {/* Active Status */}
              <CenteredFormField>
                <SwitchLabel htmlFor="edit-package-active">
                  <HiddenCheckbox
                    id="edit-package-active"
                    type="checkbox"
                    checked={editIsActive ?? false}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                  />
                  <SwitchTrack $checked={editIsActive}>
                    <SwitchThumb $checked={editIsActive} />
                  </SwitchTrack>
                  Active and Visible
                </SwitchLabel>
              </CenteredFormField>

              {/* Description */}
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="edit-package-description">Description</FormLabel>
                  <FormTextarea
                    id="edit-package-description"
                    value={editPackageDescription}
                    onChange={(e) => setEditPackageDescription(e.target.value)}
                    rows={3}
                  />
                </FormField>
              </FormGridFull>
            </FormGrid>
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton
              text="Cancel"
              theme="cosmic"
              size="small"
              onClick={() => setOpenEditDialog(false)}
            />
            <GlowButton
              text="Save Changes"
              theme="emerald"
              size="small"
              leftIcon={<CheckSquare size={16} />}
              onClick={handleSaveEditedPackage}
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

      {/* New Package Dialog */}
      <StyledDialog $open={openNewDialog} onClick={() => setOpenNewDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Plus size={20} />
              <Heading6>Create New Package</Heading6>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogHintText>
              Create a new session package to offer to clients.
            </DialogHintText>
            <FormGrid>
              {/* Package Name */}
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="new-package-name">Package Name *</FormLabel>
                  <FormInput
                    id="new-package-name"
                    value={newPackageName}
                    onChange={(e) => setNewPackageName(e.target.value)}
                    required
                    placeholder="e.g., Gold Glimmer, Platinum Plus"
                  />
                </FormField>
              </FormGridFull>

              {/* Package Type */}
              <FormField>
                <FormLabel htmlFor="new-package-type">Package Type</FormLabel>
                <FormSelect
                  id="new-package-type"
                  value={newPackageType}
                  onChange={(e) => setNewPackageType(e.target.value as 'fixed' | 'monthly')}
                >
                  <option value="fixed">Fixed Sessions</option>
                  <option value="monthly">Monthly Subscription</option>
                </FormSelect>
              </FormField>

              {/* Theme */}
              <FormField>
                <FormLabel htmlFor="new-package-theme">Theme</FormLabel>
                <FormSelect
                  id="new-package-theme"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                >
                  <option value="cosmic">Cosmic (Blue/Purple)</option>
                  <option value="purple">Purple</option>
                  <option value="ruby">Ruby (Red)</option>
                  <option value="emerald">Emerald (Green)</option>
                </FormSelect>
              </FormField>

              {/* Price Per Session */}
              <FormField>
                <FormLabel htmlFor="new-price-per-session">Price Per Session ($) *</FormLabel>
                <FormInput
                  id="new-price-per-session"
                  type="number"
                  value={newPricePerSession}
                  onChange={(e) => setNewPricePerSession(Number(e.target.value))}
                  required
                  min={0}
                  step={5}
                />
              </FormField>

              {/* Sessions (for fixed packages) */}
              {newPackageType === 'fixed' && (
                <FormField>
                  <FormLabel htmlFor="new-number-of-sessions">Number of Sessions *</FormLabel>
                  <FormInput
                    id="new-number-of-sessions"
                    type="number"
                    value={newSessions}
                    onChange={(e) => setNewSessions(Number(e.target.value))}
                    required
                    min={1}
                  />
                </FormField>
              )}

              {/* Months (for monthly packages) */}
              {newPackageType === 'monthly' && (
                <>
                  <FormField>
                    <FormLabel htmlFor="new-number-of-months">Number of Months *</FormLabel>
                    <FormInput
                      id="new-number-of-months"
                      type="number"
                      value={newMonths}
                      onChange={(e) => setNewMonths(Number(e.target.value))}
                      required
                      min={1}
                    />
                  </FormField>
                  <FormField>
                    <FormLabel htmlFor="new-sessions-per-week">Sessions Per Week *</FormLabel>
                    <FormInput
                      id="new-sessions-per-week"
                      type="number"
                      value={newSessionsPerWeek}
                      onChange={(e) => setNewSessionsPerWeek(Number(e.target.value))}
                      required
                      min={1}
                    />
                  </FormField>
                </>
              )}

              {/* Total Price Preview */}
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="new-total-price-preview">Total Price (Preview)</FormLabel>
                  <FormInputAccent
                    id="new-total-price-preview"
                    readOnly
                    value={formatCurrency(newPackageType === 'fixed'
                      ? newPricePerSession * newSessions
                      : newPricePerSession * newMonths * newSessionsPerWeek * 4)}
                  />
                </FormField>
              </FormGridFull>

              {/* Description */}
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="new-package-description">Description</FormLabel>
                  <FormTextarea
                    id="new-package-description"
                    value={newPackageDescription}
                    onChange={(e) => setNewPackageDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the key benefits and features of this package..."
                  />
                </FormField>
              </FormGridFull>
            </FormGrid>
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton
              text="Cancel"
              theme="cosmic"
              size="small"
              onClick={() => setOpenNewDialog(false)}
            />
            <GlowButton
              text="Create Package"
              theme="emerald"
              size="small"
              leftIcon={<Plus size={16} />}
              onClick={handleCreateNewPackage}
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

      {/* Send Special Offer Dialog */}
      <StyledDialog $open={openSendOfferDialog} onClick={() => setOpenSendOfferDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Send size={20} />
              <Heading6>Send Special Offer</Heading6>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogHintText>
              Create a special promotional offer for the selected package and send it to specific clients.
            </DialogHintText>

            {selectedPackage && (
              <InfoPanel>
                <OfferHeaderRow $gap="0.5rem">
                  <Package size={20} />
                  <SubtitleText>{selectedPackage.name}</SubtitleText>
                </OfferHeaderRow>
                <BodyText $color="var(--text-secondary, rgba(224, 236, 244, 0.68))" $block $bottom="0.5rem">
                  {selectedPackage.packageType === 'fixed'
                    ? `${selectedPackage.sessions} sessions at ${formatCurrency(selectedPackage.pricePerSession)} per session`
                    : `${selectedPackage.months} months, ${selectedPackage.sessionsPerWeek} sessions/week at ${formatCurrency(selectedPackage.pricePerSession)} per session`
                  }
                </BodyText>
                <BodyText $weight={500} $color="var(--accent-primary, #60C0F0)">
                  Regular Price: {formatCurrency(selectedPackage.totalCost || selectedPackage.price || calculateTotalPrice(selectedPackage))}
                </BodyText>
              </InfoPanel>
            )}

            <FormGrid>
              {/* Client Selection */}
              <FormGridFull>
                <FormField>
                  <FormGroupLabel id="special-offer-client-list-label">Select Clients ({selectedClients.length} selected)</FormGroupLabel>
                  <ClientListContainer role="group" aria-labelledby="special-offer-client-list-label">
                    {clients.map((client) => (
                      <ClientCheckItem
                        key={client.id}
                        $selected={selectedClients.includes(client.id)}
                      >
                        <HiddenCheckbox
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                        />
                        <AvatarCircle $src={client.photo || undefined}>
                          {!client.photo && `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`}
                        </AvatarCircle>
                        <span>{client.firstName} {client.lastName}</span>
                        {selectedClients.includes(client.id) && (
                          <SelectedClientIcon size={14} />
                        )}
                      </ClientCheckItem>
                    ))}
                  </ClientListContainer>
                </FormField>
              </FormGridFull>

              {/* Discount Percentage */}
              <FormField>
                <FormLabel htmlFor="special-offer-discount">Discount (%) *</FormLabel>
                <DiscountInputWrapper>
                  <DiscountInput
                    id="special-offer-discount"
                    type="number"
                    value={offerDiscount}
                    onChange={(e) => setOfferDiscount(Math.min(Math.max(0, Number(e.target.value)), 100))}
                    required
                    min={0}
                    max={100}
                  />
                  <DiscountSuffix>%</DiscountSuffix>
                </DiscountInputWrapper>
              </FormField>

              {/* Discounted Price Preview */}
              <FormField>
                {selectedPackage && (
                  <>
                    <FormLabel htmlFor="special-offer-price">Special Offer Price</FormLabel>
                    <FormInputAccent
                      id="special-offer-price"
                      readOnly
                      value={formatCurrency(
                        (selectedPackage.totalCost || selectedPackage.price || calculateTotalPrice(selectedPackage)) * (1 - offerDiscount / 100)
                      )}
                    />
                  </>
                )}
              </FormField>

              {/* Personal Message */}
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="special-offer-message">Personal Message</FormLabel>
                  <FormTextarea
                    id="special-offer-message"
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    rows={3}
                    placeholder="Add a personal message to go with your offer..."
                  />
                </FormField>
              </FormGridFull>
            </FormGrid>
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton
              text="Cancel"
              theme="cosmic"
              size="small"
              onClick={() => setOpenSendOfferDialog(false)}
            />
            <GlowButton
              text="Send Offer"
              theme="emerald"
              size="small"
              leftIcon={<Send size={16} />}
              onClick={handleSendSpecialOffer}
              disabled={selectedClients.length === 0}
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

      {/* Delete Confirmation Dialog */}
      <StyledDialog $open={openDeleteDialog} onClick={() => setOpenDeleteDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Trash2 size={20} />
              <Heading6>Delete Package</Heading6>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogHintText>
              Are you sure you want to delete this package? This action cannot be undone.
            </DialogHintText>

            {selectedPackage && (
              <InfoPanel $borderColor="color-mix(in srgb, var(--danger, #ef4444) 26%, transparent)">
                <SubtitleText>{selectedPackage.name}</SubtitleText>
                <BodyText $color="var(--text-secondary, rgba(224, 236, 244, 0.68))" $block $top="0.25rem">
                  {selectedPackage.packageType === 'fixed'
                    ? `${selectedPackage.sessions} sessions`
                    : `${selectedPackage.months} months subscription`
                  }
                </BodyText>
              </InfoPanel>
            )}

            <BodyText $color="var(--danger, #ef4444)" $size="0.875rem" $block>
              Note: If clients have already purchased this package, the deletion may affect their access.
              Instead of deleting, consider setting the package as inactive.
            </BodyText>
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton
              text="Cancel"
              theme="cosmic"
              size="small"
              onClick={() => setOpenDeleteDialog(false)}
            />
            <GlowButton
              text="Delete Package"
              theme="ruby"
              size="small"
              leftIcon={<Trash2 size={16} />}
              onClick={handleDeletePackage}
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>
    </PageContainer>
  );
};

export default AdminPackagesView;
