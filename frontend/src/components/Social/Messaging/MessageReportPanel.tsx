/**
 * FILE: MessageReportPanel.tsx
 * PURPOSE: Safety report form for a selected message.
 */
import React, { useState } from 'react';
import type { MessageData } from './MessagingTypes';
import { ReportActions, ReportButton, ReportField, ReportPanel, ReportSelect, ReportTextArea, ReportTitle } from './MessageReportPanel.styles';

const REPORT_REASONS = ['safety', 'harassment', 'spam', 'abuse', 'inappropriate', 'privacy', 'other'];

interface MessageReportPanelProps {
  message: MessageData;
  onCancel: () => void;
  onSubmit: (reason: string, details: string) => void | Promise<unknown>;
}

export const MessageReportPanel: React.FC<MessageReportPanelProps> = ({ message, onCancel, onSubmit }) => {
  const [reason, setReason] = useState('safety');
  const [details, setDetails] = useState('');

  const submitReport = (event: React.FormEvent) => {
    event.preventDefault();
    void onSubmit(reason, details);
  };

  return (
    <ReportPanel onSubmit={submitReport} aria-label={`Report message: ${message.content}`}>
      <ReportTitle>Report message</ReportTitle>
      <ReportField>
        Report reason
        <ReportSelect value={reason} onChange={event => setReason(event.target.value)}>
          {REPORT_REASONS.map(item => <option key={item} value={item}>{item}</option>)}
        </ReportSelect>
      </ReportField>
      <ReportField>
        Optional report details
        <ReportTextArea value={details} onChange={event => setDetails(event.target.value)} />
      </ReportField>
      <ReportActions>
        <ReportButton type="button" onClick={onCancel}>Cancel</ReportButton>
        <ReportButton type="submit" $danger aria-label="Submit message report">Submit</ReportButton>
      </ReportActions>
    </ReportPanel>
  );
};
