
/**
 * Analytics Service untuk Sahabat Quran
 * Membantu melacak interaksi pengguna untuk meningkatkan pengalaman aplikasi.
 * Includes privacy controls and consent management.
 */

import { STORAGE_KEYS, ANALYTICS_EVENTS } from '../constants';

type EventName = keyof typeof ANALYTICS_EVENTS;

// Ganti 'G-MEASUREMENT_ID' dengan ID asli Anda jika ingin menggunakan cara statis,
// atau biarkan import.meta.env.VITE_GA_MEASUREMENT_ID jika menggunakan environment variable.
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

export const analyticsService = {
  /**
   * Menginisialisasi Google Analytics secara dinamis
   */
  init: () => {
    if (!GA_ID || GA_ID === 'G-MEASUREMENT_ID' || typeof window === 'undefined') {
      console.warn("GA_MEASUREMENT_ID belum dikonfigurasi. Tracking dinonaktifkan.");
      return;
    }

    // Respect Do Not Track
    if (isDNTEnabled()) {
      console.info("Do Not Track enabled. Analytics disabled.");
      return;
    }

    // Check consent
    if (!hasConsent()) {
      console.info("Analytics consent not given. Tracking disabled.");
      return;
    }

    // Injeksi script gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Konfigurasi dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag() {
      (window as any).dataLayer.push(arguments as any);
    }
    (window as any).gtag = gtag;

    (window as any).gtag('js', new Date());
    (window as any).gtag('config', GA_ID, {
      page_path: window.location.pathname,
      anonymize_ip: true, // Anonymize IP for privacy
    });

    console.debug("Google Analytics diinisialisasi dengan ID:", GA_ID);
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
      // Disable analytics
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
   * Mengirim event kustom ke GA4
   */
  logEvent: (name: EventName, params?: Record<string, any>) => {
    if (!hasConsent() || isDNTEnabled()) return;

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', ANALYTICS_EVENTS[name], params);
    }
  },

  /**
   * Melacak pencarian surah di sidebar
   */
  trackSurahSearch: (query: string) => {
    if (query.length > 2) {
      analyticsService.logEvent('SEARCH_SURAH', { search_term: query });
    }
  },

  /**
   * Melacak saat pengguna bertanya ke AI
   */
  trackAIChat: (message: string) => {
    analyticsService.logEvent('AI_CHAT_QUERY', {
      message_length: message.length,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Melacak pembukaan referensi Quran.com
   */
  trackViewSurah: (url: string) => {
    analyticsService.logEvent('VIEW_SURAH', {
      url: url,
      surah_id: url.split('/').pop()?.split('?')[0]
    });
  }
};
