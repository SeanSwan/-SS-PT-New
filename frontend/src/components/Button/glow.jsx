import React, { useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { gsap } from "gsap";
import chroma from "chroma-js";

const ButtonCSSVars = css`
  --button-background: #09041e;
  --button-color: #fff;
  --button-shadow: rgba(33, 4, 104, 0.2);
  --button-shine-left: rgba(120, 0, 245, 0.5);
  --button-shine-right: rgba(200, 148, 255, 0.65);
  --button-glow-start: #B000E8;
  --button-glow-end: #009FFD;
  --pointer-x: 0px;
  --pointer-y: 0px;
  --button-glow: transparent;
  --button-glow-opacity: 0;
  --button-glow-duration: 0.5s;
`;

const rotate = keyframes`
  to {
    transform: scale(1.05) translateY(-44px) rotate(360deg) translateZ(0);
  }
`;

const ButtonContainer = styled.div`
  width: 140px; // adjust this value as per your requirement
  height: 40px; // adjust this value as per your requirement
`;

const GlowButton = styled.button`
  ${ButtonCSSVars}
  
  appearance: none;
  outline: none;
  border: none;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  border-radius: 11px;
  position: relative;
  line-height: 24px;
  cursor: pointer;
  color: var(--button-color);
  padding: 0;
  margin: 0;
  background: none;
  z-index: 1;
  box-shadow: 0 8px 20px var(--button-shadow);
  
  &:hover {
    --button-glow-opacity: 1;
    --button-glow-duration: .25s;
  }
`;

const Gradient = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  transform: scaleY(1.02) scaleX(1.005) rotate(-.35deg);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    transform: scale(1.05) translateY(-44px) rotate(0deg) translateZ(0);
    padding-bottom: 100%;
    border-radius: 50%;
    background: linear-gradient(90deg, var(--button-shine-left), var(--button-shine-right));
    animation: ${rotate} linear 2s infinite;
  }
`;

const Span = styled.span`
  z-index: 1;
  position: relative;
  display: block;
  padding: 10px 0;
  width: 132px;
  border-radius: inherit;
  background-color: var(--button-background);
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);

  &:before {
    content: '';
    position: absolute;
    left: -16px;
    top: -16px;
    transform: translate(var(--pointer-x, 0px), var(--pointer-y, 0px)) translateZ(0);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--button-glow, transparent);
    opacity: var(--button-glow-opacity, 0);
    transition: opacity var(--button-glow-duration, .5s);
    filter: blur(20px);
  }
`;


const GlowButtonComponent = ({ text }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;

    button.addEventListener("pointermove", (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gsap.to(button, {
        "--pointer-x": `${x}px`,
        "--pointer-y": `${y}px`,
        duration: 0.6,
      });

      gsap.to(button, {
        "--button-glow": chroma
          .mix(
            getComputedStyle(button)
              .getPropertyValue("--button-glow-start")
              .trim(),
            getComputedStyle(button)
              .getPropertyValue("--button-glow-end")
              .trim(),
            x / rect.width
          )
          .hex(),
        duration: 0.2,
      });
    });
  }, []);

  return (
    <ButtonContainer>
    <GlowButton text="Book Appointment" ref={buttonRef}>
      <Gradient />
      <Span>{text}</Span>
    </GlowButton>
    </ButtonContainer>
  );
};

export default GlowButtonComponent;