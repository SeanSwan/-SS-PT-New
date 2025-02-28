import styled from "styled-components";
import { motion } from "framer-motion";
import Testimonial from "./Testimonial";

// 1️⃣ Import local images from your assets folder
import maleBlk from "../../assets/maleblk.jpg";
import femaleLat from "../../assets/femalelat.jpg";
import femalewht from "../../assets/femalewht.jpg";
import femaleoldwht from "../../assets/femaleoldwht.jpg";
import male1 from "../../assets/male1.jpg";
import male2 from "../../assets/male2.jpg";

// Styled Section Container
const TestimonialSectionContainer = styled.section`
  padding: 4rem 2rem;
  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  text-align: center;
  color: #6a0dad;
`;

const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

// 2️⃣ Testimonials Data
// - If "image" is defined, it will use your local image import.
// - If "image" is NOT defined, it will fallback to a randomuser avatar.
const testimonials = [
  {
    name: "Emily Carter",
    gender: "female",
    image: femalewht, // Uncomment to use local image
    text: "Before SwanStudios, I felt stuck—mentally and physically. Their training isn’t just about lifting weights; it’s about rebuilding confidence and strength from within. The trainers genuinely care, and for the first time, I feel empowered in my own body."
  },
  {
    name: "James Reynolds",
    gender: "male",
    image: maleBlk, // Using local image from assets
    text: "I walked into SwanStudios out of shape and doubting myself. Today, I walk out feeling like a warrior. The combination of strength training, injury prevention, and mindset coaching has changed my life in ways I never imagined."
  },
  {
    name: "Sophia Martinez",
    gender: "female",
    image: femaleLat, // Another local image
    text: "SwanStudios isn't just a gym—it’s a community that uplifts you. I used to think fitness was about looking a certain way, but now I see it’s about feeling strong, pain-free, and limitless. My transformation here has been nothing short of life-changing."
  },
  {
    name: "Michael Thompson",
    gender: "male",
    image: male2,
    text: "As a former athlete, I thought my best days were behind me. SwanStudios proved me wrong. Their science-backed training helped me regain my mobility, explosiveness, and confidence. I feel ten years younger and stronger than ever."
  },
  {
    name: "Olivia Parker",
    gender: "female",
    image: femaleoldwht,
    text: "The trainers at SwanStudios are like fitness architects, designing programs that sculpt not just your body but your entire lifestyle. I’ve never felt so energized, capable, and in control of my health. This place is a game-changer!"
  },
  {
    name: "David Mitchell",
    gender: "male",
    image: male1,
    text: "I came in looking for a workout plan. I found a transformation. SwanStudios challenged me physically and mentally, and today, I stand taller, move better, and live stronger. This training doesn’t just change your body—it changes your life."
  }
];

// 3️⃣ Counters for remote avatars to provide unique images
let remoteMaleCounter = 1;
let remoteFemaleCounter = 1;

// 4️⃣ Helper function to determine which image URL to use
const getAvatar = (testimonial) => {
  // If a custom image is provided, use it (imported from your assets).
  if (testimonial.image) {
    return testimonial.image;
  }
  // Otherwise, return a remote avatar based on gender.
  if (testimonial.gender === "male") {
    const url = `https://randomuser.me/api/portraits/men/${remoteMaleCounter}.jpg`;
    remoteMaleCounter++;
    return url;
  } else if (testimonial.gender === "female") {
    const url = `https://randomuser.me/api/portraits/women/${remoteFemaleCounter}.jpg`;
    remoteFemaleCounter++;
    return url;
  }
  // Fallback to a generic remote avatar if gender is not provided.
  return "https://randomuser.me/api/portraits/lego/1.jpg";
};

export default function TestimonialSection() {
  // 5️⃣ Build the final array with correct image sources
  const testimonialsWithAvatars = testimonials.map((testimonial) => ({
    ...testimonial,
    image: getAvatar(testimonial),
  }));

  return (
    <TestimonialSectionContainer>
      <Title
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        What Our Clients Say
      </Title>

      <TestimonialGrid>
        {testimonialsWithAvatars.map((testimonial, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <Testimonial {...testimonial} />
          </motion.div>
        ))}
      </TestimonialGrid>
    </TestimonialSectionContainer>
  );
}
