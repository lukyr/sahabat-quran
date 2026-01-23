/**
 * Core Web Vitals Tracking
 * Monitors LCP, FID, CLS, TTFB for SEO and performance optimization
 */

import { analyticsService } from '../services/analyticsService';

/**
 * Get rating for metric value
 */
function getRating(metric: string, value: number): 'good' | 'needs_improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],      // Largest Contentful Paint
    FID: [100, 300],        // First Input Delay
    CLS: [0.1, 0.25],       // Cumulative Layout Shift
    TTFB: [800, 1800],      // Time to First Byte
    FCP: [1800, 3000],      // First Contentful Paint
    INP: [200, 500],        // Interaction to Next Paint
  };

  const [goodThreshold, poorThreshold] = thresholds[metric] || [0, 0];

  if (value <= goodThreshold) return 'good';
  if (value <= poorThreshold) return 'needs_improvement';
  return 'poor';
}

/**
 * Track Largest Contentful Paint (LCP)
 * Measures loading performance
 * Good: < 2.5s, Needs Improvement: < 4s, Poor: >= 4s
 */
export function trackLCP() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      const value = lastEntry.renderTime || lastEntry.loadTime;
      const rating = getRating('LCP', value);

      analyticsService.trackWebVitals('LCP', value, rating);

      observer.disconnect();
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.warn('LCP tracking failed:', error);
  }
}

/**
 * Track First Input Delay (FID)
 * Measures interactivity
 * Good: < 100ms, Needs Improvement: < 300ms, Poor: >= 300ms
 */
export function trackFID() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry: any) => {
        const value = entry.processingStart - entry.startTime;
        const rating = getRating('FID', value);

        analyticsService.trackWebVitals('FID', value, rating);
      });

      observer.disconnect();
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    console.warn('FID tracking failed:', error);
  }
}

/**
 * Track Cumulative Layout Shift (CLS)
 * Measures visual stability
 * Good: < 0.1, Needs Improvement: < 0.25, Poor: >= 0.25
 */
export function trackCLS() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry: any) => {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          // If the entry occurred less than 1 second after the previous entry
          // and less than 5 seconds after the first entry in the session,
          // include the entry in the current session. Otherwise, start a new session.
          if (
            sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          // If the current session value is larger than the current CLS value,
          // update CLS and the entries contributing to it.
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
          }
        }
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Report CLS when the page is hidden
    const reportCLS = () => {
      const rating = getRating('CLS', clsValue);
      analyticsService.trackWebVitals('CLS', clsValue, rating);
      observer.disconnect();
    };

    // Report on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS();
      }
    });

    // Also report on page unload
    window.addEventListener('pagehide', reportCLS);
  } catch (error) {
    console.warn('CLS tracking failed:', error);
  }
}

/**
 * Track Time to First Byte (TTFB)
 * Measures server response time
 * Good: < 800ms, Needs Improvement: < 1800ms, Poor: >= 1800ms
 */
export function trackTTFB() {
  if (typeof window === 'undefined' || !performance.timing) return;

  try {
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      const value = perfData.responseStart - perfData.requestStart;
      const rating = getRating('TTFB', value);

      analyticsService.trackWebVitals('TTFB', value, rating);
    });
  } catch (error) {
    console.warn('TTFB tracking failed:', error);
  }
}

/**
 * Track First Contentful Paint (FCP)
 * Measures when first content is painted
 * Good: < 1.8s, Needs Improvement: < 3s, Poor: >= 3s
 */
export function trackFCP() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          const value = entry.startTime;
          const rating = getRating('FCP', value);

          analyticsService.trackWebVitals('FCP', value, rating);
          observer.disconnect();
        }
      });
    });

    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.warn('FCP tracking failed:', error);
  }
}

/**
 * Track Interaction to Next Paint (INP)
 * Measures responsiveness (replacing FID in the future)
 * Good: < 200ms, Needs Improvement: < 500ms, Poor: >= 500ms
 */
export function trackINP() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    let worstINP = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry: any) => {
        const duration = entry.processingEnd - entry.startTime;

        if (duration > worstINP) {
          worstINP = duration;
        }
      });
    });

    observer.observe({ entryTypes: ['event'] });

    // Report INP when page is hidden
    const reportINP = () => {
      if (worstINP > 0) {
        const rating = getRating('INP', worstINP);
        analyticsService.trackWebVitals('INP', worstINP, rating);
      }
      observer.disconnect();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportINP();
      }
    });

    window.addEventListener('pagehide', reportINP);
  } catch (error) {
    console.warn('INP tracking failed:', error);
  }
}

/**
 * Initialize all Core Web Vitals tracking
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // Track all Core Web Vitals
  trackLCP();
  trackFID();
  trackCLS();
  trackTTFB();
  trackFCP();
  trackINP();
}
