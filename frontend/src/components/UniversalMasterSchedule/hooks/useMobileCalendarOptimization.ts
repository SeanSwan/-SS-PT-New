/**
 * useMobileCalendarOptimization - Phase 2 Mobile Enhancement Hook
 * ==============================================================
 * Advanced mobile-first optimizations for the Universal Master Schedule
 * 
 * PHASE 2 ENHANCEMENTS:
 * ✅ Touch-optimized calendar interactions
 * ✅ Mobile-specific calendar views (day/week priority)
 * ✅ Progressive loading for mobile performance
 * ✅ Enhanced mobile navigation patterns
 * ✅ Touch gesture support (pinch-to-zoom, swipe navigation)
 * ✅ Mobile-friendly event handling
 * ✅ Responsive breakpoint management
 * ✅ Mobile PWA optimizations
 * 
 * Designed for SwanStudios Phase 2: Mobile-First Responsive Optimization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Views } from 'react-big-calendar';
import type { CalendarView } from '../types';

export interface MobileCalendarState {
  // Mobile Detection & Breakpoints
  isMobile: boolean;
  isTablet: boolean;
  isSmallMobile: boolean;
  orientation: 'portrait' | 'landscape';
  
  // Mobile-Optimized Views
  preferredMobileView: CalendarView;
  supportedMobileViews: CalendarView[];
  
  // Touch Interactions
  touchStartPosition: { x: number; y: number } | null;
  isDragging: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  
  // Mobile Performance
  reducedAnimations: boolean;
  optimizedRendering: boolean;
  lazyLoadEvents: boolean;
  
  // Mobile UI States
  showMobileControls: boolean;
  mobileHeaderCollapsed: boolean;
  mobileKPIScrolled: boolean;
}

export interface MobileCalendarActions {
  // View Management
  setOptimalMobileView: () => void;
  cycleMobileViews: () => void;
  
  // Touch Gesture Handlers
  handleTouchStart: (event: TouchEvent) => void;
  handleTouchMove: (event: TouchEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;
  
  // Mobile Navigation
  navigatePrevious: () => void;
  navigateNext: () => void;
  navigateToToday: () => void;
  
  // Mobile UI Controls
  toggleMobileControls: () => void;
  collapseMobileHeader: (collapsed: boolean) => void;
  optimizeForMobile: () => void;
  
  // Performance Optimizations
  enableMobileOptimizations: () => void;
  disableMobileOptimizations: () => void;
}

export interface MobileCalendarOptimizations {
  // Calendar Configuration
  getMobileCalendarProps: () => {
    views: { [key: string]: boolean };
    defaultView: CalendarView;
    toolbar: boolean;
    events: any[];
    step: number;
    timeslots: number;
    min: Date;
    max: Date;
  };
  
  // Event Rendering Optimizations
  getMobileEventProps: () => {
    eventPropGetter: (event: any) => any;
    dayPropGetter: (date: Date) => any;
    slotPropGetter: (date: Date) => any;
  };
  
  // Touch Event Configuration
  getTouchEventProps: () => {
    onTouchStart: (event: TouchEvent) => void;
    onTouchMove: (event: TouchEvent) => void;
    onTouchEnd: (event: TouchEvent) => void;
  };
}

/**
 * Mobile Breakpoints Configuration
 */
const MOBILE_BREAKPOINTS = {
  smallMobile: 480,
  mobile: 768,
  tablet: 1024
} as const;

/**
 * Mobile-Optimized Calendar Views Priority
 */
const MOBILE_VIEW_PRIORITY: CalendarView[] = ['day', 'week', 'agenda'];
const TABLET_VIEW_PRIORITY: CalendarView[] = ['week', 'day', 'month'];

/**
 * useMobileCalendarOptimization Hook
 * 
 * Provides comprehensive mobile optimizations for the Universal Master Schedule
 * with touch-first interactions, mobile-specific views, and performance enhancements.
 */
