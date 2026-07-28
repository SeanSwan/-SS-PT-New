/**
 * FILE: ClientDashboardHome.sections.tsx
 * PURPOSE: Structural sections for the client dashboard Home redesign.
 */
import React from 'react';
import {
  Award,
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Flame,
  Grid2X2,
  HelpCircle,
  LineChart,
  LogOut,
  MessageSquare,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { UniversalThemeToggle } from '../../../context/ThemeContext';
import {
  ActionCount,
  ClientBrand,
  ClientTopNav,
  IconButton,
  TopActions,
  TopNavLink,
  TopNavLinks,
  UserMenuButton,
} from './ClientDashboardHome.layoutStyles';
import { LeftRail, RailButton, RailLabel, RailSection, StorePromo } from './ClientDashboardHome.sideStyles';
import {
  ActionButton,
  CardBody,
  CardTitle,
  Kicker,
  ListStack,
  MetricGrid,
  MetricTile,
  MutedText,
  PanelCard,
  PanelHeader,
  ProgressFill,
  ProgressTrack,
  RowItem,
  StatusDot,
  TinyText,
} from './ClientDashboardHome.cardStyles';
import {
  HeroAvatar,
  HeroContent,
  HeroIdentity,
  HeroMedia,
  HeroPanel,
  HeroPill,
  HeroTitle,
  StatIcon,
  StatGrid,
  StatTile,
} from './ClientDashboardHome.heroStyles';
import type { ClientDashboardHomeProps, ClientDashboardTarget } from './ClientDashboardHome.types';

type PickProps = Pick<ClientDashboardHomeProps, 'onNavigate' | 'onTarget'>;
type RailItem = [string, ClientDashboardTarget | undefined, LucideIcon];
type RailGroup = { label: string; items: RailItem[] };

const topLinks = [['Home', '/'], ['Programs', '/dashboard/client/workouts'], ['Store', '/store'], ['Video Library', '/video-library'], ['Waiver', '/waiver'], ['Photography', '/gallery'], ['Community', '/user-dashboard'], ['About', '/about']] as const;
const railGroups: RailGroup[] = [
  { label: 'Client',
    items: [
      ['Dashboard', 'dashboard', Grid2X2],
      ['Progress', 'progress', LineChart],
      ['Workouts', 'workouts', Dumbbell],
      ['Coach', 'coach', Bot],
      ['Book Session', 'sessions', CalendarDays],
    ],
  },
  { label: 'Community',
    items: [
      ['Feed', 'dashboard', MessageSquare],
      ['Challenges', 'challenges', Trophy],
      ['Leaderboard', 'challenges', Award],
      ['Messages', 'messages', Bell],
    ],
  },
  { label: 'Account',
    items: [
      ['Profile & Settings', 'profile', UserRound],
      ['Billing & Plans', undefined, CreditCard],
      ['Help Center', undefined, HelpCircle],
      ['Sign Out', undefined, LogOut],
    ],
  },
] as const;

export function ClientTopNavigation({
  logoSrc,
  avatarSrc,
  displayName,
  topBarActions,
  onNavigate,
  onTarget,
}: Pick<ClientDashboardHomeProps, 'logoSrc' | 'avatarSrc' | 'displayName' | 'topBarActions'> & PickProps) {
  return (
    <ClientTopNav>
      <ClientBrand type="button" onClick={() => onNavigate('/')} aria-label="Go to SwanStudios home">
        <img src={logoSrc} alt="" />
        <span>SwanStudios</span>
      </ClientBrand>
      <TopNavLinks aria-label="Primary">
        {topLinks.map(([label, path]) => (
          <TopNavLink key={label} type="button" $active={label === 'Home'} onClick={() => onNavigate(path)}>
            {label}
          </TopNavLink>
        ))}
      </TopNavLinks>
      <TopActions>
        <UniversalThemeToggle size="medium" />
        {topBarActions.map(({ label, Icon, count, target }) => (
          <IconButton
            key={label}
            type="button"
            aria-label={label}
            disabled={!target}
            title={!target ? 'This dashboard destination is not wired yet.' : label}
            onClick={() => (target ? onTarget(target) : undefined)}
          >
            <Icon size={18} aria-hidden="true" />
            {count > 0 && <ActionCount>{count}</ActionCount>}
          </IconButton>
        ))}
        <IconButton type="button" aria-label="Open store" onClick={() => onNavigate('/store')}>
          <ShoppingCart size={18} aria-hidden="true" />
        </IconButton>
        <UserMenuButton type="button" onClick={() => onTarget('profile')} aria-label="Open profile">
          <img src={avatarSrc} alt="" />
          <span>{displayName}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </UserMenuButton>
      </TopActions>
    </ClientTopNav>
  );
}

export function ClientSidebar({ onNavigate, onTarget }: PickProps) {
  return (
    <LeftRail aria-label="Client dashboard sections">
      {railGroups.map((group) => (
        <RailSection key={group.label}>
          <RailLabel>{group.label}</RailLabel>
          {group.items.map(([label, target, Icon]) => (
            <RailButton
              key={label}
              type="button"
              $active={target === 'dashboard' && label === 'Dashboard'}
              disabled={!target}
              title={!target ? 'This destination is not wired yet.' : label}
              onClick={() => (target ? onTarget(target) : undefined)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </RailButton>
          ))}
        </RailSection>
      ))}
      <StorePromo type="button" onClick={() => onNavigate('/store')}>
        <Store size={18} aria-hidden="true" />
        <div>
          <CardTitle>SwanStudios Store</CardTitle>
          <MutedText>Premium apparel and gear.</MutedText>
        </div>
        <ActionButton as="span" $primary>Shop Now</ActionButton>
      </StorePromo>
    </LeftRail>
  );
}

export function ClientProfileHero(props: Pick<ClientDashboardHomeProps,
  'avatarSrc' | 'fallbackAvatarSrc' | 'displayName' | 'tierName' | 'level' | 'points' | 'rankLabel' |
  'streakDays' | 'progressPercent' | 'pointsToNext' | 'swanHeroSrc'>) {
  return (
    <HeroPanel aria-labelledby="client-dashboard-title">
      <HeroContent>
        <HeroIdentity>
          <HeroAvatar src={props.avatarSrc} alt="" onError={(event) => { event.currentTarget.src = props.fallbackAvatarSrc; }} />
          <div>
            <MutedText>Welcome back,</MutedText>
            <HeroTitle id="client-dashboard-title">{props.displayName}</HeroTitle>
            <HeroPill><Sparkles size={14} aria-hidden="true" /> Swan Member</HeroPill>
          </div>
        </HeroIdentity>
        <StatGrid>
          <HeroStat icon={<Zap size={18} />} label="Swan Points" value={props.points.toLocaleString()} />
          <HeroStat icon={<Award size={18} />} label="Momentum Tier" value={`Level ${props.level}`} tone="purple" />
          <HeroStat icon={<Flame size={18} />} label="Day Streak" value={String(props.streakDays)} tone="gold" />
        </StatGrid>
        <div>
          <TinyText>Momentum lens</TinyText>
          <MutedText>{props.tierName}. {props.pointsToNext > 0 ? `${props.pointsToNext.toLocaleString()} points to next unlock.` : props.rankLabel}</MutedText>
          <ProgressTrack aria-label="Level progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={props.progressPercent}>
            <ProgressFill $pct={props.progressPercent} />
          </ProgressTrack>
        </div>
      </HeroContent>
      <HeroMedia aria-hidden="true"><img src={props.swanHeroSrc} alt="" /></HeroMedia>
    </HeroPanel>
  );
}

function HeroStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'teal' | 'purple' | 'gold' }) {
  return (
    <StatTile>
      <StatIcon $tone={tone}>{icon}</StatIcon>
      <div>
        <CardTitle>{value}</CardTitle>
        <TinyText>{label}</TinyText>
      </div>
    </StatTile>
  );
}

