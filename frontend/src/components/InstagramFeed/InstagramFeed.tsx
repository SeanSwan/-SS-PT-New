import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';
import { FaInstagram, FaHeart, FaComment, FaShare, FaPlay } from 'react-icons/fa';
import GlowButton from "../Button/glowButton"; // Import your GlowButton component

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
}

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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

// A container for each post card with hover effects
const PostCardContainer = styled.div`
  background: rgba(25, 25, 35, 0.8);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  }
`;

// Container for the post image and video overlay
const PostImageContainer = styled.div`
  position: relative;
  height: 280px;
  overflow: hidden;
  cursor: pointer;
`;

// The post image with a scale effect on hover
const PostImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  
  ${PostImageContainer}:hover & {
    transform: scale(1.05);
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

// Container for the textual content of a post
const PostContent = styled.div`
  padding: 1.5rem;
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
const PostAuthor = styled.h4`
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
  margin-top: 3rem;
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

// --- Sample Instagram Posts Data ---
const instagramPosts: InstagramPost[] = [
  {
    id: 1,
    image: post1,
    isVideo: false,
    avatar: post6,
    author: "swanstudios",
    date: "2 days ago",
    caption: "Our client Jane crushing her deadlift PR! Hard work paying off after just 3 months of consistent training.",
    hashtags: "#fitnessmotivation #strengthtraining #personaltraining",
    likes: 328,
    comments: 42,
    shares: 12
  },
  {
    id: 2,
    image: videoThumb1,
    isVideo: true,
    avatar: post6,
    author: "swanstudios",
    date: "4 days ago",
    caption: "Quick tutorial: 3 mobility exercises you can do anywhere to improve hip flexibility and prevent lower back pain.",
    hashtags: "#mobilitytraining #flexibilityworkout #injuryprevention",
    likes: 456,
    comments: 67,
    shares: 89
  },
  {
    id: 3,
    image: post2,
    isVideo: false,
    avatar: post6,
    author: "swanstudios",
    date: "1 week ago",
    caption: "Congratulations to our client Mark on his incredible 6-month transformation! 32lbs down and significantly stronger.",
    hashtags: "#transformationtuesday #weightlossjourney #fitnessresults",
    likes: 712,
    comments: 98,
    shares: 124
  },
  {
    id: 4,
    image: videoThumb2,
    isVideo: true,
    avatar: post6,
    author: "swanstudios",
    date: "1 week ago",
    caption: "Coach Sean explains the science behind progressive overload and why it's essential for continued results.",
    hashtags: "#fitnessscience #strengthcoach #fitnessexpert",
    likes: 289,
    comments: 45,
    shares: 38
  },
  {
    id: 5,
    image: post3,
    isVideo: false,
    avatar: post6,
    author: "swanstudios",
    date: "2 weeks ago",
    caption: "New equipment just arrived at the studio! Come check out our expanded training space with state-of-the-art gear.",
    hashtags: "#gymequipment #trainingfacility #fitnessupgrade",
    likes: 503,
    comments: 72,
    shares: 28
  },
  {
    id: 6,
    image: post4,
    isVideo: false,
    avatar: post6,
    author: "swanstudios",
    date: "3 weeks ago",
    caption: "Client spotlight: At 58, Susan proves that age is just a number. She's now stronger than she was in her 30s!",
    hashtags: "#agelessfitness #strengthoversixy #seniorhealth",
    likes: 612,
    comments: 87,
    shares: 103
  },
  {
    id: 7,
    image: post5,
    isVideo: false,
    avatar: post6,
    author: "swanstudios",
    date: "3 weeks ago",
    caption: "Nutrition tip: Simple protein-packed meal prep ideas for busy professionals who still want to prioritize their health.",
    hashtags: "#mealprep #nutritioncoaching #healthyeating",
    likes: 421,
    comments: 63,
    shares: 92
  },
  {
    id: 8,
    image: post1,
    isVideo: false,
    avatar: post6,
    author: "swanstudios",
    date: "1 month ago",
    caption: "Team SwanStudios at the Charity Fitness Challenge this weekend. Proud to have raised over $5,000 for children's health programs!",
    hashtags: "#fitnessforgood #charityevent #communityimpact",
    likes: 687,
    comments: 104,
    shares: 156
  }
];

// --- Instagram Feed Component ---
const InstagramFeed: React.FC = () => {
  const [visiblePosts, setVisiblePosts] = useState<number>(6);

  const handleShowMore = () => {
    setVisiblePosts(instagramPosts.length);
  };

  const displayedPosts = instagramPosts.slice(0, visiblePosts);

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
            Get inspired by real transformations, workout tips, and behind-the-scenes content from our community.
          </SectionSubtitle>
          <InstagramHandle
            href="https://instagram.com/swanstudios"
            target="_blank"
            rel="noopener noreferrer"
            variants={handleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <FaInstagram /> @swanstudios
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
                <PostImageContainer>
                  <PostImage src={post.image} alt={post.caption} loading="lazy" />
                  {post.isVideo && (
                    <VideoOverlay>
                      <FaPlay />
                    </VideoOverlay>
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

        {/* "Show More Posts" button - replaced with GlowButton */}
        {visiblePosts < instagramPosts.length && (
          <ButtonContainer>
            <GlowButton
              text="Show More Posts"
              theme="cosmic"
              size="medium"
              onClick={handleShowMore}
              animateOnRender={false}
            />
          </ButtonContainer>
        )}

        {/* "Follow Us On Instagram" button - replaced with GlowButton */}
        <ButtonContainer>
          <GlowButton
            text="Follow Us On Instagram"
            theme="purple"
            size="medium"
            leftIcon={<FaInstagram />}
            onClick={() => window.open('https://instagram.com/swanstudios', '_blank')}
            animateOnRender={false}
          />
        </ButtonContainer>
      </SectionContainer>
    </InstagramSection>
  );
};

export default InstagramFeed;