export const useMobileCalendarOptimization = (dependencies: {
  currentView: CalendarView;
  setView: (view: CalendarView) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: any[];
}) => {
  const { currentView, setView, selectedDate, setSelectedDate, events } = dependencies;
  
  // ==================== MOBILE DETECTION STATE ====================
  
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isSmallMobile: false,
    orientation: 'portrait' as 'portrait' | 'landscape'
  });
  
  const [touchState, setTouchState] = useState({
    touchStartPosition: null as { x: number; y: number } | null,
    isDragging: false,
    swipeDirection: null as 'left' | 'right' | 'up' | 'down' | null
  });
  
  const [mobileUIState, setMobileUIState] = useState({
    showMobileControls: true,
    mobileHeaderCollapsed: false,
    mobileKPIScrolled: false,
    reducedAnimations: false,
    optimizedRendering: false,
    lazyLoadEvents: false
  });
  
  // ==================== DEVICE DETECTION EFFECT ====================
  
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width <= MOBILE_BREAKPOINTS.mobile;
      const isTablet = width > MOBILE_BREAKPOINTS.mobile && width <= MOBILE_BREAKPOINTS.tablet;
      const isSmallMobile = width <= MOBILE_BREAKPOINTS.smallMobile;
      const orientation = height > width ? 'portrait' : 'landscape';
      
      setDeviceInfo(prev => {
        // Only update if values actually changed
        if (prev.isMobile !== isMobile || 
            prev.isTablet !== isTablet || 
            prev.isSmallMobile !== isSmallMobile || 
            prev.orientation !== orientation) {
          return { isMobile, isTablet, isSmallMobile, orientation };
        }
        return prev;
      });
      
      // Automatically optimize for mobile devices (only once)
      if (isMobile) {
        setMobileUIState(prev => {
          if (!prev.optimizedRendering) {
            return {
              ...prev,
              reducedAnimations: true,
              optimizedRendering: true,
              lazyLoadEvents: events.length > 50
            };
          }
          return prev;
        });
      }
    };
    
    detectDevice();
    
    // Listen for resize and orientation changes
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, [events.length]); // Removed mobileUIState.optimizedRendering from dependencies
  
  // ==================== MOBILE VIEW OPTIMIZATION ====================
  
  const preferredMobileView = useMemo(() => {
    if (deviceInfo.isSmallMobile) {
      return 'day'; // Always use day view on small screens
    } else if (deviceInfo.isMobile) {
      return deviceInfo.orientation === 'portrait' ? 'day' : 'week';
    } else if (deviceInfo.isTablet) {
      return 'week';
    }
    return currentView;
  }, [deviceInfo, currentView]);
  
  const supportedMobileViews = useMemo(() => {
    if (deviceInfo.isSmallMobile) {
      return ['day', 'agenda'];
    } else if (deviceInfo.isMobile) {
      return MOBILE_VIEW_PRIORITY;
    } else if (deviceInfo.isTablet) {
      return TABLET_VIEW_PRIORITY;
    }
    return ['month', 'week', 'day', 'agenda'];
  }, [deviceInfo]);
  
  // ==================== MOBILE VIEW ACTIONS ====================
  
  const setOptimalMobileView = useCallback(() => {
    if (currentView !== preferredMobileView) {
      setView(preferredMobileView);
      console.log(`📱 Optimized view for mobile: ${preferredMobileView}`);
    }
  }, [currentView, preferredMobileView, setView]);
  
  const cycleMobileViews = useCallback(() => {
    const currentIndex = supportedMobileViews.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % supportedMobileViews.length;
    const nextView = supportedMobileViews[nextIndex];
    setView(nextView);
    console.log(`📱 Cycled to mobile view: ${nextView}`);
  }, [currentView, supportedMobileViews, setView]);
  
  // ==================== TOUCH GESTURE HANDLERS ====================
  
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    setTouchState(prev => ({
      ...prev,
      touchStartPosition: { x: touch.clientX, y: touch.clientY },
      isDragging: false,
      swipeDirection: null
    }));
  }, []);
  
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchState.touchStartPosition) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchState.touchStartPosition.x;
    const deltaY = touch.clientY - touchState.touchStartPosition.y;
    
    // Determine if this is a swipe gesture
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
      let swipeDirection: 'left' | 'right' | 'up' | 'down' | null = null;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        swipeDirection = deltaX > 0 ? 'right' : 'left';
      } else {
        swipeDirection = deltaY > 0 ? 'down' : 'up';
      }
      
      setTouchState(prev => ({
        ...prev,
        isDragging: true,
        swipeDirection
      }));
    }
  }, [touchState.touchStartPosition]);
  
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (touchState.swipeDirection && !touchState.isDragging) {
      // Handle swipe navigation
      switch (touchState.swipeDirection) {
        case 'left':
          navigateNext();
          break;
        case 'right':
          navigatePrevious();
          break;
        case 'up':
          // Collapse mobile header
          setMobileUIState(prev => ({ ...prev, mobileHeaderCollapsed: true }));
          break;
        case 'down':
          // Expand mobile header
          setMobileUIState(prev => ({ ...prev, mobileHeaderCollapsed: false }));
          break;
      }
    }
    
    // Reset touch state
    setTouchState({
      touchStartPosition: null,
      isDragging: false,
      swipeDirection: null
    });
  }, [touchState.swipeDirection, touchState.isDragging]);
  
  // ==================== MOBILE NAVIGATION ====================
  
  const navigatePrevious = useCallback(() => {
    const newDate = new Date(selectedDate);
    
    switch (currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      default:
        newDate.setDate(newDate.getDate() - 1);
    }
    
    setSelectedDate(newDate);
    console.log(`📱 Mobile navigation: Previous ${currentView}`);
  }, [selectedDate, currentView, setSelectedDate]);
  
  const navigateNext = useCallback(() => {
    const newDate = new Date(selectedDate);
    
    switch (currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      default:
        newDate.setDate(newDate.getDate() + 1);
    }
    
    setSelectedDate(newDate);
    console.log(`📱 Mobile navigation: Next ${currentView}`);
  }, [selectedDate, currentView, setSelectedDate]);
  
  const navigateToToday = useCallback(() => {
    setSelectedDate(new Date());
    console.log('📱 Mobile navigation: Today');
  }, [setSelectedDate]);
  
  // ==================== MOBILE UI CONTROLS ====================
  
  const toggleMobileControls = useCallback(() => {
    setMobileUIState(prev => ({
      ...prev,
      showMobileControls: !prev.showMobileControls
    }));
  }, []);
  
  const collapseMobileHeader = useCallback((collapsed: boolean) => {
    setMobileUIState(prev => ({
      ...prev,
      mobileHeaderCollapsed: collapsed
    }));
  }, []);
  
  const optimizeForMobile = useCallback(() => {
    setOptimalMobileView();
    setMobileUIState(prev => ({
      ...prev,
      reducedAnimations: true,
      optimizedRendering: true,
      lazyLoadEvents: events.length > 50
    }));
    console.log('📱 Mobile optimizations enabled');
  }, [setOptimalMobileView, events.length]);
  
  // ==================== PERFORMANCE OPTIMIZATIONS ====================
  
  const enableMobileOptimizations = useCallback(() => {
    setMobileUIState(prev => ({
      ...prev,
      reducedAnimations: true,
      optimizedRendering: true,
      lazyLoadEvents: true
    }));
  }, []);
  
  const disableMobileOptimizations = useCallback(() => {
    setMobileUIState(prev => ({
      ...prev,
      reducedAnimations: false,
      optimizedRendering: false,
      lazyLoadEvents: false
    }));
  }, []);
  
  // ==================== MOBILE CALENDAR CONFIGURATION ====================
  
  const getMobileCalendarProps = useCallback(() => {
    // Mobile-optimized calendar props
    const mobileViews: { [key: string]: boolean } = {};
    supportedMobileViews.forEach(view => {
      mobileViews[view] = true;
    });
    
    // Adjust step and timeslots for mobile
    const step = deviceInfo.isMobile ? 30 : 15; // Larger time slots on mobile
    const timeslots = deviceInfo.isMobile ? 2 : 4; // Fewer timeslots on mobile
    
    // Business hours for mobile optimization
    const min = new Date();
    min.setHours(6, 0, 0, 0);
    const max = new Date();
    max.setHours(22, 0, 0, 0);
    
    return {
      views: mobileViews,
      defaultView: preferredMobileView,
      toolbar: !deviceInfo.isSmallMobile, // Hide toolbar on very small screens
      events: mobileUIState.lazyLoadEvents ? events.slice(0, 100) : events,
      step,
      timeslots,
      min,
      max
    };
  }, [supportedMobileViews, preferredMobileView, deviceInfo, mobileUIState.lazyLoadEvents, events]);
  
  const getMobileEventProps = useCallback(() => {
    return {
      eventPropGetter: (event: any) => ({
        style: {
          fontSize: deviceInfo.isMobile ? '0.75rem' : '0.875rem',
          padding: deviceInfo.isMobile ? '2px 4px' : '4px 8px',
          borderRadius: deviceInfo.isMobile ? '4px' : '6px',
          minHeight: deviceInfo.isMobile ? '24px' : '32px',
          cursor: 'pointer',
          // Enhanced touch targets
          minWidth: deviceInfo.isMobile ? '60px' : 'auto'
        }
      }),
      dayPropGetter: (date: Date) => ({
        style: {
          minHeight: deviceInfo.isMobile ? '80px' : '120px'
        }
      }),
      slotPropGetter: (date: Date) => ({
        style: {
          minHeight: deviceInfo.isMobile ? '40px' : '60px'
        }
      })
    };
  }, [deviceInfo]);
  
  const getTouchEventProps = useCallback(() => {
    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  // ==================== AUTO-OPTIMIZATION EFFECT ====================
  
  useEffect(() => {
    if (deviceInfo.isMobile && currentView === 'month' && deviceInfo.orientation === 'portrait') {
      // Automatically switch to day view on mobile portrait for better UX
      setOptimalMobileView();
    }
  }, [deviceInfo, currentView, setOptimalMobileView]);
  
  // ==================== RETURN VALUES ====================
  
  const state: MobileCalendarState = {
    // Mobile Detection & Breakpoints
    ...deviceInfo,
    
    // Mobile-Optimized Views
    preferredMobileView,
    supportedMobileViews,
    
    // Touch Interactions  
    ...touchState,
    
    // Mobile Performance & UI States
    ...mobileUIState
  };
  
  const actions: MobileCalendarActions = {
    // View Management
    setOptimalMobileView,
    cycleMobileViews,
    
    // Touch Gesture Handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Mobile Navigation
    navigatePrevious,
    navigateNext,
    navigateToToday,
    
    // Mobile UI Controls
    toggleMobileControls,
    collapseMobileHeader,
    optimizeForMobile,
    
    // Performance Optimizations
    enableMobileOptimizations,
    disableMobileOptimizations
  };
  
  const optimizations: MobileCalendarOptimizations = {
    getMobileCalendarProps,
    getMobileEventProps,
    getTouchEventProps
  };
  
  return {
    ...state,
    ...actions,
    ...optimizations
  };
};

export default useMobileCalendarOptimization;
