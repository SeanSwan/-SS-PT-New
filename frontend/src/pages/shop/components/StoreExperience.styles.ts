import styled from 'styled-components';

export const ExperienceSection = styled.section`
  width: min(100% - 2rem, 1180px);
  margin: 0 auto;
  padding: clamp(2.5rem, 5vw, 5rem) 0;
  scroll-margin-top: 5rem;
`;
export const Eyebrow = styled.p`color: var(--accent-gold, #c6a84b); font-size: .75rem; font-weight: 800; letter-spacing: .16em; margin: 0 0 .8rem; text-transform: uppercase;`;
export const ExperienceHeading = styled.h2`color: var(--text-heading, #e0ecf4); font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif); font-size: clamp(2.1rem, 5vw, 4rem); line-height: 1; margin: 0; max-width: 16ch;`;
export const ExperienceLead = styled.p`color: var(--text-secondary, rgba(224,236,244,.82)); font-size: clamp(1rem, 1.7vw, 1.2rem); line-height: 1.7; margin: 1.25rem 0 0; max-width: 62ch;`;
export const StoryGrid = styled.div`display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 2.5rem; @media (max-width: 760px) { grid-template-columns: 1fr; }`;
export const StoryStep = styled.article`padding: 1.25rem; border: 1px solid rgba(96,192,240,.18); border-radius: 1rem; background: linear-gradient(145deg, rgba(0,48,128,.24), rgba(7,12,32,.76)); min-width: 0;`;
export const StepNumber = styled.span`display: inline-grid; place-items: center; width: 2rem; height: 2rem; border: 1px solid rgba(198,168,75,.6); border-radius: 50%; color: var(--accent-gold, #c6a84b); font-weight: 800;`;
export const StepHeading = styled.h3`color: var(--text-heading, #e0ecf4); font-size: 1.1rem; margin: 1rem 0 .45rem;`;
export const StepText = styled.p`color: var(--text-secondary, rgba(224,236,244,.76)); line-height: 1.55; margin: 0;`;
export const SpotlightCard = styled.article`display: grid; gap: 1.35rem; grid-template-columns: minmax(0, 1.3fr) minmax(14rem, .7fr); align-items: center; padding: clamp(1.3rem, 4vw, 2.6rem); border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 48%, transparent); border-radius: 1.4rem; background: radial-gradient(circle at 10% 0%, rgba(198,168,75,.2), transparent 40%), linear-gradient(145deg, rgba(14,25,66,.96), rgba(13,11,25,.96)); box-shadow: 0 1.5rem 4rem rgba(0,0,0,.3); @media (max-width: 700px) { grid-template-columns: 1fr; }`;
export const SpotlightFacts = styled.div`display: grid; gap: .65rem; padding: 1rem; border-radius: 1rem; background: rgba(0,0,0,.2);`;
export const FactRow = styled.div`display: flex; justify-content: space-between; gap: 1rem; color: var(--text-secondary, rgba(224,236,244,.78)); font-size: .9rem; line-height: 1.4; overflow-wrap: anywhere;`;
export const FactValue = styled.strong`color: var(--text-heading, #f6f2e8); font-family: var(--font-data, "Fira Code", monospace); text-align: right;`;
export const ExperienceActions = styled.div`display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.15rem;`;
export const ExperienceButton = styled.button`min-width: 44px; min-height: 48px; padding: .75rem 1.1rem; border: 1px solid var(--accent-primary, #60c0f0); border-radius: 999px; background: linear-gradient(135deg, var(--accent-primary, #002060), var(--accent-purple, #493082)); color: var(--text-primary, #e0ecf4); cursor: pointer; font: inherit; font-weight: 800; &:disabled { cursor: not-allowed; opacity: .58; } &:focus-visible { outline: 2px solid var(--accent-gold, #c6a84b); outline-offset: 3px; }`;
export const ComparisonTable = styled.div`overflow-x: auto; border: 1px solid rgba(96,192,240,.18); border-radius: 1rem; background: rgba(0,32,96,.24);`;
export const ComparisonDisclosure = styled.details`summary { display: flex; align-items: center; min-height: 44px; margin-bottom: .75rem; color: var(--text-heading, #e0ecf4); cursor: pointer; font-weight: 800; &:focus-visible { outline: 2px solid var(--accent-gold, #c6a84b); outline-offset: 3px; } }`;
export const ComparisonRow = styled.div`display: grid; grid-template-columns: minmax(10rem, 1.4fr) repeat(4, minmax(7rem, 1fr)); min-width: 44rem; border-bottom: 1px solid rgba(96,192,240,.12); &:last-child { border-bottom: 0; } > * { padding: .85rem; }`;
export const ComparisonCell = styled.div`color: var(--text-secondary, rgba(224,236,244,.8)); font-size: .84rem; line-height: 1.35; overflow-wrap: anywhere;`;
export const ComparisonHeader = styled(ComparisonCell)`color: var(--text-heading, #f6f2e8); font-weight: 800;`;
