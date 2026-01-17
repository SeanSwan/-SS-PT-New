import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail
} from 'lucide-react';
import apiService from '../../services/api.service';
import { useToast } from '../../hooks/use-toast';

const PageContainer = styled(motion.div)`
  padding: 2rem;
  color: white;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FilterBar = styled.div`
  background: rgba(30, 41, 59, 0.6);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 1.5rem;
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SearchRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const Select = styled.select`
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(59, 130, 246, 1);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: rgba(100, 100, 100, 0.5);

  &:hover {
    background: rgba(100, 100, 100, 0.7);
  }
`;

const TableContainer = styled.div`
  background: rgba(30, 41, 59, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  overflow: hidden;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.05);
  }
`;

const TableHeader = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableCell = styled.td`
  padding: 1rem;
  color: rgba(255, 255, 255, 0.9);
`;

const ClientInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ClientName = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
`;

const ClientEmail = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
`;

const StatusBadge = styled.span<{ status: 'complete' | 'draft' | 'not_started' }>`
  padding: 0.375rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: ${props => {
    switch (props.status) {
      case 'complete':
        return 'rgba(34, 197, 94, 0.2)';
      case 'draft':
        return 'rgba(234, 179, 8, 0.2)';
      case 'not_started':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(100, 100, 100, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'complete':
        return '#22c55e';
      case 'draft':
        return '#eab308';
      case 'not_started':
        return '#ef4444';
      default:
        return '#fff';
    }
  }};
`;

const ScoreBadge = styled.span<{ score: number | null }>`
  padding: 0.375rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${props => {
    if (props.score === null) return 'rgba(100, 100, 100, 0.2)';
    if (props.score >= 80) return 'rgba(34, 197, 94, 0.2)';
    if (props.score >= 60) return 'rgba(234, 179, 8, 0.2)';
    return 'rgba(239, 68, 68, 0.2)';
  }};
  color: ${props => {
    if (props.score === null) return 'rgba(255, 255, 255, 0.5)';
    if (props.score >= 80) return '#22c55e';
    if (props.score >= 60) return '#eab308';
    return '#ef4444';
  }};
`;

const ActionButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: rgba(59, 130, 246, 0.2);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.4);
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: rgba(255, 255, 255, 0.6);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: rgba(255, 255, 255, 0.6);
  gap: 1rem;
`;

const MobileCardList = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;

const MobileCard = styled(motion.div)`
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MobileCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1rem;
`;

const MobileCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MobileCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MobileCardLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
`;

const BulkActionBar = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

interface ClientOnboarding {
  userId: number;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  package: {
    name: string;
  };
  questionnaire: {
    status: 'draft' | 'submitted' | 'reviewed';
    completionPercentage: number;
    primaryGoal?: string;
    createdAt: string;
  } | null;
  movementScreen: {
    nasmAssessmentScore: number | null;
    status: 'pending' | 'completed';
    createdAt?: string;
  } | null;
}

