import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

// Types
interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  isActive: boolean;
  startPoint: TouchPoint | null;
  currentPoint: TouchPoint | null;
  velocity: { x: number; y: number };
  distance: number;
  duration: number;
  direction: 'up' | 'down' | 'left' | 'right' | null;
}

interface GestureCallbacks {
  onSwipeLeft?: (gesture: GestureState) => void;
  onSwipeRight?: (gesture: GestureState) => void;
  onSwipeUp?: (gesture: GestureState) => void;
  onSwipeDown?: (gesture: GestureState) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPinchStart?: (scale: number) => void;
  onPinchMove?: (scale: number, delta: number) => void;
  onPinchEnd?: (scale: number) => void;
}

interface GestureOptions {
  swipeThreshold?: number;
  velocityThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  enablePinch?: boolean;
  enableSwipe?: boolean;
  enableTap?: boolean;
  enableLongPress?: boolean;
}

const defaultOptions: Required<GestureOptions> = {
  swipeThreshold: 50,
  velocityThreshold: 0.3,
  longPressDelay: 500,
  doubleTapDelay: 300,
  enablePinch: true,
  enableSwipe: true,
  enableTap: true,
  enableLongPress: true,
};

// Context
interface TouchGestureContextType {
  registerElement: (element: HTMLElement, callbacks: GestureCallbacks, options?: GestureOptions) => () => void;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy') => void;
  isTouch: boolean;
}

const TouchGestureContext = createContext<TouchGestureContextType | null>(null);

// Hook
export const useTouchGesture = () => {
  const context = useContext(TouchGestureContext);
  if (!context) {
    throw new Error('useTouchGesture must be used within a TouchGestureProvider');
  }
  return context;
};

// Helper functions
const getDistance = (point1: TouchPoint, point2: TouchPoint): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getDirection = (start: TouchPoint, end: TouchPoint): 'up' | 'down' | 'left' | 'right' => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
};

const getVelocity = (start: TouchPoint, end: TouchPoint): { x: number; y: number } => {
  const dt = end.timestamp - start.timestamp;
  if (dt === 0) return { x: 0, y: 0 };
  
  return {
    x: (end.x - start.x) / dt,
    y: (end.y - start.y) / dt,
  };
};

const getTouchPoint = (touch: Touch): TouchPoint => ({
  x: touch.clientX,
  y: touch.clientY,
  timestamp: Date.now(),
});

const getPinchDistance = (touches: TouchList): number => {
  if (touches.length < 2) return 0;
  const point1 = getTouchPoint(touches[0]);
  const point2 = getTouchPoint(touches[1]);
  return getDistance(point1, point2);
};

// Main Provider Component
interface TouchGestureProviderProps {
  children: React.ReactNode;
}

