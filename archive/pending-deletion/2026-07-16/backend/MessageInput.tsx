import React, { useState } from 'react';
import styled from 'styled-components';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, disabled }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSendMessage(content.trim());
      setContent('');
    }
  };

  return (
    <InputContainer onSubmit={handleSubmit}>
      <TextInput
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (onTyping) onTyping();
        }}
        placeholder="Type a message..."
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <SendButton type="submit" disabled={disabled || !content.trim()}>
        <Send size={20} />
      </SendButton>
    </InputContainer>
  );
};

const InputContainer = styled.form`
  display: flex;
  padding: 16px;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  background: var(--dark-bg, #0a0e1a);
`;

const TextInput = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border-radius: 24px;
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  background: var(--glass-bg, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #FFFFFF);
  font-size: 16px;
  resize: none;
  max-height: 120px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-left: 12px;
  border-radius: 50%;
  border: none;
  background: var(--primary-cyan, #00CED1);
  color: var(--dark-bg, #0a0e1a);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default MessageInput;