import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { useNavigate } from "react-router-dom";
import GlowButton from "../Button/glowButton"; // Adjust import path as needed

/* ----------------- Animations ----------------- */

/** Subtle fade-in for each word */
const wordFadeIn = keyframes`
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/** Smooth pastel gradient animation */
const pastelGradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

/* ----------------- Styled Components ----------------- */

const MarqueeContainer = styled.div`
  position: relative;
  width: 100%;
  padding: 2rem 1rem;
  text-align: center;
  color: #d3e9f0;
  overflow: hidden;
  word-break: break-word;

  /* Pastel gradient background with subtle animation */
  background: linear-gradient(
    to right,
    #5e058e,
    #561c97,
    #4c2aa0,
    #4035a8,
    #313eaf,
    #234fbb,
    #1160c5,
    #006fce,
    #0089d8,
    #009fd3,
    #00b2c6,
    #08c2b6
  );
  background-size: 1500% 1500%;
  animation: ${pastelGradientAnimation} 180s ease infinite;

  /* Responsive text sizing */
  font-size: clamp(1rem, 4vw, 2rem);

  /* Extra spacing on larger screens */
  @media (min-width: 1200px) {
    padding: 3rem 2rem;
  }
`;

const AnimatedWord = styled.span`
  display: inline-block;
  opacity: 0;
  animation: ${wordFadeIn} 0.5s forwards;
  animation-delay: ${({ index }) => index * 0.15}s;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem; /* space above the button */
`;

const quotes = [
  "Don't let another year slip by without taking control of your health. The time to act is now!",
  "Your health is in your hands. Will you let another opportunity pass, or will you seize the moment?",
  "Are you ready to make a change? Take the first step towards a healthier, happier life today.",
  "You deserve to live your best life. Let us help you achieve your health and wellness goals.",
  "Together, we can create a healthier, happier future for you and your loved ones.",
  "Don't wait for a wake-up call. Prioritize your health today and secure a brighter tomorrow.",
  "Invest in your health now, and reap the rewards for the rest of your life.",
  "The journey to better health begins with a single step. Are you ready to take it?",
  "Every day is a new opportunity to prioritize your health and well-being. Make the most of it!",
  "We genuinely care about your health and happiness. Let's work together to create lasting, positive change.",
  "Life is too short to put your health on hold. Let's make a difference together.",
  "It's never too late to take control of your health. Begin your transformation today.",
  "What's holding you back? Overcome your obstacles and embrace a healthier, more vibrant life.",
  "You have the power to change your life. Let us support you on your journey to better health.",
  "Your health is your greatest wealth. Invest in yourself and experience the benefits.",
  "Don't wait until it's too late. Make your health a priority today, and enjoy a brighter tomorrow.",
  "We're in this together. Let's work hand in hand to improve your health and well-being.",
  "Small changes can lead to big results. Start your journey towards better health today.",
  "A healthy lifestyle is the best gift you can give yourself and your loved ones.",
  "Your well-being matters to us. Let us help you achieve the healthy, fulfilling life you deserve.",
  "Your spouse wants the best for you, but only you can decide to prioritize your health. Take action today and build a healthier future together."
];

const MotivationalMarquee = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const navigate = useNavigate();
  const pauseBetweenQuotes = 6000; // 6 seconds for smoother transitions

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
    }, pauseBetweenQuotes);

    return () => clearTimeout(timeoutId);
  }, [quoteIndex]);

  return (
    <MarqueeContainer>
      {quotes[quoteIndex].split(" ").map((word, i) => (
        <AnimatedWord key={`${quoteIndex}-${i}`} index={i}>
          {word + " "}
        </AnimatedWord>
      ))}
      <ButtonWrapper>
        <GlowButton text="Take Action Now" onClick={() => navigate("/calendar")} />
      </ButtonWrapper>
    </MarqueeContainer>
  );
};

export default MotivationalMarquee;
