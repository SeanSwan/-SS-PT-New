import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Image,
  Palette,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import {
  designBrainNodes,
  labTabs,
  lensFoundryLaunchUrl,
  lensFoundryRepoUrl,
  morphStressMetrics,
  operatorStages,
  portfolioLanes,
  promotionChecks,
  type LabMetric,
  type LabNode,
  type LensFoundryTabId,
} from './LensFoundryLab.data';
import LensFoundryComposer from './LensFoundryComposer';
import {
  ActionLink,
  Eyebrow,
  FlowItem,
  FlowList,
  GatePill,
  HeroActions,
  HeroBand,
  MetricDetail,
  MetricGrid,
  MetricLabel,
  MetricTile,
  MetricValue,
  PageShell,
  Section,
  SectionHeading,
  SectionSummary,
  SectionTitle,
  StatusPill,
  StepBadge,
  Subtitle,
  TabBar,
  TabButton,
  Title,
  WorkDetail,
  WorkEyebrow,
  WorkGrid,
  WorkTile,
  WorkTitle,
} from './LensFoundryLab.styles';

const tabIcons: Record<LensFoundryTabId, React.ReactNode> = {
  morph: <Activity size={16} aria-hidden="true" />,
  'design-brain': <Palette size={16} aria-hidden="true" />,
  'operator-flow': <GitBranch size={16} aria-hidden="true" />,
  portfolio: <Image size={16} aria-hidden="true" />,
  promotion: <ShieldCheck size={16} aria-hidden="true" />,
};

const MetricTiles: React.FC<{ metrics: LabMetric[] }> = ({ metrics }) => (
  <MetricGrid>
    {metrics.map((metric) => (
      <MetricTile key={metric.label} $tone={metric.tone}>
        <MetricLabel>{metric.label}</MetricLabel>
        <MetricValue $tone={metric.tone}>{metric.value}</MetricValue>
        <MetricDetail>{metric.detail}</MetricDetail>
      </MetricTile>
    ))}
  </MetricGrid>
);

const WorkTiles: React.FC<{ nodes: LabNode[] }> = ({ nodes }) => (
  <WorkGrid>
    {nodes.map((node) => (
      <WorkTile key={`${node.eyebrow}-${node.title}`}>
        <WorkEyebrow>{node.eyebrow}</WorkEyebrow>
        <WorkTitle>{node.title}</WorkTitle>
        <WorkDetail>{node.detail}</WorkDetail>
      </WorkTile>
    ))}
  </WorkGrid>
);

const OperatorFlow = () => (
  <FlowList>
    {operatorStages.map((stage) => (
      <FlowItem key={stage.step}>
        <StepBadge>{stage.step}</StepBadge>
        <div>
          <WorkTitle>{stage.title}</WorkTitle>
          <WorkDetail>{stage.detail}</WorkDetail>
        </div>
        <GatePill>{stage.gate}</GatePill>
      </FlowItem>
    ))}
  </FlowList>
);

const getSectionTitle = (activeTab: LensFoundryTabId) => {
  switch (activeTab) {
    case 'morph':
      return 'Lens Composer and morph receipts';
    case 'design-brain':
      return 'Swan design brain graph';
    case 'operator-flow':
      return 'Hermes and Fable operator flow';
    case 'portfolio':
      return 'Creative portfolio lanes';
    case 'promotion':
      return 'Promotion gates back into SS-PT';
    default:
      return 'Lens Foundry Lab';
  }
};

const renderActiveSection = (activeTab: LensFoundryTabId) => {
  if (activeTab === 'morph') {
    return (
      <>
        <LensFoundryComposer />
        <MetricTiles metrics={morphStressMetrics} />
      </>
    );
  }
  if (activeTab === 'design-brain') return <WorkTiles nodes={designBrainNodes} />;
  if (activeTab === 'operator-flow') return <OperatorFlow />;
  if (activeTab === 'portfolio') return <WorkTiles nodes={portfolioLanes} />;
  return <MetricTiles metrics={promotionChecks} />;
};

const LensFoundryLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LensFoundryTabId>('morph');
  const activeMeta = labTabs.find((tab) => tab.id === activeTab) || labTabs[0];
  const hasLaunchUrl = lensFoundryLaunchUrl.length > 0;

  return (
    <PageShell data-testid="lens-foundry-lab">
      <HeroBand>
        <div>
          <Eyebrow>System Lab / Private Foundry</Eyebrow>
          <Title>Lens Foundry Lab</Title>
          <Subtitle>
            SwanStudios design experiments, morph engine receipts, Fable direction packets,
            Hermes operator flows, and promotion gates in one admin-owned workspace.
          </Subtitle>
        </div>
        <HeroActions>
          <StatusPill>
            <CheckCircle2 size={14} aria-hidden="true" />
            Slice 1 passed
          </StatusPill>
          <ActionLink
            href={hasLaunchUrl ? lensFoundryLaunchUrl : undefined}
            $disabled={!hasLaunchUrl}
            aria-disabled={!hasLaunchUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Rocket size={16} aria-hidden="true" />
            {hasLaunchUrl ? 'Open Foundry' : 'Foundry URL pending'}
          </ActionLink>
          <ActionLink href={lensFoundryRepoUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Private Repo
          </ActionLink>
        </HeroActions>
      </HeroBand>

      <TabBar role="tablist" aria-label="Lens Foundry Lab sections">
        {labTabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={`lens-foundry-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="lens-foundry-panel"
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.summary}
          >
            {tabIcons[tab.id]}
            {tab.label}
          </TabButton>
        ))}
      </TabBar>

      <Section
        id="lens-foundry-panel"
        role="tabpanel"
        aria-labelledby={`lens-foundry-tab-${activeTab}`}
      >
        <SectionHeading>
          <SectionTitle id="lens-foundry-section-title">{getSectionTitle(activeTab)}</SectionTitle>
          <SectionSummary>{activeMeta.summary}</SectionSummary>
        </SectionHeading>
        {renderActiveSection(activeTab)}
      </Section>
    </PageShell>
  );
};

export default LensFoundryLab;

