import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';
import { FaInstagram, FaHeart, FaComment, FaShare, FaPlay } from 'react-icons/fa';
import GlowButton from "../ui/buttons/GlowButton"; // Import your GlowButton component

// Import dummy Instagram post images from assets - Ensure paths are correct
const post1 = "/image1.jpg";
const post2 = "/image2.jpg";
const post3 = "/image3.jpg";
const post4 = '/femaleoldwht.jpg';
const post5 = '/femalelat.jpg';
const post6 = '/male1.jpg';
const videoThumb1 = '/maleblk.jpg';
const videoThumb2 = '/femalewht.jpg';
// --- TypeScript Interfaces ---
interface InstagramPost {
  id: number;
  image: string;
  isVideo: boolean;
  avatar: string;
  author: string;
  date: string;
  caption: string;
  hashtags: string;
  likes: number;
  comments: number;
  shares: number;
  instagramUrl?: string;
}

// --- Animation Keyframes ---
// Single subtle diagonal glimmer animation every 5 seconds
const diagonalGlimmer = keyframes`
  0%, 85% {
    background-position: -200% 200%;
    opacity: 0;
  }
  90%, 95% {
    background-position: 0% 0%;
    opacity: 0.8;
  }
  100% {
    background-position: 200% -200%;
    opacity: 0;
  }
`;

// --- Styled Components ---
// Main Instagram section container with a gradient background
const InstagramSection = styled.section`
  padding: 5rem 0;
  background: linear-gradient(to bottom, #0a0a0a, #121212);
  position: relative;
  overflow: hidden;
`;

// A decorative background shape for added visual interest
const BackgroundShape = styled.div`
  position: absolute;
  width: 80%;
  height: 300px;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 255, 255, 0.05) 0%,
    rgba(120, 81, 169, 0.05) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: blur(80px);
  z-index: 0;
  pointer-events: none;
`;

// Container that centers content and provides proper horizontal padding
const SectionContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

// Header for the section with title and subtitle centered
const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

// Title with gradient text and underline styling
const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: white;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  display: inline-block;
  
  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    border-radius: 3px;
  }
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

// Subtitle with lighter text for clarity
const SectionSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: #c0c0c0;
  max-width: 800px;
  margin: 0 auto;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// Instagram handle link styled with a neon-blue color
const InstagramHandle = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--neon-blue, #00ffff);
  font-size: 1.2rem;
  text-decoration: none;
  margin-top: 1rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

// Grid layout for the Instagram posts
const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  width: 100%;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin: 0 auto;
  }
`;

// A container for each post card with improved diagonal glimmer effect
const PostCardContainer = styled.div`
  background: rgba(20, 20, 30, 0.6);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  /* Single subtle diagonal glimmer effect (top-right to bottom-left) */
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalGlimmer} 5s linear infinite;
    pointer-events: none;
    border-radius: 16px;
    opacity: 0;
    z-index: 1;
  }
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
    
    &:after {
      opacity: 1;
    }
  }
`;

// Container for the post image and video overlay
const PostImageContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 Aspect Ratio for pixel perfect squares */
  overflow: hidden;
  cursor: pointer;
  z-index: 2;
  
  &:hover .instagram-link-overlay {
    opacity: 1;
    transform: translateY(0);
  }
`;

// The post image with a scale effect on hover
const PostImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
  
  ${PostImageContainer}:hover & {
    transform: scale(1.08);
  }
`;

// Overlay for video posts to show a play icon
const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    font-size: 3rem;
    color: white;
    opacity: 0.8;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
  }
`;

// Overlay to indicate Instagram link
const InstagramLinkOverlay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  padding: 8px;
  opacity: 0;
  transform: translateY(-5px);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  font-size: 0.8rem;
  
  svg {
    font-size: 1.2rem;
    color: #E4405F;
  }
`;

// Container for the textual content of a post
const PostContent = styled.div`
  padding: 1.5rem;
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

// Header section of the post, including avatar and author info
const PostHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

