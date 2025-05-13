// admin-packages-view.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";
import GlowButton from '../../../Button/glowButton';

// Import Icons
import {
  Search,
  Edit,
  Package,
  DollarSign,
  Calendar,
  Users,
  Plus,
  Download,
  Trash2,
  CheckCircle,
  RefreshCw,
  Zap,
  Send,
  CheckSquare
} from 'lucide-react';

// Material UI Components
import {
  Table,
  TableBody,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Grid,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Avatar,
  Chip,
  Box as MuiBox,
  Switch,
  FormControlLabel
} from '@mui/material';

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
  SearchField,
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
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from '../admin-sessions/styled-admin-sessions';

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
  const [loadingClients, setLoadingClients] = useState(false);

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
        const totalPrices = response.data.items.reduce((sum: number, pkg: SessionPackage) => sum + (pkg.price || 0), 0);
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
        console.warn('Received unexpected data structure for packages:', response.data);
        setError('Failed to fetch packages: Invalid format');
        toast({
          title: "Error",
          description: "Failed to load packages (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error fetching packages:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error connecting to the server';
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

      if (response.data && Array.isArray(response.data)) {
        setClients(response.data);
      } else {
        console.warn('Received unexpected data structure for clients:', response.data);
        toast({
          title: "Warning",
          description: "Failed to load clients (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Could not load clients';
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
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
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
        console.warn('Package update returned status:', response.status);
        toast({
          title: "Warning",
          description: `Package updated, but received status: ${response.status}`,
          variant: "default", 
        });
        fetchPackages();
        setOpenEditDialog(false);
      }
    } catch (err: any) {
      console.error('Error updating package:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error updating package';
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
        console.warn('Package creation returned status:', response.status);
        toast({
          title: "Warning",
          description: `Package created, but received status: ${response.status}`,
          variant: "default",
        });
        fetchPackages();
        setOpenNewDialog(false);
      }
    } catch (err: any) {
      console.error('Error creating package:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error creating package';
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
    } catch (err: any) {
      console.error('Error sending special offer:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error sending offer';
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
        console.warn('Package deletion returned status:', response.status);
        toast({
          title: "Warning",
          description: `Unexpected response when deleting package: ${response.status}`,
          variant: "default",
        });
        fetchPackages();
        setOpenDeleteDialog(false);
      }
    } catch (err: any) {
      console.error('Error deleting package:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error deleting package';
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

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <StyledCard component={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Package size={28} />
                  <Typography variant="h5" component="span" sx={{ fontWeight: 300 }}>
                     Session Packages Management
                  </Typography>
                </Stack>
              </CardTitle>
              <Stack direction="row" spacing={1.5}>
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
              </Stack>
            </CardHeader>

            <CardContent>
              {/* Stats Cards */}
              <StatsGridContainer>
                 {/* Stats Card 1: Total Packages */}
                 <StatsCard variant="primary" as={motion.div} custom={0} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="primary"><Package size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : statsData.totalPackages}</StatsValue>
                             <StatsLabel>Total Packages</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
                 {/* Stats Card 2: Active Packages */}
                 <StatsCard variant="success" as={motion.div} custom={1} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="success"><CheckCircle size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : statsData.activePackages}</StatsValue>
                             <StatsLabel>Active Packages</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
                 {/* Stats Card 3: Purchases This Month */}
                 <StatsCard variant="info" as={motion.div} custom={2} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="info"><Users size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : statsData.purchasesThisMonth}</StatsValue>
                             <StatsLabel>Purchases This Month</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
                 {/* Stats Card 4: Average Price */}
                 <StatsCard variant="warning" as={motion.div} custom={3} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="warning"><DollarSign size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : formatCurrency(statsData.averagePrice)}</StatsValue>
                             <StatsLabel>Average Package Price</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
              </StatsGridContainer>

              {/* Filters and Search */}
              <FilterContainer as={motion.div} variants={itemVariants}>
                 <SearchField
                     size="small"
                     placeholder="Search packages..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     sx={{ minWidth: { xs: '100%', sm: 300 } }}
                     InputProps={{
                         startAdornment: (
                             <InputAdornment position="start">
                                 <Search size={20} />
                             </InputAdornment>
                         )
                     }}
                 />
                 <FilterButtonsContainer>
                     {/* Filter Buttons */}
                     <FilterButton
                        isactive={(typeFilter === 'all').toString() as "true" | "false"}
                        onClick={() => setTypeFilter('all')}
                     >
                        All Types
                     </FilterButton>
                     <FilterButton
                        isactive={(typeFilter === 'fixed').toString() as "true" | "false"}
                        buttoncolor="primary"
                        onClick={() => setTypeFilter('fixed')}
                     >
                        Fixed Sessions
                     </FilterButton>
                     <FilterButton
                        isactive={(typeFilter === 'monthly').toString() as "true" | "false"}
                        buttoncolor="success"
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
                <StyledTableContainer component={Paper}>
                  <Table aria-label="session packages table" size="small">
                    <TableHead>
                      <StyledTableHead>
                        <StyledTableHeadCell>Package Name</StyledTableHeadCell>
                        <StyledTableHeadCell>Type</StyledTableHeadCell>
                        <StyledTableHeadCell>Sessions/Duration</StyledTableHeadCell>
                        <StyledTableHeadCell>Price Per Session</StyledTableHeadCell>
                        <StyledTableHeadCell>Total Price</StyledTableHeadCell>
                        <StyledTableHeadCell>Status</StyledTableHeadCell>
                        <StyledTableHeadCell align="right">Actions</StyledTableHeadCell>
                      </StyledTableHead>
                    </TableHead>
                    <TableBody>
                      {filteredPackages.length > 0 ? (
                        filteredPackages
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((pkg, index) => (
                            <StyledTableRow
                              key={pkg.id || index}
                              component={motion.tr}
                              custom={index}
                              variants={staggeredItemVariants}
                              initial="hidden"
                              animate="visible"
                              layout
                              sx={{
                                opacity: pkg.isActive ? 1 : 0.6,
                              }}
                            >
                              {/* Package Name */}
                              <StyledTableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <div 
                                    style={{ 
                                      width: 24, 
                                      height: 24, 
                                      borderRadius: '50%', 
                                      background: pkg.theme === 'cosmic' ? 'linear-gradient(135deg, #7851a9, #00ffff)' :
                                                pkg.theme === 'purple' ? 'linear-gradient(135deg, #9c27b0, #d500f9)' :
                                                pkg.theme === 'ruby' ? 'linear-gradient(135deg, #e91e63, #f50057)' :
                                                pkg.theme === 'emerald' ? 'linear-gradient(135deg, #4caf50, #00e676)' :
                                                'linear-gradient(135deg, #7851a9, #00ffff)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                    }}
                                  >
                                    {pkg.name.charAt(0)}
                                  </div>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {pkg.name}
                                  </Typography>
                                </Stack>
                                {pkg.description && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'rgba(255, 255, 255, 0.7)',
                                      display: 'block',
                                      mt: 0.5,
                                      maxWidth: '200px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {pkg.description}
                                  </Typography>
                                )}
                              </StyledTableCell>
                              
                              {/* Package Type */}
                              <StyledTableCell>
                                <ChipContainer 
                                  chipstatus={pkg.packageType === 'fixed' ? 'available' : 'confirmed'}
                                  sx={{ textTransform: 'capitalize' }}
                                >
                                  {pkg.packageType}
                                </ChipContainer>
                              </StyledTableCell>
                              
                              {/* Sessions/Duration */}
                              <StyledTableCell>
                                {pkg.packageType === 'fixed' ? (
                                  <Typography variant="body2">
                                    {pkg.sessions} sessions
                                  </Typography>
                                ) : (
                                  <Stack>
                                    <Typography variant="body2">
                                      {pkg.months} months, {pkg.sessionsPerWeek}x/week
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                      ({pkg.totalSessions || pkg.months! * pkg.sessionsPerWeek! * 4} total sessions)
                                    </Typography>
                                  </Stack>
                                )}
                              </StyledTableCell>
                              
                              {/* Price Per Session */}
                              <StyledTableCell>
                                {formatCurrency(pkg.pricePerSession)}
                              </StyledTableCell>
                              
                              {/* Total Price */}
                              <StyledTableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#00ffff' }}>
                                  {formatCurrency(pkg.totalCost || pkg.price || calculateTotalPrice(pkg))}
                                </Typography>
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
                              <StyledTableCell align="right">
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
                              </StyledTableCell>
                            </StyledTableRow>
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
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              )}

              {/* Pagination */}
              {filteredPackages.length > 0 && (
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredPackages.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    mt: 2,
                    '.MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.7)' },
                    '.MuiTablePagination-displayedRows': { color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.85rem' },
                    '.MuiTablePagination-select': { color: 'rgba(255, 255, 255, 0.9)' },
                    '.MuiTablePagination-actions button': { color: 'rgba(255, 255, 255, 0.7)', '&:disabled': { color: 'rgba(255, 255, 255, 0.3)' } },
                    '.MuiInputBase-root': { color: 'white !important' }
                  }}
                />
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
      <StyledDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Edit />
            <Typography variant="h6">Edit Package</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Update the details for this session package.
          </DialogContentText>
          <Grid container spacing={2}>
            {/* Package Name */}
            <Grid item xs={12}>
              <TextField
                label="Package Name"
                value={editPackageName}
                onChange={(e) => setEditPackageName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                size="small"
              />
            </Grid>
            
            {/* Package Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Package Type</InputLabel>
                <Select
                  value={editPackageType}
                  onChange={(e) => setEditPackageType(e.target.value as 'fixed' | 'monthly')}
                  label="Package Type"
                >
                  <MenuItem value="fixed">Fixed Sessions</MenuItem>
                  <MenuItem value="monthly">Monthly Subscription</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Theme */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Theme</InputLabel>
                <Select
                  value={editTheme}
                  onChange={(e) => setEditTheme(e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="cosmic">Cosmic (Blue/Purple)</MenuItem>
                  <MenuItem value="purple">Purple</MenuItem>
                  <MenuItem value="ruby">Ruby (Red)</MenuItem>
                  <MenuItem value="emerald">Emerald (Green)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Price Per Session */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Price Per Session ($)"
                type="number"
                value={editPricePerSession}
                onChange={(e) => setEditPricePerSession(Number(e.target.value))}
                fullWidth
                required
                variant="outlined"
                size="small"
                InputProps={{ inputProps: { min: 0, step: 5 } }}
              />
            </Grid>
            
            {/* Sessions (for fixed packages) */}
            {editPackageType === 'fixed' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Number of Sessions"
                  type="number"
                  value={editSessions}
                  onChange={(e) => setEditSessions(Number(e.target.value))}
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            )}
            
            {/* Months (for monthly packages) */}
            {editPackageType === 'monthly' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Months"
                    type="number"
                    value={editMonths}
                    onChange={(e) => setEditMonths(Number(e.target.value))}
                    fullWidth
                    required
                    variant="outlined"
                    size="small"
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Sessions Per Week"
                    type="number"
                    value={editSessionsPerWeek}
                    onChange={(e) => setEditSessionsPerWeek(Number(e.target.value))}
                    fullWidth
                    required
                    variant="outlined"
                    size="small"
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
              </>
            )}
            
            {/* Total Price Preview */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total Price"
                value={formatCurrency(editPackageType === 'fixed' 
                  ? editPricePerSession * editSessions 
                  : editPricePerSession * editMonths * editSessionsPerWeek * 4)}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ 
                  '.MuiInputBase-input': { 
                    color: '#00ffff', 
                    fontWeight: 'bold' 
                  }
                }}
              />
            </Grid>
            
            {/* Active Status */}
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', pl: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editIsActive ?? false}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    color="success"
                  />
                }
                label="Active and Visible"
              />
            </Grid>
            
            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={editPackageDescription}
                onChange={(e) => setEditPackageDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </StyledDialog>

      {/* New Package Dialog */}
      <StyledDialog
        open={openNewDialog}
        onClose={() => setOpenNewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Plus />
            <Typography variant="h6">Create New Package</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Create a new session package to offer to clients.
          </DialogContentText>
          <Grid container spacing={2}>
            {/* Package Name */}
            <Grid item xs={12}>
              <TextField
                label="Package Name"
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                size="small"
                placeholder="e.g., Gold Glimmer, Platinum Plus"
              />
            </Grid>
            
            {/* Package Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Package Type</InputLabel>
                <Select
                  value={newPackageType}
                  onChange={(e) => setNewPackageType(e.target.value as 'fixed' | 'monthly')}
                  label="Package Type"
                >
                  <MenuItem value="fixed">Fixed Sessions</MenuItem>
                  <MenuItem value="monthly">Monthly Subscription</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Theme */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Theme</InputLabel>
                <Select
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="cosmic">Cosmic (Blue/Purple)</MenuItem>
                  <MenuItem value="purple">Purple</MenuItem>
                  <MenuItem value="ruby">Ruby (Red)</MenuItem>
                  <MenuItem value="emerald">Emerald (Green)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Price Per Session */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Price Per Session ($)"
                type="number"
                value={newPricePerSession}
                onChange={(e) => setNewPricePerSession(Number(e.target.value))}
                fullWidth
                required
                variant="outlined"
                size="small"
                InputProps={{ inputProps: { min: 0, step: 5 } }}
              />
            </Grid>
            
            {/* Sessions (for fixed packages) */}
            {newPackageType === 'fixed' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Number of Sessions"
                  type="number"
                  value={newSessions}
                  onChange={(e) => setNewSessions(Number(e.target.value))}
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            )}
            
            {/* Months (for monthly packages) */}
            {newPackageType === 'monthly' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Months"
                    type="number"
                    value={newMonths}
                    onChange={(e) => setNewMonths(Number(e.target.value))}
                    fullWidth
                    required
                    variant="outlined"
                    size="small"
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Sessions Per Week"
                    type="number"
                    value={newSessionsPerWeek}
                    onChange={(e) => setNewSessionsPerWeek(Number(e.target.value))}
                    fullWidth
                    required
                    variant="outlined"
                    size="small"
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
              </>
            )}
            
            {/* Total Price Preview */}
            <Grid item xs={12}>
              <TextField
                label="Total Price (Preview)"
                value={formatCurrency(newPackageType === 'fixed' 
                  ? newPricePerSession * newSessions 
                  : newPricePerSession * newMonths * newSessionsPerWeek * 4)}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ 
                  '.MuiInputBase-input': { 
                    color: '#00ffff', 
                    fontWeight: 'bold' 
                  }
                }}
              />
            </Grid>
            
            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={newPackageDescription}
                onChange={(e) => setNewPackageDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                size="small"
                placeholder="Describe the key benefits and features of this package..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </StyledDialog>

      {/* Send Special Offer Dialog */}
      <StyledDialog
        open={openSendOfferDialog}
        onClose={() => setOpenSendOfferDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Send />
            <Typography variant="h6">Send Special Offer</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Create a special promotional offer for the selected package and send it to specific clients.
          </DialogContentText>
          
          {selectedPackage && (
            <Paper variant="outlined" sx={{ 
              p: 2, 
              mb: 3, 
              background: 'rgba(0, 0, 0, 0.2)', 
              borderColor: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px' 
            }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Package size={20} />
                <Typography variant="subtitle1">{selectedPackage.name}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                {selectedPackage.packageType === 'fixed'
                  ? `${selectedPackage.sessions} sessions at ${formatCurrency(selectedPackage.pricePerSession)} per session`
                  : `${selectedPackage.months} months, ${selectedPackage.sessionsPerWeek} sessions/week at ${formatCurrency(selectedPackage.pricePerSession)} per session`
                }
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#00ffff' }}>
                Regular Price: {formatCurrency(selectedPackage.totalCost || selectedPackage.price || calculateTotalPrice(selectedPackage))}
              </Typography>
            </Paper>
          )}
          
          <Grid container spacing={2}>
            {/* Client Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Clients</InputLabel>
                <Select
                  multiple
                  value={selectedClients}
                  onChange={(e) => setSelectedClients(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  label="Select Clients"
                  renderValue={(selected) => `${selected.length} clients selected`}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={client.photo || undefined} 
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </Avatar>
                        <span>{client.firstName} {client.lastName}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Discount Percentage */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Discount (%)"
                type="number"
                value={offerDiscount}
                onChange={(e) => setOfferDiscount(Math.min(Math.max(0, Number(e.target.value)), 100))} // Limit 0-100%
                fullWidth
                required
                variant="outlined"
                size="small"
                InputProps={{ 
                  inputProps: { min: 0, max: 100 }, 
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
            
            {/* Discounted Price Preview */}
            <Grid item xs={12} sm={6}>
              {selectedPackage && (
                <TextField
                  label="Special Offer Price"
                  value={formatCurrency(
                    (selectedPackage.totalCost || selectedPackage.price || calculateTotalPrice(selectedPackage)) * (1 - offerDiscount / 100)
                  )}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{ readOnly: true }}
                  sx={{ 
                    '.MuiInputBase-input': { 
                      color: '#00ffff', 
                      fontWeight: 'bold' 
                    }
                  }}
                />
              )}
            </Grid>
            
            {/* Personal Message */}
            <Grid item xs={12}>
              <TextField
                label="Personal Message"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                size="small"
                placeholder="Add a personal message to go with your offer..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </StyledDialog>

      {/* Delete Confirmation Dialog */}
      <StyledDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Trash2 />
            <Typography variant="h6">Delete Package</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Are you sure you want to delete this package? This action cannot be undone.
          </DialogContentText>
          
          {selectedPackage && (
            <Paper variant="outlined" sx={{ 
              p: 2, 
              mb: 3, 
              background: 'rgba(0, 0, 0, 0.2)', 
              borderColor: 'rgba(255, 0, 0, 0.2)', 
              borderRadius: '8px' 
            }}>
              <Typography variant="subtitle1">{selectedPackage.name}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {selectedPackage.packageType === 'fixed'
                  ? `${selectedPackage.sessions} sessions`
                  : `${selectedPackage.months} months subscription`
                }
              </Typography>
            </Paper>
          )}
          
          <Typography variant="body2" sx={{ color: '#ff6b6b' }}>
            Note: If clients have already purchased this package, the deletion may affect their access.
            Instead of deleting, consider setting the package as inactive.
          </Typography>
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </StyledDialog>
    </PageContainer>
  );
};

export default AdminPackagesView;