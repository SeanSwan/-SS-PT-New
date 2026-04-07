// File: frontend/src/components/Reports/DeliveryOptionsPanel.tsx

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { DeliveryOptions } from '../../types/reports';
import { ClientData } from '../../types/reports';

// Styled components
const Section = styled.div`
  margin-top: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
  font-weight: 600;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0.5rem;
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
`;

const OptionGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const ToggleSwitch = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  margin-right: 10px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 24px;
    
    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }
  
  input:checked + span {
    background-color: #0070f3;
  }
  
  input:focus + span {
    box-shadow: 0 0 1px #0070f3;
  }
  
  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const SwitchLabel = styled.span`
  font-weight: 500;
`;

const InputGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  
  &:focus {
    border-color: #0070f3;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
  }
`;

const DateTimeInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  
  &:focus {
    border-color: #0070f3;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
  }
`;

const RecipientList = styled.div`
  margin-top: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.5rem;
`;

const RecipientItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  
  &:hover {
    color: #bd2130;
  }
`;

const AddRecipientForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #0060df;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ScheduleOptions = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
`;

const InclusionOptions = styled.div`
  margin-top: 1rem;
`;

interface DeliveryOptionsPanelProps {
  options: DeliveryOptions;
  onChange: (options: Partial<DeliveryOptions>) => void;
  client: ClientData | null;
}

