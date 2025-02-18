import styled from "styled-components"
import { motion } from "framer-motion"
import Testimonial from "./Testimonial"

// ✅ Styled Section Container
const TestimonialSectionContainer = styled.section`
  padding: 4rem 2rem;
  background-color: #f0f0f0;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  text-align: center;
  color: #6a0dad;
`

const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`

// ✅ Testimonials Data
const testimonials = [
  {
    name: "Emily Carter",
    image: "/emily-carter.jpg",
    text: "Before SwanStudios, I felt stuck—mentally and physically. Their training isn’t just about lifting weights; it’s about rebuilding confidence and strength from within. The trainers genuinely care, and for the first time, I feel empowered in my own body."
  },
  {
    name: "James Reynolds",
    image: "/james-reynolds.jpg",
    text: "I walked into SwanStudios out of shape and doubting myself. Today, I walk out feeling like a warrior. The combination of strength training, injury prevention, and mindset coaching has changed my life in ways I never imagined."
  },
  {
    name: "Sophia Martinez",
    image: "/sophia-martinez.jpg",
    text: "SwanStudios isn't just a gym—it’s a community that uplifts you. I used to think fitness was about looking a certain way, but now I see it’s about feeling strong, pain-free, and limitless. My transformation here has been nothing short of life-changing."
  },
  {
    name: "Michael Thompson",
    image: "/michael-thompson.jpg",
    text: "As a former athlete, I thought my best days were behind me. SwanStudios proved me wrong. Their science-backed training helped me regain my mobility, explosiveness, and confidence. I feel ten years younger and stronger than ever."
  },
  {
    name: "Olivia Parker",
    image: "/olivia-parker.jpg",
    text: "The trainers at SwanStudios are like fitness architects, designing programs that sculpt not just your body but your entire lifestyle. I’ve never felt so energized, capable, and in control of my health. This place is a game-changer!"
  },
  {
    name: "David Mitchell",
    image: "/david-mitchell.jpg",
    text: "I came in looking for a workout plan. I found a transformation. SwanStudios challenged me physically and mentally, and today, I stand taller, move better, and live stronger. This training doesn’t just change your body—it changes your life."
  }
]

export default function TestimonialSection() {
  return (
    <TestimonialSectionContainer>
      {/* ✅ Title Animation */}
      <Title initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
        What Our Clients Say
      </Title>

      {/* ✅ Testimonials Grid with Motion Wrapper */}
      <TestimonialGrid>
        {testimonials.map((testimonial, index) => (
          <motion.div key={index} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: index * 0.2 }}>
            <Testimonial {...testimonial} />
          </motion.div>
        ))}
      </TestimonialGrid>
    </TestimonialSectionContainer>
  )
}
