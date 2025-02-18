import type React from "react"
import styled from "styled-components"
import { motion } from "framer-motion"

const TestimonialCard = styled(motion.div)`
  background-color: #fff;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

const TestimonialImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
`

const TestimonialName = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #6a0dad;
`

const TestimonialText = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: #333;
`

interface TestimonialProps {
  name: string
  image: string
  text: string
}

const Testimonial: React.FC<TestimonialProps> = ({ name, image, text, ...props }) => {
  return (
    <TestimonialCard {...props}>
      <TestimonialImage src={image} alt={name} />
      <TestimonialName>{name}</TestimonialName>
      <TestimonialText>{text}</TestimonialText>
    </TestimonialCard>
  )
}

export default Testimonial

