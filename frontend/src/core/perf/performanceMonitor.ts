// frontend/src/core/perf/performanceMonitor.ts

/**
 * Performance Monitor Utility
 *
 * Tracks Core Web Vitals and custom performance metrics to enforce budgets:
 * - LCP (Largest Contentful Paint): ≤ 2.5s
 * - CLS (Cumulative Layout Shift): ≤ 0.1
 * - FID (First Input Delay): ≤ 100ms
 * - TTI (Time to Interactive): ≤ 3.5s
 * - FPS (Frames Per Second): ≥ 30 FPS
 * - Long Tasks: ≤ 50ms (main thread blocking)
 *
 * **Integration Points:**
 * - Auto-initialized on app mount
 * - Reports to console in dev mode
 * - Can integrate with analytics in production
 * - Triggers warnings when budgets are exceeded
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 1) - Performance tier validation
 * ChatGPT-5/Codex Performance Approval (#5)
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint (ms)
  cls: number | null; // Cumulative Layout Shift (score)
  fid: number | null; // First Input Delay (ms)
  tti: number | null; // Time to Interactive (ms)

  // Custom metrics
  fps: number | null; // Frames per second
  longTasks: number; // Count of tasks > 50ms
  avgFrameTime: number | null; // Average frame time (ms)

  // Timestamps
  timestamp: number;
}

export interface PerformanceBudget {
  lcp: number; // 2500ms
  cls: number; // 0.1
  fid: number; // 100ms
  tti: number; // 3500ms
  fps: number; // 30 FPS minimum
  longTaskThreshold: number; // 50ms
}

/**
 * Default performance budgets (ChatGPT-5 approved)
 */
export const DEFAULT_BUDGETS: PerformanceBudget = {
  lcp: 2500, // 2.5s
  cls: 0.1, // Google's "good" threshold
  fid: 100, // 100ms
  tti: 3500, // 3.5s
  fps: 30, // Minimum acceptable FPS
  longTaskThreshold: 50, // 50ms main thread blocking
};

