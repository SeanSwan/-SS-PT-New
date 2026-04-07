  // File: frontend/src/components/Reports/DualLogoHeaderCustomizer.tsx

  import React, { useState, useRef, useEffect } from 'react';
  import styled from 'styled-components';
  import { useToast } from '../../hooks/use-toast';
  import { Button } from '../ui/button';
  import { Input } from '../ui/input';
  import { Slider } from '../ui/slider';
  import { Label } from '../ui/label';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
  import { ColorPickerTrigger } from './ColorPicker';
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
  import { Badge } from '../ui/badge';
  import { Image, Upload, Download, X, RefreshCw, Paintbrush, Info, FileImage, Type, Layout, Palette, Clock } from 'lucide-react';

  // Styled components for the header customizer
  const CustomizerContainer = styled.div`
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 24px;
    margin-bottom: 24px;
  `;

  const CustomizerHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eaeaea;
  `;

  const Title = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #171717;
  `;

  const SubTitle = styled.h4`
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333;
  `;

  const LogoSection = styled.div`
    margin-bottom: 24px;
  `;

  const LogoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  `;

  const LogoUploader = styled.div`
    border: 2px dashed #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    background-color: #fafafa;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #0070f3;
      background-color: rgba(0, 112, 243, 0.05);
    }
  `;

  const LogoPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const LogoPreview = styled.div`
    width: 100%;
    max-width: 200px;
    height: 80px;
    margin: 10px auto;
    background-color: #f5f5f5;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  `;

  const LogoImage = styled.img`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  `;

  const RemoveButton = styled.button`
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(255, 255, 255, 0.9);
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    transition: all 0.2s ease;
    
    &:hover {
      color: #d32f2f;
      background-color: white;
    }
  `;

  const PreviewContainer = styled.div`
    margin-top: 24px;
    padding: 20px;
    background-color: white;
    border: 1px solid #eaeaea;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  `;

  interface HeaderPreviewProps {
    backgroundImage?: string;
    backgroundOpacity: number;
    backgroundColor: string;
    textColor: string;
  }

  const HeaderPreview = styled.div<HeaderPreviewProps>`
    width: 100%;
    height: 120px;
    background-color: ${props => props.backgroundColor};
    color: ${props => props.textColor};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    
    ${props => props.backgroundImage && `
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url(${props.backgroundImage});
        background-size: cover;
        background-position: center;
        opacity: ${props.backgroundOpacity};
        z-index: 0;
      }
    `}
  `;

  const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    z-index: 1;
    text-align: center;
  `;

  const HeaderTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 5px 0;
    line-height: 1.2;
  `;

  const HeaderSubtitle = styled.div`
    font-size: 0.9rem;
    opacity: 0.8;
  `;

  const LogoContainer = styled.div`
    width: 100px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    padding: 5px;
    z-index: 1;
  `;

  const SettingsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  `;

  const SettingCard = styled.div`
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 16px;
  `;

  const SettingTitle = styled.div`
    font-weight: 500;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #333;
  `;

  interface ColorPreviewProps {
    color: string;
  }

  const ColorPreview = styled.div<ColorPreviewProps>`
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background-color: ${props => props.color};
    border: 1px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.1);
    }
  `;

  const FontPreview = styled.div`
    padding: 6px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #0070f3;
      background-color: rgba(0, 112, 243, 0.05);
    }
  `;

  interface FontSampleProps {
    fontFamily: string;
  }

  const FontSample = styled.div<FontSampleProps>`
    font-family: ${props => props.fontFamily};
    text-align: center;
  `;

  const InputGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  `;

  interface ColorButtonProps {
    color: string;
    active: boolean;
  }

  const ColorButton = styled.button<ColorButtonProps>`
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background-color: ${props => props.color};
    border: 2px solid ${props => props.active ? '#0070f3' : 'transparent'};
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    
    &:hover {
      transform: scale(1.1);
    }
    
    ${props => props.active && `
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: white;
      }
    `}
  `;

  const FontSelector = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 8px;
  `;

  const BackgroundImagePreview = styled.div`
    width: 100%;
    height: 80px;
    background-size: cover;
    background-position: center;
    border-radius: 4px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
    overflow: hidden;
  `;

  const SliderContainer = styled.div`
    margin-top: 16px;
  `;

  const ButtonsContainer = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;
  `;

  const ColorInfo = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  `;

  const TemplateContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    margin-top: 16px;
  `;

  interface TemplateItemProps {
    active: boolean;
  }

  const TemplateItem = styled.div<TemplateItemProps>`
    border: 2px solid ${props => props.active ? '#0070f3' : '#e0e0e0'};
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: ${props => props.active ? '#0070f3' : '#a0a0a0'};
      transform: translateY(-2px);
    }
  `;

  interface TemplateThumbnailProps {
    bgColor: string;
    textColor: string;
  }

  const TemplateThumbnail = styled.div<TemplateThumbnailProps>`
    height: 60px;
    background-color: ${props => props.bgColor};
    color: ${props => props.textColor};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.8rem;
  `;

  const TemplateName = styled.div`
    padding: 6px;
    text-align: center;
    font-size: 0.8rem;
    background-color: #f9f9f9;
  `;

  // Header theme interface
  interface HeaderTheme {
    id: string;
    name: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
  }

  // Header theme presets for quick selection
  const HEADER_THEMES: HeaderTheme[] = [
    { 
      id: 'professional', 
      name: 'Professional', 
      backgroundColor: '#ffffff', 
      textColor: '#333333',
      accentColor: '#0070f3', 
      fontFamily: 'Arial, sans-serif'
    },
    { 
      id: 'corporate', 
      name: 'Corporate', 
      backgroundColor: '#f5f5f5', 
      textColor: '#222222',
      accentColor: '#2e7d32', 
      fontFamily: 'Arial, sans-serif'
    },
    { 
      id: 'modern', 
      name: 'Modern', 
      backgroundColor: '#1a1a1a', 
      textColor: '#ffffff',
      accentColor: '#f5a623', 
      fontFamily: 'Helvetica, sans-serif'
    },
    { 
      id: 'security', 
      name: 'Security', 
      backgroundColor: '#003366', 
      textColor: '#ffffff',
      accentColor: '#ff9900', 
      fontFamily: 'Arial, sans-serif'
    },
    { 
      id: 'elegant', 
      name: 'Elegant', 
      backgroundColor: '#f8f9fa', 
      textColor: '#343a40',
      accentColor: '#495057', 
      fontFamily: 'Georgia, serif'
    },
    { 
      id: 'tech', 
      name: 'Tech', 
      backgroundColor: '#2c3e50', 
      textColor: '#ecf0f1',
      accentColor: '#3498db', 
      fontFamily: 'Tahoma, sans-serif'
    }
  ];

  // Font option interface
  interface FontOption {
    value: string;
    label: string;
  }

  // Font options
  const FONT_OPTIONS: FontOption[] = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Times New Roman, serif', label: 'Times' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma' },
    { value: 'Verdana, sans-serif', label: 'Verdana' }
  ];

  interface DateRange {
    start: Date;
    end: Date;
  }

  interface DualLogoHeaderCustomizerProps {
    leftLogo?: string;
    rightLogo?: string;
    backgroundImage?: string;
    reportTitle: string;
    clientName: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
    backgroundOpacity: number;
    dateRange: DateRange;
    onUpdate: (values: {
      leftLogo?: string;
      rightLogo?: string;
      backgroundImage?: string;
      backgroundColor: string;
      textColor: string;
      accentColor: string;
      fontFamily: string;
      backgroundOpacity: number;
      reportTitle: string;
    }) => void;
  }

  /**
   * DualLogoHeaderCustomizer Component
   * Allows customization of report header with dual logos, custom colors, fonts, and background images
   */
  const DualLogoHeaderCustomizer: React.FC<DualLogoHeaderCustomizerProps> = ({
    leftLogo,
    rightLogo,
    backgroundImage,
    reportTitle,
    clientName,
    backgroundColor,
    textColor,
    accentColor,
    fontFamily,
    backgroundOpacity,
    dateRange,
    onUpdate
  }) => {
    // Refs for file inputs
    const leftLogoInputRef = useRef<HTMLInputElement>(null);
    const rightLogoInputRef = useRef<HTMLInputElement>(null);
    const backgroundImageInputRef = useRef<HTMLInputElement>(null);
    
    // State for local customizations
    const [localLeftLogo, setLocalLeftLogo] = useState<string | undefined>(leftLogo);
    const [localRightLogo, setLocalRightLogo] = useState<string | undefined>(rightLogo);
    const [localBackgroundImage, setLocalBackgroundImage] = useState<string | undefined>(backgroundImage);
    const [localBackgroundColor, setLocalBackgroundColor] = useState(backgroundColor);
    const [localTextColor, setLocalTextColor] = useState(textColor);
    const [localAccentColor, setLocalAccentColor] = useState(accentColor);
    const [localFontFamily, setLocalFontFamily] = useState(fontFamily);
    const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(backgroundOpacity);
    const [localReportTitle, setLocalReportTitle] = useState(reportTitle);
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    
    const { toast } = useToast();
    
    // Update local state when props change
    useEffect(() => {
      setLocalLeftLogo(leftLogo);
      setLocalRightLogo(rightLogo);
      setLocalBackgroundImage(backgroundImage);
      setLocalBackgroundColor(backgroundColor);
      setLocalTextColor(textColor);
      setLocalAccentColor(accentColor);
      setLocalFontFamily(fontFamily);
      setLocalBackgroundOpacity(backgroundOpacity);
      setLocalReportTitle(reportTitle);
    }, [
      leftLogo,
      rightLogo,
      backgroundImage,
      backgroundColor,
      textColor,
      accentColor,
      fontFamily,
      backgroundOpacity,
      reportTitle
    ]);
    
    // Apply theme
    const applyTheme = (themeId: string) => {
      const theme = HEADER_THEMES.find(t => t.id === themeId);
      if (!theme) return;
      
      setLocalBackgroundColor(theme.backgroundColor);
      setLocalTextColor(theme.textColor);
      setLocalAccentColor(theme.accentColor);
      setLocalFontFamily(theme.fontFamily);
      setSelectedTheme(themeId);
      
      toast({
        title: 'Theme Applied',
        description: `${theme.name} theme has been applied to your report header`,
        variant: 'default'
      });
    };
    
    // Handle logo uploads
    const handleLeftLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an image file (PNG, JPG, etc.)',
          variant: 'destructive'
        });
        return;
      }
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Logo image should be less than 2MB',
          variant: 'destructive'
        });
        return;
      }
      
      // Create object URL
      const url = URL.createObjectURL(file);
      setLocalLeftLogo(url);
      
      toast({
        title: 'Logo Uploaded',
        description: 'Left logo has been updated',
        variant: 'default'
      });
    };
    
    const handleRightLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an image file (PNG, JPG, etc.)',
          variant: 'destructive'
        });
        return;
      }
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Logo image should be less than 2MB',
          variant: 'destructive'
        });
        return;
      }
      
      // Create object URL
      const url = URL.createObjectURL(file);
      setLocalRightLogo(url);
      
      toast({
        title: 'Logo Uploaded',
        description: 'Right logo has been updated',
        variant: 'default'
      });
    };
    
    const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an image file (PNG, JPG, etc.)',
          variant: 'destructive'
        });
        return;
      }
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Background image should be less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      // Create object URL
      const url = URL.createObjectURL(file);
      setLocalBackgroundImage(url);
      
      toast({
        title: 'Background Uploaded',
        description: 'Header background image has been updated',
        variant: 'default'
      });
    };
    
    // Remove logos
    const removeLeftLogo = () => {
      setLocalLeftLogo(undefined);
    };
    
    const removeRightLogo = () => {
      setLocalRightLogo(undefined);
    };
    
    const removeBackgroundImage = () => {
      setLocalBackgroundImage(undefined);
    };
    
    // Save changes
    const saveChanges = () => {
      onUpdate({
        leftLogo: localLeftLogo,
        rightLogo: localRightLogo,
        backgroundImage: localBackgroundImage,
        backgroundColor: localBackgroundColor,
        textColor: localTextColor,
        accentColor: localAccentColor,
        fontFamily: localFontFamily,
        backgroundOpacity: localBackgroundOpacity,
        reportTitle: localReportTitle
      });
      
      toast({
        title: 'Changes Saved',
        description: 'Header customization has been updated',
        variant: 'default'
      });
    };
    
    // Revert changes
    const revertChanges = () => {
      setLocalLeftLogo(leftLogo);
      setLocalRightLogo(rightLogo);
      setLocalBackgroundImage(backgroundImage);
      setLocalBackgroundColor(backgroundColor);
      setLocalTextColor(textColor);
      setLocalAccentColor(accentColor);
      setLocalFontFamily(fontFamily);
      setLocalBackgroundOpacity(backgroundOpacity);
      setLocalReportTitle(reportTitle);
      setSelectedTheme(null);
      
      toast({
        title: 'Changes Reverted',
        description: 'Header customization has been reset',
        variant: 'default'
      });
    };
    
    // Format date range for display
    const formattedDateRange = `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`;
    
    // Check if changes have been made
    const hasChanges = 
      localLeftLogo !== leftLogo ||
      localRightLogo !== rightLogo ||
      localBackgroundImage !== backgroundImage ||
      localBackgroundColor !== backgroundColor ||
      localTextColor !== textColor ||
      localAccentColor !== accentColor ||
      localFontFamily !== fontFamily ||
      localBackgroundOpacity !== backgroundOpacity ||
      localReportTitle !== reportTitle;
      
    return (
      <CustomizerContainer>
        <CustomizerHeader>
          <Title>
            <Paintbrush size={20} />
            Header & Branding
          </Title>
          
          {hasChanges && (
            <div>
              <Badge variant="outline" className="bg-yellow-50">
                <Clock size={12} className="mr-1" />
                Unsaved Changes
              </Badge>
            </div>
          )}
        </CustomizerHeader>
        
        <Tabs defaultValue="logos">
          <TabsList className="mb-4">
            <TabsTrigger value="logos">
              <Image size={16} className="mr-2" />
              Logos
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette size={16} className="mr-2" />
              Design
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Layout size={16} className="mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="logos">
            <SubTitle>Company Logos</SubTitle>
            <LogoGrid>
              <div>
                <Label className="mb-2 block">Left Logo</Label>
                <LogoUploader onClick={() => leftLogoInputRef.current?.click()}>
                  <input
                    type="file"
                    ref={leftLogoInputRef}
                    onChange={handleLeftLogoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  {localLeftLogo ? (
                    <>
                      <LogoPreview>
                        <LogoImage src={localLeftLogo} alt="Left logo" />
                      </LogoPreview>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Click to change</div>
                      <RemoveButton onClick={(e) => { e.stopPropagation(); removeLeftLogo(); }}>
                        <X size={14} />
                      </RemoveButton>
                    </>
                  ) : (
                    <LogoPlaceholder>
                      <Upload size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                      <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                        Upload Left Logo
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        PNG or JPG (Max 2MB)
                      </div>
                    </LogoPlaceholder>
                  )}
                </LogoUploader>
              </div>
              
              <div>
                <Label className="mb-2 block">Right Logo</Label>
                <LogoUploader onClick={() => rightLogoInputRef.current?.click()}>
                  <input
                    type="file"
                    ref={rightLogoInputRef}
                    onChange={handleRightLogoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  {localRightLogo ? (
                    <>
                      <LogoPreview>
                        <LogoImage src={localRightLogo} alt="Right logo" />
                      </LogoPreview>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Click to change</div>
                      <RemoveButton onClick={(e) => { e.stopPropagation(); removeRightLogo(); }}>
                        <X size={14} />
                      </RemoveButton>
                    </>
                  ) : (
                    <LogoPlaceholder>
                      <Upload size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                      <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                        Upload Right Logo
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        PNG or JPG (Max 2MB)
                      </div>
                    </LogoPlaceholder>
                  )}
                </LogoUploader>
              </div>
            </LogoGrid>
            
            <div style={{ marginTop: '24px' }}>
              <SubTitle>Report Title</SubTitle>
              <Input
                value={localReportTitle}
                onChange={(e) => setLocalReportTitle(e.target.value)}
                placeholder="Enter report title"
              />
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <SubTitle>Background Image (Optional)</SubTitle>
              <LogoUploader 
                onClick={() => backgroundImageInputRef.current?.click()}
                style={{ padding: localBackgroundImage ? '0' : '20px' }}
              >
                <input
                  type="file"
                  ref={backgroundImageInputRef}
                  onChange={handleBackgroundImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                
                {localBackgroundImage ? (
                  <>
                    <BackgroundImagePreview style={{ backgroundImage: `url(${localBackgroundImage})` }}>
                      <RemoveButton 
                        onClick={(e) => { e.stopPropagation(); removeBackgroundImage(); }}
                        style={{ position: 'absolute', top: '10px', right: '10px' }}
                      >
                        <X size={14} />
                      </RemoveButton>
                    </BackgroundImagePreview>
                    <div style={{ padding: '10px', fontSize: '0.85rem', color: '#666' }}>
                      Click to change background image
                    </div>
                  </>
                ) : (
                  <LogoPlaceholder>
                    <FileImage size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                    <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                      Upload Background Image
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      PNG or JPG (Max 5MB)
                    </div>
                  </LogoPlaceholder>
                )}
              </LogoUploader>
              
              {localBackgroundImage && (
                <SliderContainer>
                  <Label>Background Opacity: {localBackgroundOpacity.toFixed(1)}</Label>
                  <Slider
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={[localBackgroundOpacity]}
                    onValueChange={(values: number[]) => setLocalBackgroundOpacity(values[0])}
                  />
                </SliderContainer>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="design">
            <div style={{ marginBottom: '24px' }}>
              <SubTitle>Quick Themes</SubTitle>
              <TemplateContainer>
                {HEADER_THEMES.map(theme => (
                  <TemplateItem 
                    key={theme.id} 
                    active={selectedTheme === theme.id}
                    onClick={() => applyTheme(theme.id)}
                  >
                    <TemplateThumbnail
                      bgColor={theme.backgroundColor}
                      textColor={theme.textColor}
                    >
                      <span>Sample</span>
                    </TemplateThumbnail>
                    <TemplateName>{theme.name}</TemplateName>
                  </TemplateItem>
                ))}
              </TemplateContainer>
            </div>
            
            <SettingsGrid>
              <SettingCard>
                <SettingTitle>
                  <Palette size={16} />
                  Background Color
                </SettingTitle>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <ColorPreview color={localBackgroundColor} />
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="p-2">
                      <div className="mb-2 font-medium">Choose Background Color</div>
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {['#ffffff', '#f5f5f5', '#2c3e50', '#003366', '#1a1a1a'].map(color => (
                          <ColorButton
                            key={color}
                            color={color}
                            active={localBackgroundColor === color}
                            onClick={() => setLocalBackgroundColor(color)}
                          />
                        ))}
                      </div>
                      <Input
                        value={localBackgroundColor}
                        onChange={(e) => setLocalBackgroundColor(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                
                <ColorInfo>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Current: {localBackgroundColor}</div>
                </ColorInfo>
              </SettingCard>
              
              <SettingCard>
                <SettingTitle>
                  <Type size={16} />
                  Text Color
                </SettingTitle>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <ColorPreview color={localTextColor} />
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="p-2">
                      <div className="mb-2 font-medium">Choose Text Color</div>
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {['#000000', '#333333', '#ffffff', '#f8f9fa', '#ecf0f1'].map(color => (
                          <ColorButton
                            key={color}
                            color={color}
                            active={localTextColor === color}
                            onClick={() => setLocalTextColor(color)}
                          />
                        ))}
                      </div>
                      <Input
                        value={localTextColor}
                        onChange={(e) => setLocalTextColor(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                
                <ColorInfo>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Current: {localTextColor}</div>
                </ColorInfo>
              </SettingCard>
              
              <SettingCard>
                <SettingTitle>
                  <Palette size={16} />
                  Accent Color
                </SettingTitle>
                
                <ColorPickerTrigger
                  color={localAccentColor}
                  onChange={(color: string) => setLocalAccentColor(color)}
                  triggerContent={
                    <ColorPreview color={localAccentColor} />
                  }
                />
                
                <ColorInfo>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Current: {localAccentColor}</div>
                </ColorInfo>
              </SettingCard>
              
              <SettingCard>
                <SettingTitle>
                  <Type size={16} />
                  Font Family
                </SettingTitle>
                
                <FontSelector>
                  {FONT_OPTIONS.map(font => (
                    <FontPreview 
                      key={font.value}
                      style={{ 
                        borderColor: localFontFamily === font.value ? '#0070f3' : '#e0e0e0',
                        backgroundColor: localFontFamily === font.value ? 'rgba(0, 112, 243, 0.05)' : 'transparent'
                      }}
                      onClick={() => setLocalFontFamily(font.value)}
                    >
                      <FontSample fontFamily={font.value}>
                        {font.label}
                      </FontSample>
                    </FontPreview>
                  ))}
                </FontSelector>
              </SettingCard>
            </SettingsGrid>
          </TabsContent>
          
          <TabsContent value="preview">
            <SubTitle>Header Preview</SubTitle>
            
            <PreviewContainer>
              <HeaderPreview
                backgroundImage={localBackgroundImage}
                backgroundOpacity={localBackgroundOpacity}
                backgroundColor={localBackgroundColor}
                textColor={localTextColor}
              >
                {localLeftLogo && (
                  <LogoContainer>
                    <LogoImage src={localLeftLogo} alt="Left logo" />
                  </LogoContainer>
                )}
                
                <HeaderContent>
                  <HeaderTitle style={{ fontFamily: localFontFamily, color: localTextColor }}>
                    {localReportTitle}
                  </HeaderTitle>
                  <HeaderSubtitle style={{ fontFamily: localFontFamily }}>
                    {clientName} - {formattedDateRange}
                  </HeaderSubtitle>
                </HeaderContent>
                
                {localRightLogo && (
                  <LogoContainer>
                    <LogoImage src={localRightLogo} alt="Right logo" />
                  </LogoContainer>
                )}
              </HeaderPreview>
              
              <div style={{ marginTop: '16px', padding: '0 16px' }}>
                <div style={{ 
                  width: '100%', 
                  height: '2px', 
                  backgroundColor: localAccentColor, 
                  marginBottom: '16px' 
                }} />
                
                <div style={{ fontFamily: localFontFamily, fontSize: '0.9rem', color: '#666' }}>
                  Your report content will appear below this header
                </div>
              </div>
            </PreviewContainer>
            
            <div style={{ marginTop: '20px' }}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info size={16} className="mr-2" />
                    Design Tips
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Professional Header Tips</h4>
                    <ul className="text-sm space-y-1 list-disc pl-4">
                      <li>Use company brand colors for consistency</li>
                      <li>Ensure text has enough contrast with background</li>
                      <li>Keep logos proportional and properly aligned</li>
                      <li>Use a background image that isn't too busy</li>
                      <li>Select font that matches your brand style</li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>
        </Tabs>
        
        <ButtonsContainer style={{ marginTop: '24px' }}>
          <Button
            variant="outline"
            onClick={revertChanges}
            disabled={!hasChanges}
          >
            <RefreshCw size={16} className="mr-2" />
            Revert Changes
          </Button>
          
          <Button
            onClick={saveChanges}
            disabled={!hasChanges}
          >
            <Download size={16} className="mr-2" />
            Save Changes
          </Button>
        </ButtonsContainer>
      </CustomizerContainer>
    );
  };

  export default DualLogoHeaderCustomizer;