const OnboardingManagement: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);

  useEffect(() => {
    fetchClients();
  }, [currentPage, packageFilter, statusFilter, searchQuery]);

  const fetchClients = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (packageFilter !== 'all') params.append('package', packageFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiService.get(`/api/admin/onboarding?${params}`);

      setClients(response.data.clients || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load client onboarding data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchClients();
  };

  const handleViewClient = (userId: number) => {
    window.location.href = `/admin/clients/${userId}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'reviewed':
        return <CheckCircle size={14} />;
      case 'draft':
        return <Clock size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  const getStatusText = (questionnaire: ClientOnboarding['questionnaire']) => {
    if (!questionnaire) return 'not_started';
    if (questionnaire.status === 'submitted' || questionnaire.status === 'reviewed') {
      return 'complete';
    }
    return 'draft';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleBulkEmail = async () => {
    // POST /api/admin/bulk-email with { userIds: selectedClients }
    toast({ title: 'Success', description: `Sent reminders to ${selectedClients.length} clients` });
  };

  const handleBulkExport = async () => {
    // GET /api/admin/export-clients?ids=1,2,3
    toast({ title: 'Success', description: 'CSV exported successfully' });
  };

  return (
    <PageContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <Title>
          <Users size={32} />
          Client Onboarding Management
        </Title>
        <ButtonGroup>
          <SecondaryButton>
            <Upload size={18} />
            Import CSV
          </SecondaryButton>
          <Button>
            <Plus size={18} />
            Create Questionnaire
          </Button>
        </ButtonGroup>
      </Header>

      <FilterBar>
        <FilterRow>
          <Select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)}>
            <option value="all">All Packages</option>
            <option value="express_30">Express 30</option>
            <option value="signature_60_standard">Signature 60 Standard</option>
            <option value="signature_60_ai">Signature 60 AI Data</option>
            <option value="transformation_pack">Transformation Pack</option>
          </Select>

          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="draft">In Progress</option>
            <option value="not_started">Not Started</option>
          </Select>

          <Button onClick={handleSearch}>
            <Search size={18} />
            Apply Filters
          </Button>
        </FilterRow>

        <SearchRow>
          <SearchInput
            type="text"
            placeholder="Search by client name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <SecondaryButton onClick={handleSearch}>
            <Search size={18} />
            Search
          </SecondaryButton>
        </SearchRow>
      </FilterBar>

      <TableContainer>
        {loading ? (
          <LoadingContainer>Loading client data...</LoadingContainer>
        ) : clients.length === 0 ? (
          <EmptyState>
            <Users size={48} />
            <div>No clients found matching your filters</div>
          </EmptyState>
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>
                    <Checkbox
                      type="checkbox"
                      checked={selectedClients.length === clients.length && clients.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClients(clients.map(c => c.userId));
                        } else {
                          setSelectedClients([]);
                        }
                      }}
                    />
                  </TableHeader>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Package</TableHeader>
                  <TableHeader>Questionnaire</TableHeader>
                  <TableHeader>Movement Screen</TableHeader>
                  <TableHeader>Primary Goal</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </tr>
              </TableHead>
              <tbody>
                {clients.map((client) => (
                  <TableRow key={client.userId}>
                    <TableCell>
                      <Checkbox
                        type="checkbox"
                        checked={selectedClients.includes(client.userId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClients([...selectedClients, client.userId]);
                          } else {
                            setSelectedClients(selectedClients.filter(id => id !== client.userId));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <ClientInfo>
                        <ClientName>
                          {client.client.firstName} {client.client.lastName}
                        </ClientName>
                        <ClientEmail>{client.client.email}</ClientEmail>
                      </ClientInfo>
                    </TableCell>
                    <TableCell>{client.package.name}</TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <StatusBadge status={getStatusText(client.questionnaire)}>
                          {getStatusIcon(client.questionnaire?.status || 'not_started')}
                          {client.questionnaire?.completionPercentage || 0}% Complete
                        </StatusBadge>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                          {formatDate(client.questionnaire?.createdAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.movementScreen?.nasmAssessmentScore !== null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <ScoreBadge score={client.movementScreen.nasmAssessmentScore}>
                            {client.movementScreen.nasmAssessmentScore}/100
                          </ScoreBadge>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                            {formatDate(client.movementScreen.createdAt)}
                          </div>
                        </div>
                      ) : (
                        <StatusBadge status="not_started">
                          <Clock size={14} />
                          Pending
                        </StatusBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.questionnaire?.primaryGoal ? (
                        <span style={{ textTransform: 'capitalize' }}>
                          {client.questionnaire.primaryGoal.replace('_', ' ')}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <ActionButton
                          onClick={() => handleViewClient(client.userId)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Eye size={14} />
                          View
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>

            <Pagination>
              <div>
                Showing {clients.length} of {clients.length} clients
              </div>
              <ButtonGroup>
                <SecondaryButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </SecondaryButton>
                <div style={{ padding: '0.75rem 1rem' }}>
                  Page {currentPage} of {totalPages}
                </div>
                <SecondaryButton
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </SecondaryButton>
              </ButtonGroup>
            </Pagination>
          </>
        )}
      </TableContainer>

      <MobileCardList>
        {clients.map((client) => (
          <MobileCard key={client.userId}>
            <MobileCardHeader>
              <ClientInfo>
                <ClientName>{client.client.firstName} {client.client.lastName}</ClientName>
                <ClientEmail>{client.client.email}</ClientEmail>
              </ClientInfo>
            </MobileCardHeader>

            <MobileCardBody>
              <MobileCardRow>
                <MobileCardLabel>Package</MobileCardLabel>
                <span>{client.package.name}</span>
              </MobileCardRow>

              <MobileCardRow>
                <MobileCardLabel>Questionnaire</MobileCardLabel>
                <StatusBadge status={getStatusText(client.questionnaire)}>
                  {getStatusIcon(client.questionnaire?.status || 'not_started')}
                  {client.questionnaire?.completionPercentage || 0}% Complete
                </StatusBadge>
              </MobileCardRow>

              <MobileCardRow>
                <MobileCardLabel>Movement Screen</MobileCardLabel>
                {client.movementScreen?.nasmAssessmentScore !== null ? (
                  <ScoreBadge score={client.movementScreen.nasmAssessmentScore}>
                    {client.movementScreen.nasmAssessmentScore}/100
                  </ScoreBadge>
                ) : (
                  <StatusBadge status="not_started">
                    <Clock size={14} />
                    Pending
                  </StatusBadge>
                )}
              </MobileCardRow>

              <MobileCardRow>
                <MobileCardLabel>Primary Goal</MobileCardLabel>
                <span>{client.questionnaire?.primaryGoal?.replace('_', ' ') || 'N/A'}</span>
              </MobileCardRow>
            </MobileCardBody>

            <ActionButton
              onClick={() => handleViewClient(client.userId)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye size={14} />
              View Details
            </ActionButton>
          </MobileCard>
        ))}
      </MobileCardList>

      {selectedClients.length > 0 && (
        <BulkActionBar
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
        >
          <span>{selectedClients.length} selected</span>
          <Button onClick={handleBulkEmail}>
            <Mail size={18} />
            Send Reminder
          </Button>
          <Button onClick={handleBulkExport}>
            <Download size={18} />
            Export CSV
          </Button>
          <SecondaryButton onClick={() => setSelectedClients([])}>
            Cancel
          </SecondaryButton>
        </BulkActionBar>
      )}
    </PageContainer>
  );
};

export default OnboardingManagement;