/**
 * Performance Monitor Class
 * Singleton pattern for global performance tracking
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private budgets: PerformanceBudget;
  private observers: PerformanceObserver[] = [];
  private rafId: number | null = null;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private isMonitoring: boolean = false;

  constructor(budgets: PerformanceBudget = DEFAULT_BUDGETS) {
    this.budgets = budgets;
    this.metrics = {
      lcp: null,
      cls: null,
      fid: null,
      tti: null,
      fps: null,
      longTasks: 0,
      avgFrameTime: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Start monitoring all performance metrics
   */
  public start(): void {
    if (this.isMonitoring) {
      console.warn('[PerformanceMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;

    // Monitor LCP (Largest Contentful Paint)
    this.observeLCP();

    // Monitor CLS (Cumulative Layout Shift)
    this.observeCLS();

    // Monitor FID (First Input Delay)
    this.observeFID();

    // Monitor TTI (Time to Interactive) - custom calculation
    this.calculateTTI();

    // Monitor FPS and long tasks
    this.startFPSMonitoring();

    // Monitor long tasks (> 50ms)
    this.observeLongTasks();

    console.log('[PerformanceMonitor] Monitoring started with budgets:', this.budgets);
  }

  /**
   * Stop all monitoring
   */
  public stop(): void {
    this.isMonitoring = false;

    // Disconnect all observers
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];

    // Cancel FPS monitoring
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    console.log('[PerformanceMonitor] Monitoring stopped');
  }

  /**
   * Get current metrics snapshot
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics, timestamp: Date.now() };
  }

  /**
   * Check if metrics are within budgets
   */
  public checkBudgets(): {
    withinBudget: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (this.metrics.lcp !== null && this.metrics.lcp > this.budgets.lcp) {
      violations.push(
        `LCP: ${this.metrics.lcp.toFixed(0)}ms exceeds budget of ${this.budgets.lcp}ms`
      );
    }

    if (this.metrics.cls !== null && this.metrics.cls > this.budgets.cls) {
      violations.push(
        `CLS: ${this.metrics.cls.toFixed(3)} exceeds budget of ${this.budgets.cls}`
      );
    }

    if (this.metrics.fid !== null && this.metrics.fid > this.budgets.fid) {
      violations.push(
        `FID: ${this.metrics.fid.toFixed(0)}ms exceeds budget of ${this.budgets.fid}ms`
      );
    }

    if (this.metrics.tti !== null && this.metrics.tti > this.budgets.tti) {
      violations.push(
        `TTI: ${this.metrics.tti.toFixed(0)}ms exceeds budget of ${this.budgets.tti}ms`
      );
    }

    if (this.metrics.fps !== null && this.metrics.fps < this.budgets.fps) {
      violations.push(
        `FPS: ${this.metrics.fps.toFixed(1)} is below budget of ${this.budgets.fps}`
      );
    }

    return {
      withinBudget: violations.length === 0,
      violations,
    };
  }

  /**
   * Observe Largest Contentful Paint (LCP)
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number;
          loadTime?: number;
        };

        // LCP is the renderTime or loadTime of the last entry
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PerformanceMonitor] LCP: ${this.metrics.lcp.toFixed(0)}ms`);
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceMonitor] LCP observation failed:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift (CLS)
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { value: number })[];

        entries.forEach((entry) => {
          // Only count layout shifts without recent user input
          if (!(entry as any).hadRecentInput) {
            clsValue += entry.value;
          }
        });

        this.metrics.cls = clsValue;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PerformanceMonitor] CLS: ${this.metrics.cls.toFixed(3)}`);
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceMonitor] CLS observation failed:', error);
    }
  }

  /**
   * Observe First Input Delay (FID)
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0] as PerformanceEntry & {
          processingStart?: number;
          startTime?: number;
        };

        // FID = processingStart - startTime
        this.metrics.fid =
          (firstInput.processingStart || 0) - (firstInput.startTime || 0);

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PerformanceMonitor] FID: ${this.metrics.fid.toFixed(0)}ms`);
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceMonitor] FID observation failed:', error);
    }
  }

  /**
   * Calculate Time to Interactive (TTI)
   * Custom metric based on when main thread is idle for 5s
   */
  private calculateTTI(): void {
    if (!window.performance || !window.performance.timing) return;

    // Use requestIdleCallback to detect when main thread is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const timing = performance.timing;
        const navigationStart = timing.navigationStart;
        const now = performance.now();

        // TTI = time from navigation start to now (idle callback)
        this.metrics.tti = now;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PerformanceMonitor] TTI: ${this.metrics.tti.toFixed(0)}ms`);
        }
      });
    } else {
      // Fallback: use DOMContentLoaded + 1s
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.metrics.tti = performance.now();

          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[PerformanceMonitor] TTI (fallback): ${this.metrics.tti?.toFixed(0)}ms`
            );
          }
        }, 1000);
      });
    }
  }

  /**
   * Monitor FPS (Frames Per Second)
   * Uses requestAnimationFrame to calculate average FPS
   */
  private startFPSMonitoring(): void {
    this.lastFrameTime = performance.now();

    const measureFrame = (currentTime: number) => {
      if (!this.isMonitoring) return;

      const deltaTime = currentTime - this.lastFrameTime;
      this.frameTimes.push(deltaTime);

      // Keep only last 60 frames (1 second at 60 FPS)
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }

      // Calculate average frame time and FPS
      const avgFrameTime =
        this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
      this.metrics.avgFrameTime = avgFrameTime;
      this.metrics.fps = 1000 / avgFrameTime;

      this.lastFrameTime = currentTime;
      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Observe Long Tasks (> 50ms)
   * Tracks main thread blocking tasks
   */
  private observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (entry.duration > this.budgets.longTaskThreshold) {
            this.metrics.longTasks += 1;

            if (process.env.NODE_ENV === 'development') {
              console.warn(
                `[PerformanceMonitor] Long task detected: ${entry.duration.toFixed(0)}ms`
              );
            }
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      // longtask observation not supported in all browsers
      // This is OK - it's a nice-to-have metric
    }
  }

  /**
   * Log current metrics to console (dev mode)
   */
  public logMetrics(): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('[PerformanceMonitor] Current Metrics');
    console.table({
      'LCP (ms)': this.metrics.lcp?.toFixed(0) || 'N/A',
      'CLS (score)': this.metrics.cls?.toFixed(3) || 'N/A',
      'FID (ms)': this.metrics.fid?.toFixed(0) || 'N/A',
      'TTI (ms)': this.metrics.tti?.toFixed(0) || 'N/A',
      'FPS': this.metrics.fps?.toFixed(1) || 'N/A',
      'Long Tasks': this.metrics.longTasks,
      'Avg Frame Time (ms)': this.metrics.avgFrameTime?.toFixed(1) || 'N/A',
    });

    const budgetCheck = this.checkBudgets();
    if (budgetCheck.withinBudget) {
      console.log('✅ All metrics within budget');
    } else {
      console.warn('⚠️ Budget violations:');
      budgetCheck.violations.forEach((violation) => console.warn(`  - ${violation}`));
    }

    console.groupEnd();
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

/**
 * Get the global PerformanceMonitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor(DEFAULT_BUDGETS);
  }
  return monitorInstance;
}

/**
 * Initialize performance monitoring (call in App.tsx or index.tsx)
 */
export function initPerformanceMonitoring(
  budgets: PerformanceBudget = DEFAULT_BUDGETS
): PerformanceMonitor {
  const monitor = new PerformanceMonitor(budgets);
  monitor.start();

  // Auto-log metrics every 10 seconds in dev mode
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      monitor.logMetrics();
    }, 10000);
  }

  monitorInstance = monitor;
  return monitor;
}

export default PerformanceMonitor;