// Avatar container with border styling
const PostAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 0.5rem;
  border: 2px solid var(--neon-blue, #00ffff);
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// Post information (author and date)
const PostInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

// Author name styling
const PostAuthor = styled.h3`
  font-size: 1rem;
  color: white;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Date styling for each post
const PostDate = styled.p`
  font-size: 0.8rem;
  color: #808080;
  margin: 0;
`;

// Caption styling with line clamping for consistency
const PostCaption = styled.p`
  font-size: 0.9rem;
  color: #c0c0c0;
  margin-bottom: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: calc(1.5 * 0.9rem * 3);
`;

// Hashtags styling with neon-blue color
const PostHashtags = styled.p`
  font-size: 0.9rem;
  color: var(--neon-blue, #00ffff);
  margin-bottom: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Stats styling (likes, comments, shares)
const PostStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
  color: #c0c0c0;
`;

// Individual stat item styling
const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

// Button container for centering GlowButtons
const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 4rem;
  position: relative;
  z-index: 5;

  /* Add a glow behind the button to make it pop */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 180px;
    height: 60px;
    background: radial-gradient(ellipse at center, rgba(120, 81, 169, 0.5) 0%, transparent 70%);
    filter: blur(25px);
    z-index: -1;
  }
`;

// --- Animation Variants ---
const titleVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } }
};

const handleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.4 } }
};

const cardVariants: HTMLMotionProps<"div">["variants"] = {
  hidden: { opacity: 0, y: 30 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.1 * index,
      type: "spring",
      stiffness: 100
    }
  })
};

// --- Real Instagram Posts Data with Actual URLs ---
const instagramPosts: InstagramPost[] = [
  {
    id: 1,
    image: post1,
    isVideo: false,
    avatar: post6,
    author: "sswanstudios",
    date: "2 weeks ago",
    caption: "Training excellence in action! 💪 Watch our clients push their limits and achieve incredible results. This is what dedication looks like.",
    hashtags: "#SwanStudios #PersonalTraining #FitnessMotivation #StrengthTraining #ClientSuccess",
    likes: 284,
    comments: 32,
    shares: 15,
    instagramUrl: "https://www.instagram.com/p/C3vQ9P4pP-e/"
  },
  {
    id: 2,
    image: videoThumb1,
    isVideo: true,
    avatar: post6,
    author: "sswanstudios",
    date: "2 weeks ago",
    caption: "Form is everything! 🎯 Coach Sean breaking down the perfect squat technique. Quality movement patterns lead to lasting results.",
    hashtags: "#ProperForm #SquatTechnique #PersonalTrainer #FitnessEducation #SwanStudios",
    likes: 392,
    comments: 48,
    shares: 67,
    instagramUrl: "https://www.instagram.com/p/C3YKUE2MO38/"
  },
  {
    id: 3,
    image: post2,
    isVideo: false,
    avatar: post6,
    author: "sswanstudios",
    date: "3 weeks ago",
    caption: "Consistency breeds champions! 🏆 Our client testimonials speak volumes about the Swan Studios difference. Your transformation starts here.",
    hashtags: "#ClientTestimonials #TransformationStory #SwanStudios #FitnessJourney #Results",
    likes: 456,
    comments: 71,
    shares: 89,
    instagramUrl: "https://www.instagram.com/p/C2Ts4f6P1yq/"
  },
  {
    id: 4,
    image: videoThumb2,
    isVideo: true,
    avatar: post6,
    author: "sswanstudios",
    date: "3 weeks ago",
    caption: "Behind the scenes at Swan Studios! 🎬 See what goes into creating personalized training programs that deliver real results.",
    hashtags: "#BehindTheScenes #PersonalizedTraining #SwanStudios #FitnessStudio #ProfessionalTraining",
    likes: 318,
    comments: 54,
    shares: 42,
    instagramUrl: "https://www.instagram.com/p/C3Qb6hvgohV/"
  },
  {
    id: 5,
    image: post3,
    isVideo: false,
    avatar: post6,
    author: "sswanstudios",
    date: "3 weeks ago",
    caption: "Innovation meets tradition 🔬 Cutting-edge training methods combined with proven techniques. This is modern fitness done right.",
    hashtags: "#InnovativeTraining #ModernFitness #SwanStudios #FitnessInnovation #TrainingMethods",
    likes: 523,
    comments: 68,
    shares: 91,
    instagramUrl: "https://www.instagram.com/p/C3N25ylPjkf/"
  },
  {
    id: 6,
    image: post4,
    isVideo: false,
    avatar: post6,
    author: "sswanstudios",
    date: "4 weeks ago",
    caption: "Mind-body connection in action! 🧠💪 At Swan Studios, we train more than just muscles - we develop complete athletes and confident individuals.",
    hashtags: "#MindBodyConnection #HolisticFitness #SwanStudios #MentalStrength #CompleteTraining",
    likes: 647,
    comments: 83,
    shares: 124,
    instagramUrl: "https://www.instagram.com/p/C22dSFQOq6h/"
  }
];

