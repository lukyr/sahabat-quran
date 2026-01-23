
/**
 * Analytics Service untuk Sahabat Quran - Enhanced GA4 Implementation
 * Comprehensive tracking following Google Analytics 4 best practices
 * Includes privacy controls, consent management, and SEO metrics
 */

import { STORAGE_KEYS, ANALYTICS_EVENTS, ERROR_TYPES, USER_PROPERTIES, SESSION_PROPERTIES } from '../constants';

type EventName = keyof typeof ANALYTICS_EVENTS;
type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-MEASUREMENT_ID';

/**
 * Check if user has given analytics consent
 */
function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const consent = localStorage.getItem(STORAGE_KEYS.ANALYTICS_CONSENT);
  return consent === 'true';
}

/**
 * Check Do Not Track header
 */
function isDNTEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.doNotTrack === '1' ||
         (window as any).doNotTrack === '1' ||
         (navigator as any).msDoNotTrack === '1';
}

/**
 * Get device category
 */
function getDeviceCategory(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get connection type based on Network Information API
 */
function getConnectionType(): 'slow' | 'fast' {
  if (typeof navigator === 'undefined') return 'fast';
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return 'fast';

  const effectiveType = connection.effectiveType;
  return (effectiveType === 'slow-2g' || effectiveType === '2g') ? 'slow' : 'fast';
}

/**
 * Track user lifecycle (first visit, returning visit)
 */
function trackUserLifecycle() {
  if (typeof window === 'undefined') return;

  const firstVisit = localStorage.getItem(STORAGE_KEYS.FIRST_VISIT_TIME);
  const lastVisit = localStorage.getItem(STORAGE_KEYS.LAST_VISIT_TIME);
  const visitCount = parseInt(localStorage.getItem(STORAGE_KEYS.VISIT_COUNT) || '0');
  const now = Date.now();

  if (!firstVisit) {
    // First time visitor
    localStorage.setItem(STORAGE_KEYS.FIRST_VISIT_TIME, now.toString());
    localStorage.setItem(STORAGE_KEYS.VISIT_COUNT, '1');
    localStorage.setItem(STORAGE_KEYS.LAST_VISIT_TIME, now.toString());

    analyticsService.logEvent('FIRST_VISIT', {
      timestamp: new Date(now).toISOString(),
      device_category: getDeviceCategory(),
      connection_type: getConnectionType(),
    });

    analyticsService.setUserProperty(USER_PROPERTIES.USER_TYPE, 'new');
  } else {
    // Returning visitor
    const daysSinceFirst = Math.floor((now - parseInt(firstVisit)) / (1000 * 60 * 60 * 24));
    const daysSinceLast = lastVisit ? Math.floor((now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24)) : 0;

    localStorage.setItem(STORAGE_KEYS.VISIT_COUNT, (visitCount + 1).toString());
    localStorage.setItem(STORAGE_KEYS.LAST_VISIT_TIME, now.toString());

    analyticsService.logEvent('RETURN_VISIT', {
      visit_count: visitCount + 1,
      days_since_first_visit: daysSinceFirst,
      days_since_last_visit: daysSinceLast,
      device_category: getDeviceCategory(),
    });

    const userType = visitCount >= 5 ? 'engaged' : 'returning';
    analyticsService.setUserProperty(USER_PROPERTIES.USER_TYPE, userType);
    analyticsService.setUserProperty(USER_PROPERTIES.TOTAL_VISITS, visitCount + 1);
    analyticsService.setUserProperty(USER_PROPERTIES.DAYS_SINCE_FIRST_VISIT, daysSinceFirst);
  }
}

/**
 * Track session engagement
 */
let sessionStartTime: number | null = null;
let interactionCount = 0;

function trackSessionEngagement() {
  if (!sessionStartTime) {
    sessionStartTime = Date.now();
    localStorage.setItem(STORAGE_KEYS.SESSION_START_TIME, sessionStartTime.toString());
  }

  interactionCount++;

  const engagementTime = Math.floor((Date.now() - sessionStartTime) / 1000);

  // Track engaged session after 10 seconds with at least 2 interactions
  if (engagementTime >= 10 && interactionCount >= 2) {
    analyticsService.logEvent('SESSION_ENGAGED', {
      engagement_time: engagementTime,
      interactions: interactionCount,
      device_category: getDeviceCategory(),
    });
  }
}

export const analyticsService = {
  /**
   * Initialize Google Analytics with enhanced configuration
   */
  init: () => {
    if (!GA_ID || GA_ID === 'G-MEASUREMENT_ID' || typeof window === 'undefined') {
      console.warn("GA_MEASUREMENT_ID belum dikonfigurasi. Tracking dinonaktifkan.");
      return;
    }

    if (isDNTEnabled()) {
      console.info("Do Not Track enabled. Analytics disabled.");
      return;
    }

    if (!hasConsent()) {
      console.info("Analytics consent not given. Tracking disabled.");
      return;
    }

    // Inject gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Configure dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag() {
      (window as any).dataLayer.push(arguments as any);
    }
    (window as any).gtag = gtag;

    (window as any).gtag('js', new Date());

    // Enhanced configuration
    (window as any).gtag('config', GA_ID, {
      page_path: window.location.pathname,
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
      send_page_view: true,
      // Custom dimensions
      custom_map: {
        dimension1: USER_PROPERTIES.USER_TYPE,
        dimension2: USER_PROPERTIES.PWA_USER,
        dimension3: SESSION_PROPERTIES.DEVICE_CATEGORY,
        dimension4: SESSION_PROPERTIES.CONNECTION_TYPE,
      }
    });

    // Set initial user properties
    analyticsService.setUserProperty(USER_PROPERTIES.CONSENT_STATUS, 'granted');
    analyticsService.setUserProperty(USER_PROPERTIES.PWA_USER, (window.matchMedia('(display-mode: standalone)').matches) ? 'yes' : 'no');

    // Track user lifecycle
    trackUserLifecycle();

    // Initialize scroll depth tracking
    analyticsService.initScrollDepthTracking();

    // Initialize performance tracking
    analyticsService.trackPageLoadTime();

    console.debug("Google Analytics initialized with ID:", GA_ID);
  },

  /**
   * Set user consent for analytics
   */
  setConsent: (consent: boolean) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEYS.ANALYTICS_CONSENT, consent.toString());

    if (consent) {
      analyticsService.init();
    } else {
      if ((window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'denied'
        });
      }
    }
  },

  /**
   * Get current consent status
   */
  getConsent: (): boolean => {
    return hasConsent();
  },

  /**
   * Set user property (custom dimension)
   */
  setUserProperty: (property: string, value: string | number) => {
    if (!hasConsent() || isDNTEnabled()) return;

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('set', 'user_properties', {
        [property]: value
      });
    }
  },

  /**
   * Send custom event to GA4
   */
  logEvent: (name: EventName, params?: Record<string, any>) => {
    if (!hasConsent() || isDNTEnabled()) return;

    if (typeof window !== 'undefined' && (window as any).gtag) {
      const eventParams = {
        ...params,
        timestamp: new Date().toISOString(),
      };

      (window as any).gtag('event', ANALYTICS_EVENTS[name], eventParams);

      // Track session engagement on each event
      trackSessionEngagement();
    }
  },

  // ===== Content Discovery Events =====

  /**
   * Track surah search in sidebar
   */
  trackSurahSearch: (query: string) => {
    if (query.length > 2) {
      analyticsService.logEvent('SEARCH_SURAH', {
        search_term: query,
        search_type: 'surah_browser'
      });

      // GA4 recommended event
      analyticsService.logEvent('SEARCH', {
        search_term: query,
      });
    }
  },

  /**
   * Track surah selection from browser
   */
  trackSurahSelection: (surahNumber: number, surahName: string) => {
    analyticsService.logEvent('BROWSE_SURAH', {
      surah_number: surahNumber,
      surah_name: surahName,
    });

    // GA4 recommended event
    analyticsService.logEvent('SELECT_CONTENT', {
      content_type: 'surah',
      item_id: surahNumber.toString(),
    });
  },

  /**
   * Track viewing surah on Quran.com
   */
  trackViewSurah: (url: string) => {
    const surahId = url.split('/').pop()?.split('?')[0];
    analyticsService.logEvent('VIEW_SURAH', {
      url: url,
      surah_id: surahId
    });

    // GA4 recommended event
    analyticsService.logEvent('VIEW_ITEM', {
      item_id: surahId,
      item_name: `Surah ${surahId}`,
      content_type: 'surah',
    });
  },

  /**
   * Track external link clicks
   */
  trackExternalLink: (url: string, linkText?: string) => {
    analyticsService.logEvent('EXTERNAL_LINK_CLICK', {
      url: url,
      link_text: linkText || 'unknown',
      destination: new URL(url).hostname,
    });
  },

  // ===== AI Chat Events =====

  /**
   * Track AI chat query
   */
  trackAIChat: (message: string) => {
    analyticsService.logEvent('AI_CHAT_QUERY', {
      message_length: message.length,
      query_preview: message.substring(0, 50), // First 50 chars for context
    });
  },

  /**
   * Track successful AI response
   */
  trackAISuccess: (responseTime: number, toolsUsed: string[]) => {
    analyticsService.logEvent('AI_QUERY_SUCCESS', {
      response_time: responseTime,
      tools_used: toolsUsed.join(','),
      tool_count: toolsUsed.length,
    });
  },

  /**
   * Track AI error
   */
  trackAIError: (errorType: ErrorType, errorMessage: string) => {
    analyticsService.logEvent('AI_QUERY_ERROR', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100),
    });

    analyticsService.trackError(errorType, errorMessage, 'ai_chat');
  },

  // ===== Verse Interaction Events =====

  /**
   * Track verse zoom/enlarge
   */
  trackVerseZoom: (surah: string, ayah: string) => {
    analyticsService.logEvent('VERSE_ZOOM', {
      surah: surah,
      ayah: ayah,
      verse_reference: `${surah}:${ayah}`,
    });

    analyticsService.logEvent('VERSE_INTERACTION', {
      action: 'zoom',
      surah: surah,
      ayah: ayah,
    });
  },

  /**
   * Track verse zoom close
   */
  trackVerseZoomClose: (surah: string, ayah: string, duration: number) => {
    analyticsService.logEvent('VERSE_ZOOM_CLOSE', {
      surah: surah,
      ayah: ayah,
      reading_time: duration,
    });

    analyticsService.logEvent('READING_TIME', {
      surah: surah,
      ayah: ayah,
      duration: duration,
    });
  },

  // ===== Share & Social Events =====

  /**
   * Track share attempt
   */
  trackShareAttempt: (surah: string, ayah: string, reference: string) => {
    analyticsService.logEvent('SHARE_VERSE', {
      surah: surah,
      ayah: ayah,
      reference: reference,
    });
  },

  /**
   * Track successful share
   */
  trackShareSuccess: (method: 'native' | 'download', surah: string, ayah: string) => {
    analyticsService.logEvent('VERSE_SHARE_SUCCESS', {
      share_method: method,
      surah: surah,
      ayah: ayah,
      verse_reference: `${surah}:${ayah}`,
    });

    // GA4 recommended event
    analyticsService.logEvent('SHARE', {
      method: method,
      content_type: 'verse',
      item_id: `${surah}:${ayah}`,
    });
  },

  /**
   * Track share failure
   */
  trackShareFailed: (errorReason: string) => {
    analyticsService.logEvent('VERSE_SHARE_FAILED', {
      error_reason: errorReason,
    });
  },

  /**
   * Track image generation
   */
  trackImageGeneration: (generationTime: number, surah: string, ayah: string) => {
    analyticsService.logEvent('IMAGE_GENERATED', {
      generation_time: generationTime,
      surah: surah,
      ayah: ayah,
    });
  },

  /**
   * Track image download
   */
  trackImageDownload: (surah: string, ayah: string) => {
    analyticsService.logEvent('IMAGE_DOWNLOAD', {
      surah: surah,
      ayah: ayah,
    });
  },

  // ===== PWA Events =====

  /**
   * Track PWA prompt shown
   */
  trackPWAPromptShown: (platform: string) => {
    analyticsService.logEvent('PWA_PROMPT_SHOWN', {
      platform: platform,
    });
  },

  /**
   * Track PWA prompt accepted
   */
  trackPWAPromptAccepted: (platform: string) => {
    analyticsService.logEvent('PWA_PROMPT_ACCEPTED', {
      platform: platform,
    });
  },

  /**
   * Track PWA prompt dismissed
   */
  trackPWAPromptDismissed: (platform: string) => {
    analyticsService.logEvent('PWA_PROMPT_DISMISSED', {
      platform: platform,
    });
  },

  /**
   * Track PWA installation (KEY CONVERSION)
   */
  trackPWAInstalled: (platform: string, installSource: string) => {
    analyticsService.logEvent('PWA_INSTALLED', {
      platform: platform,
      install_source: installSource,
    });

    analyticsService.setUserProperty(USER_PROPERTIES.PWA_USER, 'yes');
  },

  /**
   * Track iOS PWA instructions shown
   */
  trackIOSInstructionsShown: () => {
    analyticsService.logEvent('PWA_IOS_INSTRUCTIONS_SHOWN', {
      platform: 'ios',
    });
  },

  // ===== Error Tracking =====

  /**
   * Track errors
   */
  trackError: (errorType: ErrorType, errorMessage: string, context?: string) => {
    analyticsService.logEvent('ERROR_OCCURRED', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 150),
      context: context || 'unknown',
      page_path: window.location.pathname,
    });
  },

  /**
   * Track API errors
   */
  trackAPIError: (endpoint: string, statusCode: number, errorMessage: string) => {
    analyticsService.logEvent('API_ERROR', {
      endpoint: endpoint,
      status_code: statusCode,
      error_message: errorMessage.substring(0, 100),
    });

    analyticsService.trackError(ERROR_TYPES.API_ERROR, `${endpoint}: ${errorMessage}`, 'api');
  },

  /**
   * Track network errors
   */
  trackNetworkError: (errorMessage: string) => {
    analyticsService.logEvent('NETWORK_ERROR', {
      error_message: errorMessage.substring(0, 100),
      connection_type: getConnectionType(),
    });

    analyticsService.trackError(ERROR_TYPES.NETWORK_ERROR, errorMessage, 'network');
  },

  // ===== Performance & SEO =====

  /**
   * Track page load time
   */
  trackPageLoadTime: () => {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const domInteractiveTime = perfData.domInteractive - perfData.navigationStart;

        analyticsService.logEvent('PAGE_LOAD_TIME', {
          page_load_time: pageLoadTime,
          dom_interactive_time: domInteractiveTime,
          dns_time: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp_time: perfData.connectEnd - perfData.connectStart,
          server_response_time: perfData.responseEnd - perfData.requestStart,
        });
      }, 0);
    });
  },

  /**
   * Track Core Web Vitals
   */
  trackWebVitals: (metricName: string, value: number, rating: 'good' | 'needs_improvement' | 'poor') => {
    analyticsService.logEvent('WEB_VITALS', {
      metric_name: metricName,
      metric_value: Math.round(value),
      metric_rating: rating,
    });
  },

  /**
   * Initialize scroll depth tracking
   */
  initScrollDepthTracking: () => {
    if (typeof window === 'undefined') return;

    const scrollDepths = [25, 50, 75, 100];
    const triggered: Record<number, boolean> = {};

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      scrollDepths.forEach(depth => {
        if (scrollPercent >= depth && !triggered[depth]) {
          triggered[depth] = true;
          analyticsService.logEvent('SCROLL_DEPTH', {
            percent: depth,
            page_type: 'main',
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  },
};
