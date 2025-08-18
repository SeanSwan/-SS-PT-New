/**
 * BulkModerationPanel.tsx
 * =======================
 * 
 * Advanced bulk moderation component for handling multiple content items
 * Provides efficient mass moderation capabilities for admin users
 * 
 * Features:
 * - Multi-select content items
 * - Bulk approve, reject, hide, delete actions
 * - Progress tracking for bulk operations
 * - Undo functionality for reversible actions
 * - Performance optimized for large datasets
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  CheckSquare, Square, CheckCircle, X, EyeOff, Trash2,
  Play, Pause, RotateCcw, AlertTriangle, Clock, Zap
} from 'lucide-react';

// === STYLED COMPONENTS ===
const BulkPanel = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 16px;
  padding: 1.5rem 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  z-index: 1000;
  min-width: 500px;
  max-width: 90vw;
  
  @media (max-width: 768px) {
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    transform: none;
    min-width: auto;
    padding: 1rem;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SelectedCount = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #00ffff;
`;

const CloseButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.approve {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
    
    &:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.2);
      transform: translateY(-1px);
    }
  }
  
  &.reject {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
    
    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
      transform: translateY(-1px);
    }
  }
  
  &.hide {
    background: rgba(107, 114, 128, 0.1);
    border-color: rgba(107, 114, 128, 0.3);
    color: #6b7280;
    
    &:hover:not(:disabled) {
      background: rgba(107, 114, 128, 0.2);
      transform: translateY(-1px);
    }
  }
  
  &.delete {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.3);
    color: #dc2626;
    
    &:hover:not(:disabled) {
      background: rgba(220, 38, 38, 0.2);
      transform: translateY(-1px);
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin: 1rem 0;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #10b981, #00ffff);
  border-radius: 2px;
`;

const ProgressText = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-top: 0.5rem;
`;

const SelectionCheckbox = styled(motion.button)`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid rgba(59, 130, 246, 0.4);
  background: ${props => props.checked ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  
  &:hover {
    border-color: rgba(59, 130, 246, 0.6);
    background: rgba(59, 130, 246, 0.1);
  }
`;

// === INTERFACES ===
interface BulkModerationPanelProps {
  selectedItems: string[];
  onClearSelection: () => void;
  onBulkAction: (action: string, itemIds: string[]) => Promise<void>;
  totalItems: number;
}

interface BulkProgress {
  isRunning: boolean;
  completed: number;
  total: number;
  currentAction: string;
  errors: string[];
}

// === MAIN COMPONENT ===
const BulkModerationPanel: React.FC<BulkModerationPanelProps> = ({
  selectedItems,
  onClearSelection,
  onBulkAction,
  totalItems
}) => {
  const [progress, setProgress] = useState<BulkProgress>({
    isRunning: false,
    completed: 0,
    total: 0,
    currentAction: '',
    errors: []
  });

  const [lastAction, setLastAction] = useState<{
    action: string;
    items: string[];
    timestamp: number;
  } | null>(null);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedItems.length === 0) return;

    // Confirmation for destructive actions
    if (action === 'delete') {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedItems.length} items? This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    try {
      setProgress({
        isRunning: true,
        completed: 0,
        total: selectedItems.length,
        currentAction: action,
        errors: []
      });

      // Store action for potential undo
      setLastAction({
        action,
        items: [...selectedItems],
        timestamp: Date.now()
      });

      // Process items in batches for better performance
      const batchSize = 5;
      let completed = 0;
      const errors: string[] = [];

      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize);
        
        try {
          await onBulkAction(action, batch);
          completed += batch.length;
        } catch (error) {
          errors.push(`Failed to ${action} batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          completed += batch.length; // Continue with next batch
        }

        // Update progress
        setProgress(prev => ({
          ...prev,
          completed,
          errors
        }));

        // Small delay between batches to prevent overwhelming the server
        if (i + batchSize < selectedItems.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Complete the operation
      setProgress(prev => ({
        ...prev,
        isRunning: false
      }));

      // Auto-hide progress after 3 seconds if no errors
      if (errors.length === 0) {
        setTimeout(() => {
          setProgress(prev => ({
            ...prev,
            completed: 0,
            total: 0,
            currentAction: '',
            errors: []
          }));
          onClearSelection();
        }, 3000);
      }

    } catch (error) {
      setProgress({
        isRunning: false,
        completed: 0,
        total: 0,
        currentAction: '',
        errors: [`Bulk ${action} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    }
  }, [selectedItems, onBulkAction, onClearSelection]);

  const handleUndo = useCallback(async () => {
    if (!lastAction || Date.now() - lastAction.timestamp > 30000) { // 30 second undo window
      return;
    }

    try {
      // Determine the reverse action
      let reverseAction = '';
      switch (lastAction.action) {
        case 'approve':
          reverseAction = 'pending';
          break;
        case 'reject':
          reverseAction = 'pending';
          break;
        case 'hide':
          reverseAction = 'approve';
          break;
        // Delete cannot be undone
        default:
          return;
      }

      await onBulkAction(reverseAction, lastAction.items);
      setLastAction(null);
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }, [lastAction, onBulkAction]);

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const canUndo = lastAction && 
                  Date.now() - lastAction.timestamp < 30000 && 
                  lastAction.action !== 'delete';

  if (selectedItems.length === 0 && !progress.isRunning && progress.errors.length === 0) {
    return null;
  }

  return (
    <BulkPanel
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <PanelHeader>
        <SelectedCount>
          <CheckSquare size={20} />
          {selectedItems.length} of {totalItems} selected
        </SelectedCount>
        
        {canUndo && (
          <ActionButton
            className="undo"
            onClick={handleUndo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              color: '#3b82f6'
            }}
          >
            <RotateCcw size={16} />
            Undo
          </ActionButton>
        )}
        
        <CloseButton
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClearSelection}
        >
          <X size={16} />
        </CloseButton>
      </PanelHeader>

      {progress.isRunning && (
        <>
          <ProgressBar>
            <ProgressFill
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </ProgressBar>
          <ProgressText>
            {progress.currentAction}ing {progress.completed} of {progress.total} items...
          </ProgressText>
        </>
      )}

      {progress.errors.length > 0 && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          margin: '1rem 0',
          color: '#ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={16} />
            <strong>Some actions failed:</strong>
          </div>
          {progress.errors.map((error, index) => (
            <div key={index} style={{ fontSize: '0.875rem', marginLeft: '1.5rem' }}>
              • {error}
            </div>
          ))}
        </div>
      )}

      <ActionButtons>
        <ActionButton
          className="approve"
          onClick={() => handleBulkAction('approve')}
          disabled={progress.isRunning || selectedItems.length === 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <CheckCircle size={16} />
          Approve All
        </ActionButton>
        
        <ActionButton
          className="reject"
          onClick={() => handleBulkAction('reject')}
          disabled={progress.isRunning || selectedItems.length === 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={16} />
          Reject All
        </ActionButton>
        
        <ActionButton
          className="hide"
          onClick={() => handleBulkAction('hide')}
          disabled={progress.isRunning || selectedItems.length === 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <EyeOff size={16} />
          Hide All
        </ActionButton>
        
        <ActionButton
          className="delete"
          onClick={() => handleBulkAction('delete')}
          disabled={progress.isRunning || selectedItems.length === 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 size={16} />
          Delete All
        </ActionButton>
      </ActionButtons>
    </BulkPanel>
  );
};

// === SELECTION CHECKBOX COMPONENT ===
export const ContentSelectionCheckbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  contentId: string;
}> = ({ checked, onChange, contentId }) => {
  return (
    <SelectionCheckbox
      checked={checked}
      onClick={() => onChange(!checked)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      data-content-id={contentId}
    >
      {checked ? <CheckSquare size={16} /> : <Square size={16} />}
    </SelectionCheckbox>
  );
};

export default BulkModerationPanel;
