// src/components/ShoppingCart/ShoppingCart.tsx
import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const CartModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CartModalContent = styled(motion.div)`
  background: #fff;
  width: 90%;
  max-width: 400px;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  position: relative;
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 15px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
`;

interface ShoppingCartProps {
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ onClose }) => {
  return (
    <CartModalOverlay onClick={onClose}>
      <CartModalContent onClick={(e) => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose}>&times;</ModalCloseButton>
        <h2>Shopping Cart</h2>
        <p>Your cart is empty.</p>
      </CartModalContent>
    </CartModalOverlay>
  );
};

export default ShoppingCart;