const DeliveryOptionsPanel: React.FC<DeliveryOptionsPanelProps> = ({
  options,
  onChange,
  client,
}) => {
  const [newEmailRecipient, setNewEmailRecipient] = useState<string>('');
  const [newSmsRecipient, setNewSmsRecipient] = useState<string>('');
  
  // Add client contacts to recipients when client changes
  useEffect(() => {
    if (client) {
      const defaultEmailRecipients = client.contacts
        ?.filter(contact => contact.email)
        .map(contact => contact.email) || [];
        
      const defaultSmsRecipients = client.contacts
        ?.filter(contact => contact.phone)
        .map(contact => contact.phone) || [];
      
      if (defaultEmailRecipients.length > 0 || defaultSmsRecipients.length > 0) {
        onChange({
          emailRecipients: [...new Set([...options.emailRecipients, ...defaultEmailRecipients])],
          smsRecipients: [...new Set([...options.smsRecipients, ...defaultSmsRecipients])],
        });
      }
    }
  }, [client]);
  
  // Toggle delivery methods
  const handleToggleDeliveryMethod = (method: 'email' | 'sms') => {
    onChange({ [method]: !options[method] });
  };
  
  // Add email recipient
  const handleAddEmailRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmailRecipient && isValidEmail(newEmailRecipient)) {
      onChange({
        emailRecipients: [...options.emailRecipients, newEmailRecipient]
      });
      setNewEmailRecipient('');
    }
  };
  
  // Add SMS recipient
  const handleAddSmsRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSmsRecipient && isValidPhone(newSmsRecipient)) {
      onChange({
        smsRecipients: [...options.smsRecipients, newSmsRecipient]
      });
      setNewSmsRecipient('');
    }
  };
  
  // Remove recipient
  const handleRemoveRecipient = (type: 'email' | 'sms', index: number) => {
    const key = `${type}Recipients` as 'emailRecipients' | 'smsRecipients';
    const updatedRecipients = [...options[key]];
    updatedRecipients.splice(index, 1);
    onChange({ [key]: updatedRecipients });
  };
  
  // Toggle schedule
  const handleToggleSchedule = () => {
    onChange({ scheduleDelivery: !options.scheduleDelivery });
  };
  
  // Update scheduled date
  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ deliveryDate: new Date(e.target.value) });
  };
  
  // Toggle content inclusions
  const handleToggleInclusion = (type: 'includeFullData' | 'includeCharts') => {
    onChange({ [type]: !options[type] });
  };
  
  // Validate email format
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Validate phone format
  const isValidPhone = (phone: string): boolean => {
    return /^\+?[1-9]\d{9,14}$/.test(phone.replace(/\D/g, ''));
  };
  
  return (
    <Section>
      <SectionTitle>Delivery Options</SectionTitle>
      
      <OptionsGrid>
        {/* Email delivery options */}
        <OptionGroup>
          <ToggleSwitch>
            <Switch>
              <input 
                type="checkbox" 
                checked={options.email} 
                onChange={() => handleToggleDeliveryMethod('email')} 
              />
              <span />
            </Switch>
            <SwitchLabel>Email Delivery</SwitchLabel>
          </ToggleSwitch>
          
          {options.email && (
            <>
              <InputGroup>
                <Label>Email Recipients</Label>
                <RecipientList>
                  {options.emailRecipients.length === 0 ? (
                    <div style={{ padding: '0.5rem', color: '#6c757d' }}>No recipients added</div>
                  ) : (
                    options.emailRecipients.map((email, index) => (
                      <RecipientItem key={index}>
                        <span>{email}</span>
                        <DeleteButton onClick={() => handleRemoveRecipient('email', index)}>
                          ✕
                        </DeleteButton>
                      </RecipientItem>
                    ))
                  )}
                </RecipientList>
                
                <AddRecipientForm onSubmit={handleAddEmailRecipient}>
                  <TextInput
                    type="email"
                    value={newEmailRecipient}
                    onChange={(e) => setNewEmailRecipient(e.target.value)}
                    placeholder="Enter email address"
                  />
                  <AddButton 
                    type="submit"
                    disabled={!newEmailRecipient || !isValidEmail(newEmailRecipient)}
                  >
                    Add
                  </AddButton>
                </AddRecipientForm>
              </InputGroup>
            </>
          )}
        </OptionGroup>
        
        {/* SMS delivery options */}
        <OptionGroup>
          <ToggleSwitch>
            <Switch>
              <input 
                type="checkbox" 
                checked={options.sms} 
                onChange={() => handleToggleDeliveryMethod('sms')} 
              />
              <span />
            </Switch>
            <SwitchLabel>SMS Notifications</SwitchLabel>
          </ToggleSwitch>
          
          {options.sms && (
            <>
              <InputGroup>
                <Label>SMS Recipients</Label>
                <RecipientList>
                  {options.smsRecipients.length === 0 ? (
                    <div style={{ padding: '0.5rem', color: '#6c757d' }}>No recipients added</div>
                  ) : (
                    options.smsRecipients.map((phone, index) => (
                      <RecipientItem key={index}>
                        <span>{phone}</span>
                        <DeleteButton onClick={() => handleRemoveRecipient('sms', index)}>
                          ✕
                        </DeleteButton>
                      </RecipientItem>
                    ))
                  )}
                </RecipientList>
                
                <AddRecipientForm onSubmit={handleAddSmsRecipient}>
                  <TextInput
                    type="tel"
                    value={newSmsRecipient}
                    onChange={(e) => setNewSmsRecipient(e.target.value)}
                    placeholder="Enter phone number"
                  />
                  <AddButton 
                    type="submit"
                    disabled={!newSmsRecipient || !isValidPhone(newSmsRecipient)}
                  >
                    Add
                  </AddButton>
                </AddRecipientForm>
              </InputGroup>
            </>
          )}
        </OptionGroup>
      </OptionsGrid>
      
      {/* Schedule delivery */}
      <OptionGroup>
        <ToggleSwitch>
          <Switch>
            <input 
              type="checkbox" 
              checked={options.scheduleDelivery} 
              onChange={handleToggleSchedule} 
            />
            <span />
          </Switch>
          <SwitchLabel>Schedule Delivery</SwitchLabel>
        </ToggleSwitch>
        
        {options.scheduleDelivery && (
          <ScheduleOptions>
            <InputGroup>
              <Label>Delivery Date & Time</Label>
              <DateTimeInput
                type="datetime-local"
                value={new Date(options.deliveryDate.getTime() - options.deliveryDate.getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16)}
                onChange={handleScheduleChange}
              />
            </InputGroup>
            
            <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
              The report will be sent automatically at the scheduled time.
            </div>
          </ScheduleOptions>
        )}
      </OptionGroup>
      
      {/* Content inclusion options */}
      <OptionGroup>
        <Label>Content Options</Label>
        <InclusionOptions>
          <CheckboxLabel>
            <input 
              type="checkbox" 
              checked={options.includeFullData} 
              onChange={() => handleToggleInclusion('includeFullData')} 
            />
            Include full data & metrics
          </CheckboxLabel>
          
          <CheckboxLabel>
            <input 
              type="checkbox" 
              checked={options.includeCharts} 
              onChange={() => handleToggleInclusion('includeCharts')} 
            />
            Include visualization charts
          </CheckboxLabel>
        </InclusionOptions>
      </OptionGroup>
    </Section>
  );
};

export default DeliveryOptionsPanel;