// --- Instagram Feed Component ---
const InstagramFeed: React.FC = () => {
  const displayedPosts = instagramPosts; // Show all real Instagram posts

  return (
    <InstagramSection id="instagram">
      <BackgroundShape />
      <SectionContainer>
        <SectionHeader>
          <SectionTitle
            variants={titleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Follow Our Journey
          </SectionTitle>
          <SectionSubtitle
            variants={subtitleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Follow our latest posts for training insights, client success stories, and behind-the-scenes content from SwanStudios.
          </SectionSubtitle>
          <InstagramHandle
            href="https://www.instagram.com/sswanstudios"
            target="_blank"
            rel="noopener noreferrer"
            variants={handleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <FaInstagram /> @sswanstudios
          </InstagramHandle>
        </SectionHeader>

        <PostsGrid>
          {displayedPosts.map((post, index) => (
            <PostCardContainer key={post.id}>
              <motion.div
                custom={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <PostImageContainer
                  onClick={() => {
                    if (post.instagramUrl) {
                      window.open(post.instagramUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  style={{ cursor: post.instagramUrl ? 'pointer' : 'default' }}
                  title={post.instagramUrl ? 'View post on Instagram' : ''}
                >
                  <PostImage src={post.image} alt={post.caption} loading="lazy" />
                  {post.isVideo && (
                    <VideoOverlay>
                      <FaPlay />
                    </VideoOverlay>
                  )}
                  {post.instagramUrl && (
                    <InstagramLinkOverlay className="instagram-link-overlay">
                      <FaInstagram />
                      <span>View on IG</span>
                    </InstagramLinkOverlay>
                  )}
                </PostImageContainer>
                <PostContent>
                  <PostHeader>
                    <PostAvatar>
                      <img src={post.avatar} alt={post.author} loading="lazy" />
                    </PostAvatar>
                    <PostInfo>
                      <PostAuthor>{post.author}</PostAuthor>
                      <PostDate>{post.date}</PostDate>
                    </PostInfo>
                  </PostHeader>
                  <PostCaption>{post.caption}</PostCaption>
                  <PostHashtags>{post.hashtags}</PostHashtags>
                  <PostStats>
                    <StatItem>
                      <FaHeart /> {post.likes}
                    </StatItem>
                    <StatItem>
                      <FaComment /> {post.comments}
                    </StatItem>
                    <StatItem>
                      <FaShare /> {post.shares}
                    </StatItem>
                  </PostStats>
                </PostContent>
              </motion.div>
            </PostCardContainer>
          ))}
        </PostsGrid>

        {/* "Follow Us On Instagram" button - replaced with GlowButton */}
        <ButtonContainer>
          <GlowButton
            text="Follow Us On Instagram"
            theme="cosmic"
            size="large"
            leftIcon={<FaInstagram />}
            onClick={() => window.open('https://www.instagram.com/sswanstudios', '_blank')}
            animateOnRender={false}
          />
        </ButtonContainer>
      </SectionContainer>
    </InstagramSection>
  );
};

export default InstagramFeed;
