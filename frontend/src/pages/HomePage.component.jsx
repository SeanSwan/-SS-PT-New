// import React from 'react';
import GlobalStyle from '../styles/GlobalStyle';
import Header from '../components/Header/header';
import HeroSection from '../components/HeroSection/HeroSection';
import ParallaxSection from '../components/ParallaxSection/ParallaxSection';
import FeaturesSection from '../components/FeaturesSection/FeaturesSection';
import TestimonialSection from "../components/TestimonialSection/TestimonialSection";

/*
  HomePage Component
  ------------------
  This is the main landing page which incorporates:
    - Global styles (for consistent styling across the app)
    - Header (navigation bar)
    - HeroSection (video background with headline and CTA)
    - ParallaxSection (scroll-effect section)
    - FeaturesSection (grid of service cards)
    - Footer (copyright)
*/
const HomePage = () => {
  return (
    <>
      <GlobalStyle />
      <Header />
      <HeroSection />
      <ParallaxSection />
      
      <FeaturesSection />

      
      
    </>
  );
};

export default HomePage;





