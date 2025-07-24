import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// Types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Styled Components
const InstallPromptContainer = styled.div<{ show: boolean }>`
  position: fixed;
  bottom: ${props => props.show ? '20px' : '-100px'};
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 90vw;
  width: 350px;
  
  @media (max-width: 768px) {
    width: calc(100vw - 40px);
    padding: 14px 16px;
    border-radius: 8px;
  }
`;

const InstallHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const AppIcon = styled.div`
  width: 40px;
  height: 40px;
  background: url('/Logo.png') center/cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

const AppInfo = styled.div`
  flex: 1;
`;

const AppName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 15px;
  }
`;

const AppDescription = styled.p`
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  
  @media (max-width: 768px) {
    margin-top: 10px;
  }
`;

const InstallButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  flex: 1;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 13px;
    touch-action: manipulation;
  }
`;

const DismissButton = styled(InstallButton)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex: 0.5;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    font-size: 16px;
    padding: 6px;
    touch-action: manipulation;
  }
`;

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstallStatus = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isInstalled = isStandaloneMode || isIOSStandalone;
      
      setIsStandalone(isInstalled);
      setIsInstalled(isInstalled);
    };

    checkInstallStatus();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: beforeinstallprompt event triggered');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay to not interrupt user flow
      setTimeout(() => {
        if (!isInstalled && !localStorage.getItem('pwa-install-dismissed')) {
          setShowPrompt(true);
        }
      }, 3000); // 3 second delay
    };

    // Listen for app install
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setShowPrompt(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or manual install
      showManualInstallInstructions();
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA: User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      // Reset the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA: Error during installation:', error);
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = 'To install Swan Studios:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm';
    } else if (isAndroid) {
      instructions = 'To install Swan Studios:\n\n1. Tap the three dots menu (⋮)\n2. Select "Add to Home screen" or "Install app"\n3. Tap "Add" or "Install" to confirm';
    } else {
      instructions = 'To install Swan Studios:\n\n1. Look for the install icon in your browser\'s address bar\n2. Click it to install the app\n3. Or use the browser menu to "Install Swan Studios"';
    }
    
    alert(instructions);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    
    // Allow showing again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  // Don't show if already installed or in standalone mode
  if (isInstalled || isStandalone) {
    return null;
  }

  return (
    <InstallPromptContainer show={showPrompt}>
      <InstallHeader>
        <AppIcon />
        <AppInfo>
          <AppName>Swan Studios</AppName>
          <AppDescription>Install for faster access & offline features</AppDescription>
        </AppInfo>
        <CloseButton onClick={handleClose} aria-label="Close install prompt">
          ×
        </CloseButton>
      </InstallHeader>
      
      <ButtonContainer>
        <InstallButton onClick={handleInstallClick}>
          Install App
        </InstallButton>
        <DismissButton onClick={handleDismiss}>
          Not Now
        </DismissButton>
      </ButtonContainer>
    </InstallPromptContainer>
  );
};

export default PWAInstallPrompt;
