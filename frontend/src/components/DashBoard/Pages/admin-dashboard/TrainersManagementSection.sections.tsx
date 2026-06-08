import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award, CheckCircle, Download, Edit3, Eye, MapPin, MoreVertical, Plus,
  RefreshCw, Search, Shield, Star, UserCheck, Users, X,
} from 'lucide-react';
import {
  ActionButton, ActionDropdown, ActionItem, ActionMenu, CardFooter,
  CertificationBadge, CertificationBlock, CertificationLabel,
  CertificationList, RatingValue, SpecialtyTag, StatItem, StatLabel, StatValue,
  TrainerAvatar, TrainerCard, TrainerEmail, TrainerHeader, TrainerIdentity,
  TrainerInfo, TrainerLocation, TrainerName, TrainerSpecialty, TrainerStatsGrid,
} from './TrainersManagementSection.cardStyles';
import {
  ActionBar, ButtonRow, CommandButton, FilterSelect, SearchContainer,
  SearchField, SearchIcon, SearchInput, TrainersGrid,
  ConfirmBody, ConfirmButtonRow, ConfirmCallout, ConfirmDangerButton,
  ConfirmDialogShell, ConfirmOverlay, ConfirmSecondaryButton, ConfirmTitle,
} from './TrainersManagementSection.styles';
import {
  EmptyIconWrap, EmptyStateContainer, LoadingShell, StatCard, StatNumber,
  StatsBar, StatTitle,
} from './TrainersManagementSection.stateStyles';
import type { Trainer, TrainerStats } from './TrainersManagementSection.types';
import { formatCurrency, formatDate, getTimeAgo, getUserInitials } from './TrainersManagementSection.utils';

interface TrainerStatsOverviewProps {
  stats: TrainerStats;
}

