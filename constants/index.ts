/**
 * Application Constants
 * Centralized configuration values and magic strings
 */

// API Configuration
export const API_CONFIG = {
  QURAN_BASE_URL: 'https://api.quran.com/api/v4',
  GEMINI_PROXY_URL: '/api/gemini',
  GEMINI_IMAGE_PROXY_URL: '/api/gemini-image',
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
} as const;

// Quran Configuration
export const QURAN_CONFIG = {
  TOTAL_SURAHS: 114,
  DEFAULT_TRANSLATION_ID: 33, // Indonesian (Kemenag)
  SUPPORTED_LANGUAGES: ['id', 'en'] as const,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  API_ERROR: 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.',
  RATE_LIMIT: 'Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.',
  QUOTA_EXCEEDED: 'Quota API harian telah habis. Silakan coba lagi besok atau upgrade plan Anda.',
  INVALID_SURAH: 'Nomor surah tidak valid. Harus antara 1-114.',
  INVALID_AYAH: 'Nomor ayat tidak valid.',
  GEMINI_ERROR: 'Terjadi kesalahan pada AI. Silakan coba lagi.',
  IMAGE_GENERATION_ERROR: 'Gagal menghasilkan gambar. Silakan coba lagi.',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui.',
} as const;

// Analytics Events
export const ANALYTICS_EVENTS = {
  AI_CHAT_QUERY: 'ai_chat_query',
  CLEAR_CHAT: 'clear_chat',
  SEARCH_SURAH: 'search_surah',
  VIEW_SURAH: 'view_surah',
  MODAL_OPEN: 'modal_open',
  SHARE_VERSE: 'share_verse',
  GENERATE_IMAGE: 'generate_image',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ANALYTICS_CONSENT: 'sahabat_quran_analytics_consent',
  CHAT_HISTORY: 'sahabat_quran_chat_history',
} as const;

// Feature Flags
export const FEATURES = {
  ANALYTICS_ENABLED: true,
  IMAGE_GENERATION_ENABLED: true,
  SHARE_ENABLED: true,
} as const;
