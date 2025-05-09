import type React from "react"
import styled, { css } from "styled-components"
import { motion } from "framer-motion"
import { FaStar } from "react-icons/fa"

const TestimonialCard = styled(motion.div)`
  background: rgba(25, 25, 45, 0.8);
  border-radius: 16px;
  padding: ${props => props.$featured ? '2.5rem' : '2rem'};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    border-color: rgba(120, 81, 169, 0.3);
  }
  
  ${props => props.$featured && css`
    border: 1px solid rgba(120, 81, 169, 0.3);
  `}
  
  @media (max-width: 768px) {
    padding: ${props => props.$featured ? '2rem 1.5rem' : '1.5rem'};
  }
`

const CardInner = styled.div`
  display: flex;
  flex-direction: ${props => props.$featured ? 'row' : 'column'};
  align-items: ${props => props.$featured ? 'flex-start' : 'center'};
  text-align: ${props => props.$featured ? 'left' : 'center'};
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`

const ImageContainer = styled.div`
  border-radius: 50%;
  overflow: hidden;
  width: ${props => props.$featured ? '120px' : '100px'};
  height: ${props => props.$featured ? '120px' : '100px'};
  flex-shrink: 0;
  margin-right: ${props => props.$featured ? '2.5rem' : '0'};
  margin-bottom: ${props => props.$featured ? '0' : '1.5rem'};
  border: 3px solid rgba(120, 81, 169, 0.5);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    margin: 0 auto 1.5rem;
  }
`

const TestimonialImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ContentContainer = styled.div`
  flex: 1;
`

const QuoteText = styled.p`
  font-size: ${props => props.$featured ? '1.25rem' : '1.1rem'};
  line-height: 1.7;
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  position: relative;
  
  &::before {
    content: '"';
    font-size: ${props => props.$featured ? '4rem' : '3rem'};
    position: absolute;
    top: -1.5rem;
    left: -0.5rem;
    color: rgba(120, 81, 169, 0.3);
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    
    &::before {
      font-size: 3rem;
      left: 0;
      top: -1.5rem;
    }
  }
`

const TestimonialName = styled.h3`
  font-size: ${props => props.$featured ? '1.5rem' : '1.2rem'};
  margin-bottom: 0.3rem;
  color: #fff;
  font-weight: 600;
`

const TestimonialRole = styled.p`
  font-size: ${props => props.$featured ? '1rem' : '0.9rem'};
  color: #00e5ff;
  margin: 0 0 0.5rem;
`

const Rating = styled.div`
  display: flex;
  margin-top: 0.5rem;
  color: #ffd700;
  
  svg {
    margin-right: 3px;
  }
`

interface TestimonialProps {
  name: string
  image: string
  text: string
  featured?: boolean
  role?: string
}

const StarRating: React.FC = () => {
  return (
    <Rating>
      {[...Array(5)].map((_, i) => (
        <FaStar key={i} />
      ))}
    </Rating>
  );
};

const Testimonial: React.FC<TestimonialProps> = ({ 
  name, 
  image, 
  text, 
  featured = false,
  role = 'Client',
  ...props 
}) => {
  return (
    <TestimonialCard $featured={featured} {...props}>
      <CardInner $featured={featured}>
        <ImageContainer $featured={featured}>
          <TestimonialImage src={image} alt={name} />
        </ImageContainer>
        
        <ContentContainer>
          <QuoteText $featured={featured}>{text}</QuoteText>
          <TestimonialName $featured={featured}>{name}</TestimonialName>
          <TestimonialRole $featured={featured}>{role}</TestimonialRole>
          <StarRating />
        </ContentContainer>
      </CardInner>
    </TestimonialCard>
  )
}

export default Testimonial

