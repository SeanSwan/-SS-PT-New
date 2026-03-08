/**
 * Admin Packages View V2 - Gemini 3.1 Pro Command Center Design
 * ==============================================================
 * Card grid layout with SwanToggle for instant active/inactive toggle.
 * Optimistic UI updates, zero modals for status changes.
 *
 * Design Authority: Gemini 3.1 Pro
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { useTable } from '../../../../hooks/useTable';
import { useForm } from '../../../../hooks/useForm';

import {
  Search, Edit, Package, Plus, Trash2, RefreshCw,
  CheckSquare, X, Inbox
} from 'lucide-react';

import {
  GlassCardStatic,
  KPIGrid,
  KPICard,
  KPIValue,
  KPILabel,
  StatusBadge,
  PackageGrid,
  SectionHeader,
  SectionTitle,
  StoreButton,
  SwanToggleLabel,
  SwanToggleTrack,
  SwanToggleInput,
  SearchBar,
  SearchInput,
  FilterPill,
  ShimmerBlock,
  ErrorBanner,
  formatCurrency,
  formatCurrencyCompact,
  STORE_TOKENS,
} from '../store-shared/StoreDesignSystem';

// ── Page-specific styled components ─────────────────────

const PackagesWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const PackageCard = styled(GlassCardStatic)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;

  &:hover {
    transform: translateY(-2px);
    border-color: ${STORE_TOKENS.border.purple};
    box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(120,81,169,0.1);
  }
`;

const PackageCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const PackageName = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0;
  flex: 1;
`;

const PackagePrice = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${STORE_TOKENS.color.cyan};
  text-shadow: 0 0 20px rgba(0,255,255,0.3);
`;

const PackageDetail = styled.div`
  font-size: 0.875rem;
  color: ${STORE_TOKENS.color.muted};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PackageActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
`;

const PerSessionPrice = styled.span`
  font-size: 0.8rem;
  color: ${STORE_TOKENS.color.muted};
`;

// Modal styles
const ModalBackdrop = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #120d26 0%, #0a0a1a 100%);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${STORE_TOKENS.border.glass};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid ${STORE_TOKENS.border.glass};
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const FormLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${STORE_TOKENS.color.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
  display: block;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: white;
  font-size: 0.875rem;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
    box-shadow: 0 0 0 3px rgba(0,255,255,0.1);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: white;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
    box-shadow: 0 0 0 3px rgba(0,255,255,0.1);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: white;
  font-size: 0.875rem;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
  }
  option { background: #120d26; color: white; }
`;

const PaginationRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  color: ${STORE_TOKENS.color.muted};
  font-size: 0.875rem;
`;

// ── Types ───────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────

const AdminPackagesView: React.FC = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();

  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<SessionPackage | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const {
    formData, handleInputChange, setFormData, resetForm,
  } = useForm<PackageFormData>({
    name: '',
    packageType: 'fixed',
    description: '',
    pricePerSession: 175,
    sessions: 8,
    months: 3,
    sessionsPerWeek: 4,
    theme: 'cosmic',
    isActive: true,
  });

  const {
    paginatedData: paginatedPackages,
    currentPage, totalPages, totalItems,
    searchTerm, handleSearch,
    goToNextPage, goToPrevPage, hasNextPage, hasPrevPage,
  } = useTable<SessionPackage>({
    data: packages,
    initialRowsPerPage: 12,
    searchFields: ['name', 'description'],
    customFilter: (pkg) => typeFilter === 'all' || pkg.packageType === typeFilter,
  });

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await authAxios.get('/api/admin/storefront');
      if (response.data?.success) {
        setPackages(response.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
      toast({ title: 'Error', description: 'Failed to load packages', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (pkg: SessionPackage) => {
    if (pkg.packageType === 'fixed' && pkg.sessions) {
      return pkg.pricePerSession * pkg.sessions;
    } else if (pkg.packageType === 'monthly' && pkg.months && pkg.sessionsPerWeek) {
      return pkg.pricePerSession * pkg.months * pkg.sessionsPerWeek * 4;
    }
    return pkg.price;
  };

  // Optimistic toggle — update UI instantly, revert on error
  const handleToggleActive = async (pkg: SessionPackage) => {
    const prev = [...packages];
    setPackages(packages.map(p =>
      p.id === pkg.id ? { ...p, isActive: !p.isActive } : p
    ));

    try {
      await authAxios.put(`/api/admin/storefront/${pkg.id}`, { isActive: !pkg.isActive });
      toast({ title: 'Success', description: `${pkg.name} ${pkg.isActive ? 'deactivated' : 'activated'}` });
    } catch {
      setPackages(prev);
      toast({ title: 'Error', description: 'Failed to toggle package status', variant: 'destructive' });
    }
  };

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
      isActive: pkg.isActive,
    });
    setOpenEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedPackage) return;
    try {
      const totalSessions = formData.packageType === 'monthly'
        ? formData.months * formData.sessionsPerWeek * 4
        : formData.sessions;
      const totalCost = formData.pricePerSession * totalSessions;

      await authAxios.put(`/api/admin/storefront/${selectedPackage.id}`, {
        ...formData,
        totalSessions,
        totalCost,
        price: totalCost,
        sessions: formData.packageType === 'fixed' ? formData.sessions : null,
        months: formData.packageType === 'monthly' ? formData.months : null,
        sessionsPerWeek: formData.packageType === 'monthly' ? formData.sessionsPerWeek : null,
      });
      toast({ title: 'Success', description: 'Package updated' });
      fetchPackages();
      setOpenEditDialog(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to update package', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    try {
      const totalSessions = formData.packageType === 'monthly'
        ? formData.months * formData.sessionsPerWeek * 4
        : formData.sessions;
      const totalCost = formData.pricePerSession * totalSessions;

      await authAxios.post('/api/admin/storefront', {
        ...formData,
        totalSessions,
        totalCost,
        price: totalCost,
        sessions: formData.packageType === 'fixed' ? formData.sessions : null,
        months: formData.packageType === 'monthly' ? formData.months : null,
        sessionsPerWeek: formData.packageType === 'monthly' ? formData.sessionsPerWeek : null,
      });
      toast({ title: 'Success', description: 'Package created' });
      fetchPackages();
      setOpenNewDialog(false);
      resetForm();
    } catch {
      toast({ title: 'Error', description: 'Failed to create package', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    try {
      await authAxios.delete(`/api/admin/storefront/${selectedPackage.id}`);
      toast({ title: 'Success', description: 'Package deleted' });
      fetchPackages();
      setOpenDeleteDialog(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete package', variant: 'destructive' });
    }
  };

  // Stats
  const stats = {
    total: packages.length,
    active: packages.filter(p => p.isActive).length,
    avgPrice: packages.length > 0
      ? Math.round(packages.reduce((sum, p) => sum + (p.price || 0), 0) / packages.length)
      : 0,
  };

  // ── Loading ──
  if (loading) {
    return (
      <PackagesWrapper>
        <SectionHeader>
          <SectionTitle><Package size={24} /> Session Packages</SectionTitle>
        </SectionHeader>
        <KPIGrid>
          {[1,2,3].map(i => <KPICard key={i}><ShimmerBlock $height="50px" /></KPICard>)}
        </KPIGrid>
        <PackageGrid>
          {[1,2,3,4,5,6].map(i => (
            <GlassCardStatic key={i}><ShimmerBlock $height="150px" /></GlassCardStatic>
          ))}
        </PackageGrid>
      </PackagesWrapper>
    );
  }

  // ── Form modal content (shared between edit & create) ──
  const renderFormFields = () => (
    <>
      <div>
        <FormLabel>Package Name</FormLabel>
        <FormInput name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Gold Package" />
      </div>
      <div>
        <FormLabel>Type</FormLabel>
        <FormSelect name="packageType" value={formData.packageType} onChange={handleInputChange}>
          <option value="fixed">Fixed Sessions</option>
          <option value="monthly">Monthly</option>
        </FormSelect>
      </div>
      <div>
        <FormLabel>Price Per Session ($)</FormLabel>
        <FormInput name="pricePerSession" type="number" value={formData.pricePerSession} onChange={handleInputChange} />
      </div>
      {formData.packageType === 'fixed' && (
        <div>
          <FormLabel>Number of Sessions</FormLabel>
          <FormInput name="sessions" type="number" value={formData.sessions} onChange={handleInputChange} />
        </div>
      )}
      {formData.packageType === 'monthly' && (
        <>
          <div>
            <FormLabel>Months</FormLabel>
            <FormInput name="months" type="number" value={formData.months} onChange={handleInputChange} />
          </div>
          <div>
            <FormLabel>Sessions Per Week</FormLabel>
            <FormInput name="sessionsPerWeek" type="number" value={formData.sessionsPerWeek} onChange={handleInputChange} />
          </div>
        </>
      )}
      <div>
        <FormLabel>Description</FormLabel>
        <FormTextarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Describe the package benefits..." />
      </div>
    </>
  );

  return (
    <PackagesWrapper>
      {/* Header */}
      <SectionHeader>
        <SectionTitle><Package size={24} /> Session Packages</SectionTitle>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <StoreButton onClick={() => { resetForm(); setOpenNewDialog(true); }}>
            <Plus size={16} /> Create Package
          </StoreButton>
          <StoreButton $variant="ghost" onClick={fetchPackages}>
            <RefreshCw size={16} /> Refresh
          </StoreButton>
        </div>
      </SectionHeader>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard $accent="rgba(120,81,169,0.15)">
          <KPILabel>Total Packages</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.purple}>{stats.total}</KPIValue>
        </KPICard>
        <KPICard $accent="rgba(0,255,136,0.15)">
          <KPILabel>Active</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.completed}>{stats.active}</KPIValue>
        </KPICard>
        <KPICard $accent="rgba(0,255,255,0.15)">
          <KPILabel>Avg Price</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.cyan}>{formatCurrencyCompact(stats.avgPrice)}</KPIValue>
        </KPICard>
      </KPIGrid>

      {/* Filters */}
      <FiltersRow>
        <SearchBar>
          <Search size={18} />
          <SearchInput
            placeholder="Search packages..."
            value={searchTerm}
            onChange={e => handleSearch(e.target.value)}
          />
        </SearchBar>
        <FilterPill $active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All Types</FilterPill>
        <FilterPill $active={typeFilter === 'fixed'} onClick={() => setTypeFilter('fixed')}>Fixed Sessions</FilterPill>
        <FilterPill $active={typeFilter === 'monthly'} onClick={() => setTypeFilter('monthly')}>Monthly</FilterPill>
      </FiltersRow>

      {/* Package Card Grid */}
      {paginatedPackages.length > 0 ? (
        <>
          <PackageGrid>
            {paginatedPackages.map(pkg => (
              <PackageCard key={pkg.id}>
                <PackageCardHeader>
                  <div style={{ flex: 1 }}>
                    <PackageName>{pkg.name}</PackageName>
                    <PackageDetail>
                      <StatusBadge $status={pkg.isActive ? 'active' : 'inactive'}>
                        {pkg.packageType}
                      </StatusBadge>
                      {pkg.packageType === 'fixed'
                        ? <span>{pkg.sessions} sessions</span>
                        : <span>{pkg.months}mo, {pkg.sessionsPerWeek}x/week</span>
                      }
                    </PackageDetail>
                  </div>
                  {/* SwanToggle — instant optimistic toggle */}
                  <SwanToggleLabel title={`Click to ${pkg.isActive ? 'deactivate' : 'activate'}`}>
                    <SwanToggleInput
                      type="checkbox"
                      role="switch"
                      aria-checked={pkg.isActive}
                      checked={pkg.isActive}
                      onChange={() => handleToggleActive(pkg)}
                    />
                    <SwanToggleTrack $checked={pkg.isActive} />
                  </SwanToggleLabel>
                </PackageCardHeader>

                {pkg.description && (
                  <div style={{ fontSize: '0.8rem', color: STORE_TOKENS.color.muted, lineHeight: 1.4 }}>
                    {pkg.description.length > 120 ? pkg.description.slice(0, 120) + '...' : pkg.description}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <PackagePrice>{formatCurrency(calculateTotal(pkg))}</PackagePrice>
                  <PerSessionPrice>{formatCurrency(pkg.pricePerSession)}/session</PerSessionPrice>
                </div>

                <PackageActions>
                  <StoreButton onClick={() => handleEditPackage(pkg)} style={{ flex: 1 }}>
                    <Edit size={14} /> Edit
                  </StoreButton>
                  <StoreButton
                    $variant="danger"
                    onClick={() => { setSelectedPackage(pkg); setOpenDeleteDialog(true); }}
                  >
                    <Trash2 size={14} />
                  </StoreButton>
                </PackageActions>
              </PackageCard>
            ))}
          </PackageGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationRow>
              <span>
                Showing {(currentPage - 1) * 12 + 1} to {Math.min(currentPage * 12, totalItems)} of {totalItems}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <StoreButton $variant="ghost" onClick={goToPrevPage} disabled={!hasPrevPage}>Prev</StoreButton>
                <span style={{ padding: '0.5rem 1rem', color: STORE_TOKENS.color.cyan }}>
                  {currentPage} / {totalPages}
                </span>
                <StoreButton $variant="ghost" onClick={goToNextPage} disabled={!hasNextPage}>Next</StoreButton>
              </div>
            </PaginationRow>
          )}
        </>
      ) : (
        <GlassCardStatic style={{ textAlign: 'center', padding: '3rem' }}>
          <Inbox size={48} style={{ color: STORE_TOKENS.color.muted, marginBottom: '1rem', opacity: 0.3 }} />
          <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No packages found</h3>
          <p style={{ color: STORE_TOKENS.color.muted }}>Try adjusting your search or create a new package.</p>
          <StoreButton onClick={() => { resetForm(); setOpenNewDialog(true); }} style={{ margin: '1rem auto 0' }}>
            <Plus size={16} /> Create Package
          </StoreButton>
        </GlassCardStatic>
      )}

      {/* Edit Modal */}
      <ModalBackdrop $isOpen={openEditDialog} onClick={() => setOpenEditDialog(false)}>
        <ModalContainer onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <SectionTitle style={{ fontSize: '1.25rem' }}>Edit Package</SectionTitle>
            <StoreButton $variant="ghost" onClick={() => setOpenEditDialog(false)}><X size={18} /></StoreButton>
          </ModalHeader>
          <ModalBody>{renderFormFields()}</ModalBody>
          <ModalFooter>
            <StoreButton $variant="ghost" onClick={() => setOpenEditDialog(false)}>Cancel</StoreButton>
            <StoreButton onClick={handleSave}><CheckSquare size={16} /> Save Changes</StoreButton>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>

      {/* Create Modal */}
      <ModalBackdrop $isOpen={openNewDialog} onClick={() => setOpenNewDialog(false)}>
        <ModalContainer onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <SectionTitle style={{ fontSize: '1.25rem' }}>Create New Package</SectionTitle>
            <StoreButton $variant="ghost" onClick={() => setOpenNewDialog(false)}><X size={18} /></StoreButton>
          </ModalHeader>
          <ModalBody>{renderFormFields()}</ModalBody>
          <ModalFooter>
            <StoreButton $variant="ghost" onClick={() => setOpenNewDialog(false)}>Cancel</StoreButton>
            <StoreButton onClick={handleCreate}><Plus size={16} /> Create Package</StoreButton>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>

      {/* Delete Modal */}
      <ModalBackdrop $isOpen={openDeleteDialog} onClick={() => setOpenDeleteDialog(false)}>
        <ModalContainer onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <SectionTitle style={{ fontSize: '1.25rem' }}>Delete Package</SectionTitle>
            <StoreButton $variant="ghost" onClick={() => setOpenDeleteDialog(false)}><X size={18} /></StoreButton>
          </ModalHeader>
          <ModalBody>
            <p style={{ color: 'white' }}>Are you sure you want to delete this package?</p>
            {selectedPackage && (
              <GlassCardStatic>
                <strong style={{ color: 'white' }}>{selectedPackage.name}</strong>
                <div style={{ color: STORE_TOKENS.color.muted, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {selectedPackage.description}
                </div>
              </GlassCardStatic>
            )}
            <p style={{ color: STORE_TOKENS.color.inactive }}>This action cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <StoreButton $variant="ghost" onClick={() => setOpenDeleteDialog(false)}>Cancel</StoreButton>
            <StoreButton $variant="danger" onClick={handleDelete}><Trash2 size={16} /> Delete</StoreButton>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>
    </PackagesWrapper>
  );
};

export default AdminPackagesView;
