/**
 * Admin Packages View V2 - GOLDEN STANDARD
 * ==========================================
 * Refactored to use UI Kit compound components + useTable + useForm hooks
 * 
 * Features:
 * ✅ Table compound component
 * ✅ Pagination compound component
 * ✅ Badge component with variants
 * ✅ EmptyState and LoadingState components
 * ✅ useTable hook for table logic
 * ✅ useForm hook for form management
 * ✅ Zero local table components
 * ✅ Zero MUI dependencies
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { useTable } from '../../../../hooks/useTable';
import { useForm } from '../../../../hooks/useForm';
import GlowButton from '../../../ui/buttons/GlowButton';

// Import icons
import {
  Search,
  Edit,
  Package,
  Plus,
  Trash2,
  RefreshCw,
  CheckSquare,
  X,
  Inbox
} from 'lucide-react';

// Import UI Kit components
import { PageTitle, SectionTitle, BodyText, SmallText, Label } from '../../../ui-kit/Typography';
import { PrimaryButton, OutlinedButton, DangerButton } from '../../../ui-kit/Button';
import { Card, CardHeader, CardBody, GridContainer, FlexBox } from '../../../ui-kit/Card';
import { StyledInput, StyledTextarea, FormField } from '../../../ui-kit/Input';
import UITable from '../../../ui-kit/Table';
import Pagination from '../../../ui-kit/Pagination';
import Badge from '../../../ui-kit/Badge';
import EmptyState, { LoadingState } from '../../../ui-kit/EmptyState';
import { PageContainer, ContentContainer, StatsGridContainer } from '../../../ui-kit/Container';

// ==========================================
// PAGE-SPECIFIC STYLED COMPONENTS
// ==========================================

// Stats Card
const StatsCard = styled(Card)`
  text-align: center;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.05));
  border-color: rgba(59, 130, 246, 0.3);
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// Modal components
const ModalBackdrop = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

// Filter components
const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
  }
  
  input {
    padding-left: 2.75rem;
  }
`;

const FilterButton = styled.button<{ isActive: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid ${props => props.isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
  color: ${props => props.isActive ? '#60a5fa' : '#e2e8f0'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
`;

// Select dropdown
const Select = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  width: 100%;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  option {
    background: #1e293b;
    color: #ffffff;
  }
`;

// ==========================================
// TYPES
// ==========================================

interface SessionPackage {
  id: number;
  name: string;
  packageType: 'fixed' | 'monthly';
  description: string | null;
  price: number;
  pricePerSession: number;
  sessions?: number | null;
  months?: number | null;
  sessionsPerWeek?: number | null;
  totalSessions?: number | null;
  isActive: boolean;
  theme?: string;
}

interface PackageFormData {
  name: string;
  packageType: 'fixed' | 'monthly';
  description: string;
  pricePerSession: number;
  sessions: number;
  months: number;
  sessionsPerWeek: number;
  theme: string;
  isActive: boolean;
}

// ==========================================
// COMPONENT
// ==========================================

const AdminPackagesView: React.FC = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();

  // State
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<SessionPackage | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Form hook for package form
  const {
    formData,
    handleInputChange,
    setFormData,
    resetForm
  } = useForm<PackageFormData>({
    name: '',
    packageType: 'fixed',
    description: '',
    pricePerSession: 175,
    sessions: 8,
    months: 3,
    sessionsPerWeek: 4,
    theme: 'cosmic',
    isActive: true
  });

  // Table hook with search, filter, and pagination
  const {
    paginatedData: paginatedPackages,
    currentPage,
    totalPages,
    rowsPerPage,
    hasNextPage,
    hasPrevPage,
    totalItems,
    searchTerm,
    handlePageChange,
    handleRowsPerPageChange,
    handleSearch,
    goToNextPage,
    goToPrevPage
  } = useTable<SessionPackage>({
    data: packages,
    initialRowsPerPage: 10,
    searchFields: ['name', 'description'],
    customFilter: (pkg) => {
      if (typeFilter === 'all') return true;
      return pkg.packageType === typeFilter;
    }
  });

  // Fetch packages on mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Fetch packages from API
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await authAxios.get('/api/admin/storefront');
      if (response.data && response.data.success) {
        setPackages(response.data.items || []);
        toast({ title: 'Success', description: 'Packages loaded successfully' });
      }
    } catch (err: any) {
      console.error('Error fetching packages:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to load packages', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0 
    }).format(value);
  };

  // Calculate total price for a package
  const calculateTotal = (pkg: SessionPackage) => {
    if (pkg.packageType === 'fixed' && pkg.sessions) {
      return pkg.pricePerSession * pkg.sessions;
    } else if (pkg.packageType === 'monthly' && pkg.months && pkg.sessionsPerWeek) {
      return pkg.pricePerSession * pkg.months * pkg.sessionsPerWeek * 4;
    }
    return pkg.price;
  };

  // Handle edit package
  const handleEditPackage = (pkg: SessionPackage) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      packageType: pkg.packageType,
      description: pkg.description || '',
      pricePerSession: pkg.pricePerSession,
      sessions: pkg.sessions || 8,
      months: pkg.months || 3,
      sessionsPerWeek: pkg.sessionsPerWeek || 4,
      theme: pkg.theme || 'cosmic',
      isActive: pkg.isActive
    });
    setOpenEditDialog(true);
  };

  // Handle save package
  const handleSave = async () => {
    if (!selectedPackage) return;
    
    try {
      const totalSessions = formData.packageType === 'monthly' 
        ? formData.months * formData.sessionsPerWeek * 4 
        : formData.sessions;
      
      const totalCost = formData.pricePerSession * totalSessions;

      const updateData = {
        ...formData,
        totalSessions,
        totalCost,
        price: totalCost,
        sessions: formData.packageType === 'fixed' ? formData.sessions : null,
        months: formData.packageType === 'monthly' ? formData.months : null,
        sessionsPerWeek: formData.packageType === 'monthly' ? formData.sessionsPerWeek : null
      };

      await authAxios.put(`/api/admin/storefront/${selectedPackage.id}`, updateData);
      toast({ title: 'Success', description: 'Package updated successfully' });
      fetchPackages();
      setOpenEditDialog(false);
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update package', 
        variant: 'destructive' 
      });
    }
  };

  // Handle create package
  const handleCreate = async () => {
    try {
      const totalSessions = formData.packageType === 'monthly' 
        ? formData.months * formData.sessionsPerWeek * 4 
        : formData.sessions;
      
      const totalCost = formData.pricePerSession * totalSessions;

      const createData = {
        ...formData,
        totalSessions,
        totalCost,
        price: totalCost,
        sessions: formData.packageType === 'fixed' ? formData.sessions : null,
        months: formData.packageType === 'monthly' ? formData.months : null,
        sessionsPerWeek: formData.packageType === 'monthly' ? formData.sessionsPerWeek : null
      };

      await authAxios.post('/api/admin/storefront', createData);
      toast({ title: 'Success', description: 'Package created successfully' });
      fetchPackages();
      setOpenNewDialog(false);
      resetForm();
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: 'Failed to create package', 
        variant: 'destructive' 
      });
    }
  };

  // Handle delete package
  const handleDelete = async () => {
    if (!selectedPackage) return;
    
    try {
      await authAxios.delete(`/api/admin/storefront/${selectedPackage.id}`);
      toast({ title: 'Success', description: 'Package deleted successfully' });
      fetchPackages();
      setOpenDeleteDialog(false);
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: 'Failed to delete package', 
        variant: 'destructive' 
      });
    }
  };

  // Calculate stats
  const stats = {
    total: packages.length,
    active: packages.filter(p => p.isActive).length,
    avgPrice: packages.length > 0 
      ? Math.round(packages.reduce((sum, p) => sum + (p.price || 0), 0) / packages.length) 
      : 0
  };

  if (loading) {
    return (
      <PageContainer>
        <ContentContainer maxWidth="1400px">
          <LoadingState message="Loading packages..." />
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer maxWidth="1400px">
        {/* Header */}
        <Card style={{ marginBottom: '2rem' }}>
          <CardHeader>
            <FlexBox justify="space-between" align="center">
              <div>
                <PageTitle style={{ marginBottom: '0.5rem' }}>
                  <FlexBox align="center" gap="0.75rem">
                    <Package size={28} />
                    Session Packages Management
                  </FlexBox>
                </PageTitle>
              </div>
              <FlexBox gap="0.75rem">
                <GlowButton
                  text="Create Package"
                  theme="emerald"
                  size="small"
                  leftIcon={<Plus size={16} />}
                  onClick={() => { resetForm(); setOpenNewDialog(true); }}
                />
                <GlowButton
                  text="Refresh"
                  theme="purple"
                  size="small"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={fetchPackages}
                />
              </FlexBox>
            </FlexBox>
          </CardHeader>
        </Card>

        {/* Stats */}
        <StatsGridContainer style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <StatsCard>
            <CardBody>
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Total Packages</StatLabel>
            </CardBody>
          </StatsCard>
          <StatsCard>
            <CardBody>
              <StatValue>{stats.active}</StatValue>
              <StatLabel>Active Packages</StatLabel>
            </CardBody>
          </StatsCard>
          <StatsCard>
            <CardBody>
              <StatValue>{formatCurrency(stats.avgPrice)}</StatValue>
              <StatLabel>Avg Price</StatLabel>
            </CardBody>
          </StatsCard>
        </StatsGridContainer>

        {/* Filters */}
        <FilterContainer>
          <SearchContainer>
            <Search size={18} />
            <StyledInput
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </SearchContainer>
          <FilterButton 
            isActive={typeFilter === 'all'} 
            onClick={() => setTypeFilter('all')}
          >
            All Types
          </FilterButton>
          <FilterButton 
            isActive={typeFilter === 'fixed'} 
            onClick={() => setTypeFilter('fixed')}
          >
            Fixed Sessions
          </FilterButton>
          <FilterButton 
            isActive={typeFilter === 'monthly'} 
            onClick={() => setTypeFilter('monthly')}
          >
            Monthly
          </FilterButton>
        </FilterContainer>

        {/* Table - GOLDEN STANDARD IMPLEMENTATION */}
        <Card>
          <CardBody padding="0">
            {paginatedPackages.length > 0 ? (
              <>
                <UITable variant="default">
                  <UITable.Header>
                    <UITable.Row>
                      <UITable.Head>Package Name</UITable.Head>
                      <UITable.Head>Type</UITable.Head>
                      <UITable.Head>Details</UITable.Head>
                      <UITable.Head>Price/Session</UITable.Head>
                      <UITable.Head>Total Price</UITable.Head>
                      <UITable.Head>Status</UITable.Head>
                      <UITable.Head align="right">Actions</UITable.Head>
                    </UITable.Row>
                  </UITable.Header>
                  <UITable.Body>
                    {paginatedPackages.map((pkg) => (
                      <UITable.Row key={pkg.id}>
                        <UITable.Cell>
                          <BodyText style={{ fontWeight: 600 }}>{pkg.name}</BodyText>
                        </UITable.Cell>
                        <UITable.Cell>
                          <Badge variant="primary">{pkg.packageType}</Badge>
                        </UITable.Cell>
                        <UITable.Cell>
                          {pkg.packageType === 'fixed' ? (
                            <SmallText>{pkg.sessions} sessions</SmallText>
                          ) : (
                            <SmallText>{pkg.months} months, {pkg.sessionsPerWeek}x/week</SmallText>
                          )}
                        </UITable.Cell>
                        <UITable.Cell>{formatCurrency(pkg.pricePerSession)}</UITable.Cell>
                        <UITable.Cell>
                          <BodyText style={{ color: '#3b82f6', fontWeight: 600 }}>
                            {formatCurrency(calculateTotal(pkg))}
                          </BodyText>
                        </UITable.Cell>
                        <UITable.Cell>
                          <Badge variant={pkg.isActive ? 'success' : 'warning'}>
                            {pkg.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </UITable.Cell>
                        <UITable.Cell align="right">
                          <FlexBox gap="0.5rem" justify="end">
                            <OutlinedButton onClick={() => handleEditPackage(pkg)}>
                              <Edit size={16} />
                            </OutlinedButton>
                            <DangerButton onClick={() => { 
                              setSelectedPackage(pkg); 
                              setOpenDeleteDialog(true); 
                            }}>
                              <Trash2 size={16} />
                            </DangerButton>
                          </FlexBox>
                        </UITable.Cell>
                      </UITable.Row>
                    ))}
                  </UITable.Body>
                </UITable>

                {/* Pagination */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <FlexBox justify="space-between" align="center">
                    <SmallText style={{ color: '#94a3b8' }}>
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems} packages
                    </SmallText>
                    
                    <Pagination>
                      <Pagination.PrevButton 
                        onClick={goToPrevPage} 
                        disabled={!hasPrevPage} 
                      />
                      <Pagination.PageNumber>
                        Page {currentPage} of {totalPages}
                      </Pagination.PageNumber>
                      <Pagination.NextButton 
                        onClick={goToNextPage} 
                        disabled={!hasNextPage} 
                      />
                      <Pagination.PageSizeSelector
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                        options={[5, 10, 25, 50]}
                      />
                    </Pagination>
                  </FlexBox>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Inbox size={48} />}
                title="No packages found"
                message="Try adjusting your search filters or create a new package"
                action={
                  <PrimaryButton onClick={() => { resetForm(); setOpenNewDialog(true); }}>
                    <Plus size={16} style={{ marginRight: '0.5rem' }} />
                    Create Package
                  </PrimaryButton>
                }
              />
            )}
          </CardBody>
        </Card>

        {/* Edit Dialog - USING useForm HOOK */}
        <ModalBackdrop isOpen={openEditDialog} onClick={() => setOpenEditDialog(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <SectionTitle>Edit Package</SectionTitle>
              <OutlinedButton onClick={() => setOpenEditDialog(false)}>
                <X size={18} />
              </OutlinedButton>
            </ModalHeader>
            <ModalBody>
              <FormField>
                <Label>Package Name</Label>
                <StyledInput
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </FormField>
              <FormField>
                <Label>Type</Label>
                <Select
                  name="packageType"
                  value={formData.packageType}
                  onChange={handleInputChange}
                >
                  <option value="fixed">Fixed Sessions</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </FormField>
              <FormField>
                <Label>Price Per Session ($)</Label>
                <StyledInput
                  name="pricePerSession"
                  type="number"
                  value={formData.pricePerSession}
                  onChange={handleInputChange}
                />
              </FormField>
              {formData.packageType === 'fixed' && (
                <FormField>
                  <Label>Number of Sessions</Label>
                  <StyledInput
                    name="sessions"
                    type="number"
                    value={formData.sessions}
                    onChange={handleInputChange}
                  />
                </FormField>
              )}
              {formData.packageType === 'monthly' && (
                <>
                  <FormField>
                    <Label>Months</Label>
                    <StyledInput
                      name="months"
                      type="number"
                      value={formData.months}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField>
                    <Label>Sessions Per Week</Label>
                    <StyledInput
                      name="sessionsPerWeek"
                      type="number"
                      value={formData.sessionsPerWeek}
                      onChange={handleInputChange}
                    />
                  </FormField>
                </>
              )}
              <FormField>
                <Label>Description</Label>
                <StyledTextarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </FormField>
            </ModalBody>
            <ModalFooter>
              <OutlinedButton onClick={() => setOpenEditDialog(false)}>Cancel</OutlinedButton>
              <PrimaryButton onClick={handleSave}>
                <CheckSquare size={16} />
                Save Changes
              </PrimaryButton>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>

        {/* Create Dialog - USING useForm HOOK */}
        <ModalBackdrop isOpen={openNewDialog} onClick={() => setOpenNewDialog(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <SectionTitle>Create New Package</SectionTitle>
              <OutlinedButton onClick={() => setOpenNewDialog(false)}>
                <X size={18} />
              </OutlinedButton>
            </ModalHeader>
            <ModalBody>
              <FormField>
                <Label>Package Name</Label>
                <StyledInput
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Gold Package"
                />
              </FormField>
              <FormField>
                <Label>Type</Label>
                <Select
                  name="packageType"
                  value={formData.packageType}
                  onChange={handleInputChange}
                >
                  <option value="fixed">Fixed Sessions</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </FormField>
              <FormField>
                <Label>Price Per Session ($)</Label>
                <StyledInput
                  name="pricePerSession"
                  type="number"
                  value={formData.pricePerSession}
                  onChange={handleInputChange}
                />
              </FormField>
              {formData.packageType === 'fixed' && (
                <FormField>
                  <Label>Number of Sessions</Label>
                  <StyledInput
                    name="sessions"
                    type="number"
                    value={formData.sessions}
                    onChange={handleInputChange}
                  />
                </FormField>
              )}
              {formData.packageType === 'monthly' && (
                <>
                  <FormField>
                    <Label>Months</Label>
                    <StyledInput
                      name="months"
                      type="number"
                      value={formData.months}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField>
                    <Label>Sessions Per Week</Label>
                    <StyledInput
                      name="sessionsPerWeek"
                      type="number"
                      value={formData.sessionsPerWeek}
                      onChange={handleInputChange}
                    />
                  </FormField>
                </>
              )}
              <FormField>
                <Label>Description</Label>
                <StyledTextarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the package benefits..."
                />
              </FormField>
            </ModalBody>
            <ModalFooter>
              <OutlinedButton onClick={() => setOpenNewDialog(false)}>Cancel</OutlinedButton>
              <PrimaryButton onClick={handleCreate}>
                <Plus size={16} />
                Create Package
              </PrimaryButton>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>

        {/* Delete Dialog */}
        <ModalBackdrop isOpen={openDeleteDialog} onClick={() => setOpenDeleteDialog(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <SectionTitle>Delete Package</SectionTitle>
              <OutlinedButton onClick={() => setOpenDeleteDialog(false)}>
                <X size={18} />
              </OutlinedButton>
            </ModalHeader>
            <ModalBody>
              <BodyText style={{ marginBottom: '1rem' }}>
                Are you sure you want to delete this package?
              </BodyText>
              {selectedPackage && (
                <Card>
                  <CardBody>
                    <BodyText style={{ fontWeight: 600 }}>{selectedPackage.name}</BodyText>
                    <SmallText style={{ color: '#94a3b8' }}>{selectedPackage.description}</SmallText>
                  </CardBody>
                </Card>
              )}
              <BodyText style={{ marginTop: '1rem', color: '#ef4444' }}>
                This action cannot be undone.
              </BodyText>
            </ModalBody>
            <ModalFooter>
              <OutlinedButton onClick={() => setOpenDeleteDialog(false)}>Cancel</OutlinedButton>
              <DangerButton onClick={handleDelete}>
                <Trash2 size={16} />
                Delete
              </DangerButton>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      </ContentContainer>
    </PageContainer>
  );
};

export default AdminPackagesView;