export function TodaySnapshotCard({ todaySnapshot }: Pick<ClientDashboardHomeProps, 'todaySnapshot'>) {
  return (
    <PanelCard>
      <PanelHeader><Kicker><Search size={13} /> Today snapshot</Kicker><TinyText>{todaySnapshot.dateLabel}</TinyText></PanelHeader>
      <CardBody>
        <MetricGrid>
          {todaySnapshot.rows.map((row) => (
            <MetricTile key={row.label}><CardTitle>{row.value}</CardTitle><TinyText>{row.label}</TinyText><MutedText>{row.meta}</MutedText></MetricTile>
          ))}
        </MetricGrid>
      </CardBody>
    </PanelCard>
  );
}

export function TodaysAssignmentCard({ assignment, onNavigate }: Pick<ClientDashboardHomeProps, 'assignment' | 'onNavigate'>) {
  return (
    <PanelCard data-testid="current-workout-card" aria-label="Today's training priority">
      <PanelHeader><div><Kicker>{assignment.kicker}</Kicker><CardTitle>{assignment.title}</CardTitle><MutedText>{assignment.meta}</MutedText></div></PanelHeader>
      <CardBody>
        <ListStack>
          {(assignment.rows.length ? assignment.rows : [{ label: 'No live assignment', meta: 'Open workouts to review your plan.', complete: false }]).map((row) => (
            <RowItem key={row.label}><StatusDot $complete={row.complete}>{row.complete && <Check size={13} />}</StatusDot><span>{row.label}</span><TinyText>{row.meta}</TinyText></RowItem>
          ))}
        </ListStack>
        <ActionButton type="button" onClick={() => onNavigate(assignment.actionPath)}>{assignment.actionLabel}</ActionButton>
      </CardBody>
    </PanelCard>
  );
}

export function NextSessionCard({ sessionPreview, onNavigate }: Pick<ClientDashboardHomeProps, 'sessionPreview' | 'onNavigate'>) {
  const actionLabel = sessionPreview.empty ? 'Book Session' : 'View Details';
  const actionAriaLabel = sessionPreview.empty ? 'Book a session' : 'View session details';

  return (
    <PanelCard data-testid="next-session-card">
      <PanelHeader><Kicker><CalendarDays size={13} /> Next session</Kicker>{sessionPreview.loading && <TinyText>Loading</TinyText>}</PanelHeader>
      <CardBody>
        <CardTitle>{sessionPreview.title}</CardTitle>
        <MutedText>{sessionPreview.date}</MutedText>
        <MutedText>{sessionPreview.time}</MutedText>
        <ListStack><RowItem><UserRound size={16} /><span>{sessionPreview.coach}</span><TinyText>{sessionPreview.error ? 'Unavailable' : 'Coach'}</TinyText></RowItem></ListStack>
        <ActionButton type="button" aria-label={actionAriaLabel} onClick={() => onNavigate(sessionPreview.path)} $primary={!sessionPreview.empty}>{actionLabel}</ActionButton>
      </CardBody>
    </PanelCard>
  );
}


