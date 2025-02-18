import styled from "styled-components"
import { motion } from "framer-motion"
import Hero from "./Hero"
import ImageCarousel from "./ImageCarousel"
import AboutContent from "./AboutContent"
import TestimonialSection from "./TestimonialSection"

const AboutPage = styled(motion.div)`
  width: 100%;
  min-height: 100vh;
  background-color: #f0f0f0;
  color: #333;
`

export default function About() {
  return (
    <AboutPage initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Hero />
      {/* <ImageCarousel /> */}
      <AboutContent />
      <TestimonialSection />
    </AboutPage>
  )
}