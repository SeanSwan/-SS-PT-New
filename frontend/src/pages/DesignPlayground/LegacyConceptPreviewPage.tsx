/**
 * Legacy concept preview — preserves the original twelve Design Playground studies.
 *
 * BLUEPRINT: this full-page viewer is an admin-only archive linked from the canonical Design Studio. It does
 * not import or promote parked vNext surfaces and it has no environment or feature-flag dependency.
 */
import { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  allConcepts,
  conceptCategories,
  conceptComponents,
  conceptNames,
} from './concepts/shared/conceptRegistry';
import {
  ArrowButton,
  BackButton,
  CategoryGroup,
  CategoryLabel,
  ConceptInfo,
  DotInner,
  ErrorContainer,
  ErrorTitle,
  FloatingNav,
  LoadingContainer,
  MobileCounter,
  NavDot,
  Separator,
  Spinner,
  VersionBadge,
  ViewerContainer,
} from './LegacyConceptPreview.styles';

const CATEGORY_ABBREVIATIONS: Record<string, string> = {
  'nature-wellness': 'NW',
  'cyberpunk-premium': 'CP',
  'marble-luxury': 'ML',
  'hybrid-nature-tech': 'HNT',
  'fun-and-bold': 'FB',
  'art-deco-glamour': 'ADG',
  'ethereal-wilderness': 'EW',
};

const DESIGN_STUDIO_PATH = '/dashboard/admin/design-playground';

const LegacyConceptPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conceptId = id ?? '';
  const currentIndex = allConcepts.findIndex((concept) => concept.id === conceptId);
  const currentConcept = currentIndex >= 0 ? allConcepts[currentIndex] : null;

  if (!currentConcept || !conceptComponents[conceptId]) {
    return (
      <ErrorContainer>
        <ErrorTitle>Concept not found</ErrorTitle>
        <p>No concept matches &quot;{conceptId}&quot;. Select a registered concept from the Design Studio.</p>
        <BackButton type="button" onClick={() => navigate(DESIGN_STUDIO_PATH)}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to Design Studio
        </BackButton>
      </ErrorContainer>
    );
  }

  const ConceptComponent = conceptComponents[conceptId];
  const previousId = currentIndex > 0 ? allConcepts[currentIndex - 1].id : null;
  const nextId = currentIndex < allConcepts.length - 1 ? allConcepts[currentIndex + 1].id : null;

  return (
    <ViewerContainer>
      <FloatingNav aria-label="Legacy design concepts">
        <BackButton type="button" onClick={() => navigate(DESIGN_STUDIO_PATH)}>
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </BackButton>
        <Separator />
        <ArrowButton
          type="button"
          onClick={() => previousId && navigate(`/designs/${previousId}`)}
          disabled={!previousId}
          aria-label="Previous concept"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </ArrowButton>
        <MobileCounter>{currentIndex + 1} / {allConcepts.length}</MobileCounter>
        {conceptCategories.map((category) => (
          <CategoryGroup key={category.category}>
            <CategoryLabel>{CATEGORY_ABBREVIATIONS[category.category]}</CategoryLabel>
            {category.concepts.map((concept) => (
              <NavDot
                key={concept.id}
                type="button"
                $active={conceptId === concept.id}
                $color={concept.colors.primary}
                onClick={() => navigate(`/designs/${concept.id}`)}
                aria-label={`${concept.name} (v${concept.version})`}
                title={`${concept.name} (v${concept.version})`}
              >
                <DotInner $active={conceptId === concept.id} $color={concept.colors.primary} />
              </NavDot>
            ))}
          </CategoryGroup>
        ))}
        <ArrowButton
          type="button"
          onClick={() => nextId && navigate(`/designs/${nextId}`)}
          disabled={!nextId}
          aria-label="Next concept"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </ArrowButton>
        <Separator />
        <ConceptInfo>
          {currentConcept.name}
          <VersionBadge $version={currentConcept.version}>v{currentConcept.version}</VersionBadge>
        </ConceptInfo>
      </FloatingNav>

      <Suspense fallback={<LoadingContainer><Spinner /><p>Loading {conceptNames[conceptId]}…</p></LoadingContainer>}>
        <ConceptComponent />
      </Suspense>
    </ViewerContainer>
  );
};

export default LegacyConceptPreviewPage;