interface TrainerActionBarProps {
  allSpecialties: string[];
  searchTerm: string;
  specialtyFilter: string;
  statusFilter: string;
  onAssignments: () => void;
  onManagePermissions: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSpecialtyFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

interface TrainerCardsProps {
  activeActionMenu: string | null;
  trainers: Trainer[];
  onActionMenuToggle: (trainerId: string | null) => void;
  onDeactivate: (trainerId: string) => void;
  onEdit: (trainerId: string) => void;
  onVerify: (trainerId: string) => void;
  onView: (trainerId: string) => void;
}

interface TrainerDeactivationConfirmDialogProps {
  busy: boolean;
  trainer: Trainer;
  onCancel: () => void;
  onConfirm: () => void;
}

const statCards = [
  ['totalTrainers', 'Total Trainers'],
  ['activeTrainers', 'Active Trainers'],
  ['pendingTrainers', 'Pending Approval'],
  ['avgRating', 'Average Rating'],
  ['totalRevenue', 'Monthly Revenue'],
] as const;

export const LoadingState = () => (
  <LoadingShell>
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
      <RefreshCw size={32} color="var(--accent-primary, #60C0F0)" />
    </motion.div>
  </LoadingShell>
);

export const TrainerStatsOverview = ({ stats }: TrainerStatsOverviewProps) => (
  <StatsBar initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    {statCards.map(([key, label]) => (
      <StatCard key={key} whileHover={{ scale: 1.02 }}>
        <StatNumber>{key === 'totalRevenue' ? formatCurrency(stats[key]) : stats[key]}</StatNumber>
        <StatTitle>{label}</StatTitle>
      </StatCard>
    ))}
  </StatsBar>
);

export const TrainerActionBar = ({
  allSpecialties,
  searchTerm,
  specialtyFilter,
  statusFilter,
  onAssignments,
  onManagePermissions,
  onRefresh,
  onSearchChange,
  onSpecialtyFilterChange,
  onStatusFilterChange,
}: TrainerActionBarProps) => (
  <ActionBar initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
    <SearchContainer>
      <SearchField>
        <SearchIcon><Search size={16} /></SearchIcon>
        <SearchInput
          type="text"
          placeholder="Search trainers by name, email, or specialty..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </SearchField>
      <FilterSelect value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pending">Pending</option>
      </FilterSelect>
      <FilterSelect value={specialtyFilter} onChange={(event) => onSpecialtyFilterChange(event.target.value)}>
        <option value="all">All Specialties</option>
        {allSpecialties.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
      </FilterSelect>
    </SearchContainer>

    <ButtonRow>
      <CommandButton onClick={onManagePermissions} title="Manage trainer permissions and access control">
        <Shield size={16} /> Manage Permissions
      </CommandButton>
      <CommandButton onClick={onAssignments} title="Manage client-trainer assignments with drag-and-drop interface">
        <Users size={16} /> Manage Assignments
      </CommandButton>
      <CommandButton onClick={onRefresh}>
        <RefreshCw size={16} /> Refresh
      </CommandButton>
      <CommandButton>
        <Download size={16} /> Export
      </CommandButton>
      <CommandButton>
        <Plus size={16} /> Add Trainer
      </CommandButton>
    </ButtonRow>
  </ActionBar>
);

const renderSpecialties = (trainer: Trainer) => (
  <TrainerSpecialty>
    {trainer.specialty.slice(0, 3).map((spec) => <SpecialtyTag key={spec}>{spec}</SpecialtyTag>)}
    {trainer.specialty.length > 3 && <SpecialtyTag>+{trainer.specialty.length - 3} more</SpecialtyTag>}
  </TrainerSpecialty>
);

const renderCertifications = (trainer: Trainer) => (
  <CertificationBlock>
    <CertificationLabel>Certifications:</CertificationLabel>
    <CertificationList>
      {trainer.certifications.map((cert) => (
        <CertificationBadge key={cert}>
          <Award size={12} />
          {cert}
        </CertificationBadge>
      ))}
    </CertificationList>
  </CertificationBlock>
);

const TrainerActionMenu = ({
  activeActionMenu,
  trainer,
  onActionMenuToggle,
  onDeactivate,
  onEdit,
  onVerify,
  onView,
}: TrainerCardsProps & { trainer: Trainer }) => (
  <ActionMenu>
    <ActionButton
      aria-label={`Open actions for ${trainer.name}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => onActionMenuToggle(activeActionMenu === trainer.id ? null : trainer.id)}
    >
      <MoreVertical size={16} />
    </ActionButton>
    <AnimatePresence>
      {activeActionMenu === trainer.id && (
        <ActionDropdown initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}>
          <ActionItem whileHover={{ x: 4 }} onClick={() => onView(trainer.id)}><Eye size={16} /> View Details</ActionItem>
          <ActionItem whileHover={{ x: 4 }} onClick={() => onEdit(trainer.id)}><Edit3 size={16} /> Edit Trainer</ActionItem>
          {!trainer.verified && <ActionItem whileHover={{ x: 4 }} onClick={() => onVerify(trainer.id)}><CheckCircle size={16} /> Verify Trainer</ActionItem>}
          <ActionItem className="danger" whileHover={{ x: 4 }} onClick={() => onDeactivate(trainer.id)}><X size={16} /> Deactivate</ActionItem>
        </ActionDropdown>
      )}
    </AnimatePresence>
  </ActionMenu>
);

const renderTrainerStats = (trainer: Trainer) => (
  <TrainerStatsGrid>
    <StatItem><StatValue>{trainer.stats.activeClients}</StatValue><StatLabel>Clients</StatLabel></StatItem>
    <StatItem><StatValue>{trainer.stats.totalSessions}</StatValue><StatLabel>Sessions</StatLabel></StatItem>
    <StatItem><StatValue>{formatCurrency(trainer.stats.monthlyRevenue)}</StatValue><StatLabel>Revenue</StatLabel></StatItem>
    <StatItem>
      <StatValue>
        <RatingValue>
          {trainer.stats.rating > 0 ? trainer.stats.rating.toFixed(1) : 'N/A'}
          {trainer.stats.rating > 0 && <Star size={12} color="var(--warning, #f59e0b)" fill="var(--warning, #f59e0b)" />}
        </RatingValue>
      </StatValue>
      <StatLabel>Rating</StatLabel>
    </StatItem>
  </TrainerStatsGrid>
);

const renderTrainerCard = (trainer: Trainer, index: number, props: TrainerCardsProps) => (
  <TrainerCard key={trainer.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, delay: index * 0.05 }} whileHover={{ scale: 1.02 }}>
    <TrainerHeader>
      <TrainerIdentity>
        <TrainerAvatar $verified={trainer.verified}>{getUserInitials(trainer.name)}</TrainerAvatar>
        <TrainerInfo>
          <TrainerName>{trainer.name}</TrainerName>
          <TrainerEmail>{trainer.email}</TrainerEmail>
          {trainer.location && <TrainerLocation><MapPin size={12} />{trainer.location}</TrainerLocation>}
          {renderSpecialties(trainer)}
        </TrainerInfo>
      </TrainerIdentity>
      <TrainerActionMenu {...props} trainer={trainer} />
    </TrainerHeader>
    {renderCertifications(trainer)}
    {renderTrainerStats(trainer)}
    <CardFooter>
      <span>Joined: {formatDate(trainer.joinedAt)}</span>
      <span>Last active: {getTimeAgo(trainer.lastActive)}</span>
    </CardFooter>
  </TrainerCard>
);

export const TrainerCards = (props: TrainerCardsProps) => (
  <>
    <TrainersGrid>
      <AnimatePresence>
        {props.trainers.map((trainer, index) => renderTrainerCard(trainer, index, props))}
      </AnimatePresence>
    </TrainersGrid>
    {props.trainers.length === 0 && (
      <EmptyStateContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <EmptyIconWrap><UserCheck size={48} /></EmptyIconWrap>
        <h3>No trainers found</h3>
        <p>Try adjusting your search or filters</p>
      </EmptyStateContainer>
    )}
  </>
);

export const TrainerDeactivationConfirmDialog = ({
  busy,
  trainer,
  onCancel,
  onConfirm,
}: TrainerDeactivationConfirmDialogProps) => (
  <ConfirmOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <ConfirmDialogShell
      role="dialog"
      aria-modal="true"
      aria-labelledby="trainer-deactivation-title"
      aria-describedby="trainer-deactivation-body"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
    >
      <ConfirmTitle id="trainer-deactivation-title">Deactivate {trainer.name}?</ConfirmTitle>
      <ConfirmBody id="trainer-deactivation-body">
        This removes the trainer from daily operations and blocks active access until an admin restores the account.
      </ConfirmBody>
      <ConfirmCallout>
        This soft-deactivates the trainer account and retains account records for 6 months.
      </ConfirmCallout>
      <ConfirmButtonRow>
        <ConfirmSecondaryButton type="button" onClick={onCancel} disabled={busy}>
          Keep trainer active
        </ConfirmSecondaryButton>
        <ConfirmDangerButton type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deactivating...' : 'Deactivate trainer'}
        </ConfirmDangerButton>
      </ConfirmButtonRow>
    </ConfirmDialogShell>
  </ConfirmOverlay>
);
