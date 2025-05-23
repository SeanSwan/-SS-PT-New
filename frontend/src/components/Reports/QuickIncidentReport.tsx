// File: frontend/src/components/Reports/QuickIncidentReport.tsx

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
// Import the Select components individually
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import DragDropImageUpload from './DragDropImageUpload';
import * as reportService from '../../services/reportService';
import { Camera, Video, Send, Clock, AlertTriangle, Map, Check, Copy } from 'lucide-react';

// Type definitions
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface MediaFile {
  id: string;
  type: 'image' | 'video';
  url: string;
  file: File;
  name: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface ReportData {
  clientId: string;
  propertyId: string;
  incidentType: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  location: string;
  coordinates: Coordinates | null;
  mediaUrls: string[];
  mediaAccessLink: string;
  mediaExpiryHours: number;
  emailRecipients: string[];
  smsRecipients: string[];
  timestamp: string;
}

interface LinkDetails {
  linkUrl: string;
  expiryDate: string;
}

interface IncidentType {
  value: string;
  label: string;
}

interface SeverityOption {
  value: SeverityLevel;
  label: string;
}

// Styled components for enhanced visual experience
const IncidentContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #eaeaea;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
`;

const IncidentHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 2px solid #f5f5f5;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  color: #111827;
  font-weight: 600;
  margin: 0;
`;

interface SeverityBadgeProps {
  severity: SeverityLevel;
}

const SeverityBadge = styled.span<SeverityBadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 8px;
  
  background-color: ${props => {
    switch (props.severity) {
      case 'critical': return '#fef2f2';
      case 'high': return '#fff7ed';
      case 'medium': return '#fffbeb';
      case 'low': return '#f0fdf4';
      default: return '#f3f4f6';
    }
  }};
  
  color: ${props => {
    switch (props.severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.severity) {
      case 'critical': return '#fee2e2';
      case 'high': return '#ffedd5';
      case 'medium': return '#fef3c7';
      case 'low': return '#dcfce7';
      default: return '#f3f4f6';
    }
  }};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const FormSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 16px;
`;

const FormSectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
`;

const MediaPreview = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f3f4f6;
`;

const MediaImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MediaVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MediaOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.75rem;
  display: flex;
  justify-content: space-between;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ef4444;
  font-weight: bold;
  
  &:hover {
    background: white;
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const ExpirationNote = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #6b7280;
`;

const RecipientChip = styled.div`
  display: inline-flex;
  align-items: center;
  background: #f3f4f6;
  border-radius: 16px;
  padding: 5px 10px;
  margin: 0 8px 8px 0;
  font-size: 0.875rem;
  color: #374151;
`;

const RemoveChipButton = styled.button`
  border: none;
  background: none;
  color: #6b7280;
  margin-left: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #ef4444;
  }
`;

const LocationPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  height: 200px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #6b7280;
`;

const InputContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 8px;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const InputWithButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;

const ChipsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const LocationSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 16px;
`;

const LocationSwitchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MediaSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 16px;
`;

const MediaButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const ExpiryContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 8px;
`;

const ExpiryInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface QuickIncidentReportProps {
  clientId?: string;
  propertyId?: string;
  onReportSent?: () => void;
}

// Incident types and severity levels for dropdown selections
const INCIDENT_TYPES: IncidentType[] = [
  { value: 'trespass', label: 'Trespassing' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'suspicious', label: 'Suspicious Activity' },
  { value: 'theft', label: 'Theft' },
  { value: 'alarm', label: 'Alarm Activation' },
  { value: 'fire', label: 'Fire Emergency' },
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'violence', label: 'Violence' },
  { value: 'property', label: 'Property Damage' },
  { value: 'other', label: 'Other' }
];

const SEVERITY_LEVELS: SeverityOption[] = [
  { value: 'low', label: 'Low - Informational' },
  { value: 'medium', label: 'Medium - Needs Attention' },
  { value: 'high', label: 'High - Requires Action' },
  { value: 'critical', label: 'Critical - Emergency Response' }
];

