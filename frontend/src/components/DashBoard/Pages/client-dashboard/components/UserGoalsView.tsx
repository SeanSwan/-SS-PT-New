import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';

const GoalsContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const GoalCard = styled(motion.div)<{ completed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 1.25rem;
  border-radius: 12px;
  border-left: 4px solid ${props => (props.completed ? '#10b981' : '#3b82f6')};
`;

const GoalText = styled.p<{ completed?: boolean }>`
  margin: 0;
  flex: 1;
  color: ${props => (props.completed ? 'rgba(255, 255, 255, 0.5)' : 'white')};
  text-decoration: ${props => (props.completed ? 'line-through' : 'none')};
`;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const UserGoalsView: React.FC<{ goals: any[] }> = ({ goals }) => {
  if (!goals || goals.length === 0) {
    return <p>No public goals set yet.</p>;
  }

  return (
    <GoalsContainer
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      initial="hidden"
      animate="visible"
    >
      {goals.map((goal, index) => (
        <GoalCard key={index} variants={itemVariants} completed={goal.completed}>
          {goal.completed ? <CheckCircle size={24} color="#10b981" /> : <Circle size={24} color="#3b82f6" />}
          <GoalText completed={goal.completed}>{goal.text}</GoalText>
        </GoalCard>
      ))}
    </GoalsContainer>
  );
};

export default UserGoalsView;