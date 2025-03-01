import styled from 'styled-components';

export const Container = styled.div`
display: flex;
flex-wrap: nowrap;
justify-content: center;
max-width: 100%;
padding: 1rem;

@media (max-width: 480px) {
  flex-wrap: wrap;
}
`;

export const SvgLetter = styled.svg`
display: inline-block;
width: 100%; // Use relative width
margin-right: 5px;
padding: 3px;

display: inline-flex;
flex-grow: 1;
margin-right: 5px;
padding: 3px;

@media (min-width: 480px) {
  margin-right: 6px;
  padding: 4px;
}

@media (min-width: 768px) {
  margin-right: 8px;
  padding: 5px;
}

@media (min-width: 1200px) {
  margin-right: 10px;
  padding: 6px;
}

@media (min-width: 1500px) {
  margin-right: 12px;
  padding: 7px;
}

@media (min-width: 3840px) {
  margin-right: 14px;
  padding: 8px;
}
`;

export const AnimatedPath = styled.path`
stroke-dasharray: 1000;
stroke-dashoffset: 1000;
stroke: ${(props) => props.strokeColor || '#000'};
`;