// Main component
const QuickIncidentReport: React.FC<QuickIncidentReportProps> = ({ 
  clientId,
  propertyId,
  onReportSent
}) => {
  const { toast } = useToast();
  
  // State for form fields
  const [incidentType, setIncidentType] = useState<string>('');
  const [incidentTitle, setIncidentTitle] = useState<string>('');
  const [incidentDescription, setIncidentDescription] = useState<string>('');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [location, setLocation] = useState<string>('');
  const [useCurrentLocation, setUseCurrentLocation] = useState<boolean>(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [smsRecipients, setSmsRecipients] = useState<string[]>([]);
  const [newEmailRecipient, setNewEmailRecipient] = useState<string>('');
  const [newSmsRecipient, setNewSmsRecipient] = useState<string>('');
  const [expiryHours, setExpiryHours] = useState<number>(72); // Default 3 days
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Check for geolocation permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(result => {
        if (result.state === 'granted') {
          setHasLocationPermission(true);
        }
      });
    }
  }, []);
  
  // Get current location if permission granted and option selected
  useEffect(() => {
    if (useCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          
          // Attempt to get address from coordinates with reverse geocoding
          // In a real implementation, you would use a geocoding service here
          setLocation(`Coordinates: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        },
        error => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to get your current location. Please enter location manually.',
            variant: 'destructive'
          });
          setUseCurrentLocation(false);
        }
      );
    }
  }, [useCurrentLocation, toast]);
  
  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files).map(file => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'image' as const,
        url: URL.createObjectURL(file),
        file,
        name: file.name
      }));
      
      setMediaFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  // Handle video upload
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files).map(file => ({
        id: `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'video' as const,
        url: URL.createObjectURL(file),
        file,
        name: file.name
      }));
      
      setMediaFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  // Delete media file
  const handleDeleteMedia = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id));
  };
  
  // Add email recipient
  const handleAddEmailRecipient = () => {
    if (newEmailRecipient && !emailRecipients.includes(newEmailRecipient)) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmailRecipient)) {
        toast({
          title: 'Invalid Email',
          description: 'Please enter a valid email address',
          variant: 'destructive'
        });
        return;
      }
      
      setEmailRecipients(prev => [...prev, newEmailRecipient]);
      setNewEmailRecipient('');
    }
  };
  
  // Add SMS recipient
  const handleAddSmsRecipient = () => {
    if (newSmsRecipient && !smsRecipients.includes(newSmsRecipient)) {
      // Basic phone number validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(newSmsRecipient.replace(/\D/g, ''))) {
        toast({
          title: 'Invalid Phone Number',
          description: 'Please enter a valid phone number',
          variant: 'destructive'
        });
        return;
      }
      
      setSmsRecipients(prev => [...prev, newSmsRecipient]);
      setNewSmsRecipient('');
    }
  };
  
  // Remove email recipient
  const handleRemoveEmailRecipient = (email: string) => {
    setEmailRecipients(prev => prev.filter(e => e !== email));
  };
  
  // Remove SMS recipient
  const handleRemoveSmsRecipient = (phone: string) => {
    setSmsRecipients(prev => prev.filter(p => p !== phone));
  };
  
  // Generate a unique link for the media files
  const generateLinkWithExpiry = (): LinkDetails => {
    // In a real implementation, this would call your backend API
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);
    
    return {
      linkUrl: `https://security-reports.example.com/media/${clientId}/incident-${Date.now()}`,
      expiryDate: expiryDate.toISOString()
    };
  };
  
  // Send incident report
  const handleSendReport = async (): Promise<void> => {
    // Validation
    if (!incidentTitle) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an incident title',
        variant: 'destructive'
      });
      return;
    }
    
    if (!incidentDescription) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an incident description',
        variant: 'destructive'
      });
      return;
    }
    
    if (emailRecipients.length === 0 && smsRecipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please add at least one email or SMS recipient',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload media files
      let mediaUrls: string[] = [];
      let mediaAccessLink = '';
      
      if (mediaFiles.length > 0) {
        // In a real implementation, you would upload each file to your server or a CDN
        // and get back URLs that can be included in the report
        
        // For now, we'll simulate this process
        const uploadedMediaPromises = mediaFiles.map(async (media) => {
          // Simulating upload delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would be the URL returned from your server
          return `https://security-cdn.example.com/media/${media.id}`;
        });
        
        mediaUrls = await Promise.all(uploadedMediaPromises);
        
        // Generate secure access link with expiry
        const linkDetails = generateLinkWithExpiry();
        mediaAccessLink = linkDetails.linkUrl;
      }
      
      // Prepare report data
      const reportData: ReportData = {
        clientId: clientId || 'default-client',
        propertyId: propertyId || 'default-property',
        incidentType,
        title: incidentTitle,
        description: incidentDescription,
        severity,
        location,
        coordinates,
        mediaUrls,
        mediaAccessLink,
        mediaExpiryHours: expiryHours,
        emailRecipients,
        smsRecipients,
        timestamp: new Date().toISOString()
      };
      
      // In a real implementation, you would send this to your API
      // const response = await reportService.sendIncidentReport(reportData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success toast
      toast({
        title: 'Report Sent Successfully',
        description: `Quick incident report "${incidentTitle}" has been sent to ${emailRecipients.length + smsRecipients.length} recipients.`,
        variant: 'default'
      });
      
      // Reset form
      setIncidentType('');
      setIncidentTitle('');
      setIncidentDescription('');
      setSeverity('medium');
      setLocation('');
      setUseCurrentLocation(false);
      setMediaFiles([]);
      setExpiryHours(72);
      
      // Call the onReportSent callback if provided
      if (onReportSent) {
        onReportSent();
      }
    } catch (error) {
      console.error('Failed to send incident report:', error);
      toast({
        title: 'Error',
        description: 'Failed to send incident report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create report draft to edit later
  const handleSaveDraft = (): void => {
    // In a real implementation, you would save the draft to localStorage or your backend
    localStorage.setItem('incidentReportDraft', JSON.stringify({
      incidentType,
      incidentTitle,
      incidentDescription,
      severity,
      location,
      coordinates,
      emailRecipients,
      smsRecipients,
      expiryHours,
      timestamp: new Date().toISOString()
    }));
    
    toast({
      title: 'Draft Saved',
      description: 'Incident report draft has been saved.',
      variant: 'default'
    });
  };
  
  return (
    <IncidentContainer>
      <IncidentHeader>
        <Title>
          <AlertTriangle size={24} />
          Quick Incident Report
          {severity && <SeverityBadge severity={severity}>{severity}</SeverityBadge>}
        </Title>
        <div>
          {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </IncidentHeader>
      
      {/* Incident Details */}
      <FormSection>
        <FormSectionTitle>Incident Details</FormSectionTitle>
        <FormGrid>
          <InputContainer>
            <Label htmlFor="incident-type">Incident Type</Label>
            {/* Fixed Select component usage */}
            <Select value={incidentType} onValueChange={setIncidentType}>
              <SelectTrigger id="incident-type" className="w-full">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {INCIDENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </InputContainer>
          
          <InputContainer>
            <Label htmlFor="severity">Severity</Label>
            {/* Fixed Select component usage */}
            <Select 
              value={severity}
              onValueChange={(value: string) => setSeverity(value as SeverityLevel)}
            >
              <SelectTrigger id="severity" className="w-full">
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SEVERITY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </InputContainer>
        </FormGrid>
        
        <InputContainer>
          <Label htmlFor="incident-title">Incident Title</Label>
          <Input
            id="incident-title"
            value={incidentTitle}
            onChange={(e) => setIncidentTitle(e.target.value)}
            placeholder="Brief title describing the incident"
          />
        </InputContainer>
        
        <InputContainer>
          <Label htmlFor="incident-description">Description</Label>
          <Textarea
            id="incident-description"
            value={incidentDescription}
            onChange={(e) => setIncidentDescription(e.target.value)}
            placeholder="Detailed description of what occurred, when it happened, and any relevant details"
            rows={4}
          />
        </InputContainer>
      </FormSection>
      
      {/* Location */}
      <LocationSection>
        <FormSectionTitle>
          <Map size={18} />
          Location
        </FormSectionTitle>
        
        <LocationSwitchContainer>
          <Switch
            id="use-current-location"
            checked={useCurrentLocation}
            onCheckedChange={setUseCurrentLocation}
            disabled={!hasLocationPermission}
          />
          <Label htmlFor="use-current-location">
            Use current location
            {!hasLocationPermission && (
              <span style={{ marginLeft: '8px', fontSize: '0.875rem', color: '#ef4444' }}>
                (Location permission denied)
              </span>
            )}
          </Label>
        </LocationSwitchContainer>
        
        <InputContainer>
          <Label htmlFor="location">Location Details</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Building, area, or address where incident occurred"
            disabled={useCurrentLocation}
          />
        </InputContainer>
        
        {coordinates && (
          <LocationPreview>
            <div>Map Preview</div>
            <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
              Latitude: {coordinates.lat.toFixed(6)}, Longitude: {coordinates.lng.toFixed(6)}
            </div>
          </LocationPreview>
        )}
      </LocationSection>
      
      {/* Media Upload */}
      <MediaSection>
        <FormSectionTitle>
          <Camera size={18} />
          Attach Media Evidence
        </FormSectionTitle>
        
        <MediaButtonsContainer>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            Add Photos
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video className="mr-2 h-4 w-4" />
            Add Video
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          
          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoUpload}
            accept="video/*"
            multiple
            style={{ display: 'none' }}
          />
        </MediaButtonsContainer>
        
        {mediaFiles.length > 0 && (
          <>
            <MediaGrid>
              {mediaFiles.map(media => (
                <MediaPreview key={media.id}>
                  {media.type === 'image' ? (
                    <MediaImage src={media.url} alt="Incident media" />
                  ) : (
                    <MediaVideo src={media.url} controls />
                  )}
                  <MediaOverlay>
                    <span>{media.type === 'image' ? 'Photo' : 'Video'}</span>
                  </MediaOverlay>
                  <DeleteButton onClick={() => handleDeleteMedia(media.id)}>×</DeleteButton>
                </MediaPreview>
              ))}
            </MediaGrid>
            
            <ExpiryContainer>
              <Label htmlFor="expiry-hours">Media Access Expires After</Label>
              <ExpiryInputRow>
                <Input
                  id="expiry-hours"
                  type="number"
                  min={1}
                  max={720} // 30 days
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(parseInt(e.target.value) || 72)}
                  style={{ width: '100px' }}
                />
                <span>hours</span>
              </ExpiryInputRow>
              <ExpirationNote>
                <Clock size={14} />
                Media links will expire after {expiryHours} hours to enhance security
              </ExpirationNote>
            </ExpiryContainer>
          </>
        )}
      </MediaSection>
      
      {/* Recipients */}
      <FormSection>
        <FormSectionTitle>
          <Send size={18} />
          Recipients
        </FormSectionTitle>
        
        <FormGrid>
          <InputContainer>
            <Label htmlFor="email-recipients">Email Recipients</Label>
            <InputWithButtonRow>
              <Input
                id="email-recipients"
                value={newEmailRecipient}
                onChange={(e) => setNewEmailRecipient(e.target.value)}
                placeholder="Enter email address"
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              />
              <Button
                type="button"
                onClick={handleAddEmailRecipient}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              >
                Add
              </Button>
            </InputWithButtonRow>
            <ChipsContainer>
              {emailRecipients.map(email => (
                <RecipientChip key={email}>
                  {email}
                  <RemoveChipButton onClick={() => handleRemoveEmailRecipient(email)}>×</RemoveChipButton>
                </RecipientChip>
              ))}
            </ChipsContainer>
          </InputContainer>
          
          <InputContainer>
            <Label htmlFor="sms-recipients">SMS Recipients</Label>
            <InputWithButtonRow>
              <Input
                id="sms-recipients"
                value={newSmsRecipient}
                onChange={(e) => setNewSmsRecipient(e.target.value)}
                placeholder="Enter phone number"
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              />
              <Button
                type="button"
                onClick={handleAddSmsRecipient}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              >
                Add
              </Button>
            </InputWithButtonRow>
            <ChipsContainer>
              {smsRecipients.map(phone => (
                <RecipientChip key={phone}>
                  {phone}
                  <RemoveChipButton onClick={() => handleRemoveSmsRecipient(phone)}>×</RemoveChipButton>
                </RecipientChip>
              ))}
            </ChipsContainer>
          </InputContainer>
        </FormGrid>
      </FormSection>
      
      {/* Action Buttons */}
      <ButtonsContainer>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isLoading}
        >
          <Copy className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        
        <Button
          type="button"
          onClick={handleSendReport}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          {isLoading ? (
            <>Processing...</>
          ) : (
            <>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Send Incident Report
            </>
          )}
        </Button>
      </ButtonsContainer>
    </IncidentContainer>
  );
};

export default QuickIncidentReport;