const TouchGestureProvider: React.FC<TouchGestureProviderProps> = ({ children }) => {
  const gestureStates = useRef(new Map<HTMLElement, {
    state: GestureState;
    callbacks: GestureCallbacks;
    options: Required<GestureOptions>;
    timers: {
      longPress?: NodeJS.Timeout;
      doubleTap?: NodeJS.Timeout;
    };
    lastTap?: TouchPoint;
    pinchState?: {
      initialDistance: number;
      currentScale: number;
    };
  }>());
  
  const isTouch = useRef(false);

  // Check for touch support
  useEffect(() => {
    isTouch.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Haptic feedback function
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 50,
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent, element: HTMLElement) => {
    const elementState = gestureStates.current.get(element);
    if (!elementState) return;

    const { state, callbacks, options, timers } = elementState;
    const touch = event.touches[0];
    const point = getTouchPoint(touch);

    // Clear existing timers
    if (timers.longPress) clearTimeout(timers.longPress);
    if (timers.doubleTap) clearTimeout(timers.doubleTap);

    // Update state
    state.isActive = true;
    state.startPoint = point;
    state.currentPoint = point;
    state.velocity = { x: 0, y: 0 };
    state.distance = 0;
    state.duration = 0;
    state.direction = null;

    // Handle pinch gestures
    if (options.enablePinch && event.touches.length === 2) {
      const pinchDistance = getPinchDistance(event.touches);
      elementState.pinchState = {
        initialDistance: pinchDistance,
        currentScale: 1,
      };
      callbacks.onPinchStart?.(1);
      return;
    }

    // Set up long press timer
    if (options.enableLongPress && callbacks.onLongPress) {
      timers.longPress = setTimeout(() => {
        if (state.isActive && state.distance < options.swipeThreshold) {
          hapticFeedback('medium');
          callbacks.onLongPress!(point);
        }
      }, options.longPressDelay);
    }
  }, [hapticFeedback]);

  const handleTouchMove = useCallback((event: TouchEvent, element: HTMLElement) => {
    const elementState = gestureStates.current.get(element);
    if (!elementState || !elementState.state.isActive) return;

    const { state, callbacks, options } = elementState;
    const touch = event.touches[0];
    const point = getTouchPoint(touch);

    if (!state.startPoint) return;

    // Handle pinch gestures
    if (options.enablePinch && event.touches.length === 2 && elementState.pinchState) {
      const currentDistance = getPinchDistance(event.touches);
      const scale = currentDistance / elementState.pinchState.initialDistance;
      const delta = scale - elementState.pinchState.currentScale;
      
      elementState.pinchState.currentScale = scale;
      callbacks.onPinchMove?.(scale, delta);
      return;
    }

    // Update state
    state.currentPoint = point;
    state.distance = getDistance(state.startPoint, point);
    state.duration = point.timestamp - state.startPoint.timestamp;
    state.velocity = getVelocity(state.startPoint, point);
    state.direction = getDirection(state.startPoint, point);

    // Clear long press if moved too much
    if (state.distance > options.swipeThreshold && elementState.timers.longPress) {
      clearTimeout(elementState.timers.longPress);
      elementState.timers.longPress = undefined;
    }

    // Prevent default scrolling for certain gestures
    if (state.distance > 10) {
      event.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((event: TouchEvent, element: HTMLElement) => {
    const elementState = gestureStates.current.get(element);
    if (!elementState || !elementState.state.isActive) return;

    const { state, callbacks, options, timers } = elementState;
    
    // Handle pinch end
    if (elementState.pinchState) {
      callbacks.onPinchEnd?.(elementState.pinchState.currentScale);
      elementState.pinchState = undefined;
      state.isActive = false;
      return;
    }

    if (!state.startPoint || !state.currentPoint) {
      state.isActive = false;
      return;
    }

    // Clear timers
    if (timers.longPress) {
      clearTimeout(timers.longPress);
      timers.longPress = undefined;
    }

    const isSwipe = state.distance > options.swipeThreshold;
    const hasVelocity = Math.abs(state.velocity.x) > options.velocityThreshold || 
                       Math.abs(state.velocity.y) > options.velocityThreshold;

    // Handle swipe gestures
    if (options.enableSwipe && (isSwipe || hasVelocity) && state.direction) {
      hapticFeedback('light');
      
      switch (state.direction) {
        case 'left':
          callbacks.onSwipeLeft?.(state);
          break;
        case 'right':
          callbacks.onSwipeRight?.(state);
          break;
        case 'up':
          callbacks.onSwipeUp?.(state);
          break;
        case 'down':
          callbacks.onSwipeDown?.(state);
          break;
      }
    }
    // Handle tap gestures
    else if (options.enableTap && state.distance < options.swipeThreshold) {
      const currentPoint = state.currentPoint;
      
      // Check for double tap
      if (elementState.lastTap && callbacks.onDoubleTap) {
        const timeBetween = currentPoint.timestamp - elementState.lastTap.timestamp;
        const distanceBetween = getDistance(elementState.lastTap, currentPoint);
        
        if (timeBetween < options.doubleTapDelay && distanceBetween < 50) {
          hapticFeedback('medium');
          callbacks.onDoubleTap(currentPoint);
          elementState.lastTap = undefined;
          if (timers.doubleTap) {
            clearTimeout(timers.doubleTap);
            timers.doubleTap = undefined;
          }
        } else {
          elementState.lastTap = currentPoint;
          // Single tap with delay
          timers.doubleTap = setTimeout(() => {
            hapticFeedback('light');
            callbacks.onTap?.(currentPoint);
          }, options.doubleTapDelay);
        }
      } else {
        elementState.lastTap = currentPoint;
        // Single tap with delay to check for double tap
        if (callbacks.onDoubleTap) {
          timers.doubleTap = setTimeout(() => {
            hapticFeedback('light');
            callbacks.onTap?.(currentPoint);
          }, options.doubleTapDelay);
        } else {
          hapticFeedback('light');
          callbacks.onTap?.(currentPoint);
        }
      }
    }

    // Reset state
    state.isActive = false;
    state.startPoint = null;
    state.currentPoint = null;
  }, [hapticFeedback]);

  const registerElement = useCallback((element: HTMLElement, callbacks: GestureCallbacks, options: GestureOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options };
    
    const elementState = {
      state: {
        isActive: false,
        startPoint: null,
        currentPoint: null,
        velocity: { x: 0, y: 0 },
        distance: 0,
        duration: 0,
        direction: null,
      } as GestureState,
      callbacks,
      options: mergedOptions,
      timers: {} as any,
    };

    gestureStates.current.set(element, elementState);

    // Event handlers
    const onTouchStart = (e: TouchEvent) => handleTouchStart(e, element);
    const onTouchMove = (e: TouchEvent) => handleTouchMove(e, element);
    const onTouchEnd = (e: TouchEvent) => handleTouchEnd(e, element);
    const onTouchCancel = (e: TouchEvent) => handleTouchEnd(e, element);

    // Add event listeners
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: false });
    element.addEventListener('touchcancel', onTouchCancel, { passive: false });

    // Return cleanup function
    return () => {
      // Clear timers
      if (elementState.timers.longPress) clearTimeout(elementState.timers.longPress);
      if (elementState.timers.doubleTap) clearTimeout(elementState.timers.doubleTap);
      
      // Remove event listeners
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchCancel);
      
      // Remove from state
      gestureStates.current.delete(element);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const contextValue: TouchGestureContextType = {
    registerElement,
    hapticFeedback,
    isTouch: isTouch.current,
  };

  return (
    <TouchGestureContext.Provider value={contextValue}>
      {children}
    </TouchGestureContext.Provider>
  );
};

export default TouchGestureProvider;

// Hook for easy element registration
export const useElementGesture = (callbacks: GestureCallbacks, options?: GestureOptions) => {
  const { registerElement } = useTouchGesture();
  const elementRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((element: HTMLElement | null) => {
    // Cleanup previous registration
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Register new element
    if (element) {
      elementRef.current = element;
      cleanupRef.current = registerElement(element, callbacks, options);
    }
  }, [registerElement, callbacks, options]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return ref;
};
