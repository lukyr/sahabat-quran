/**
 * Gemini Service - Client-side wrapper for Gemini AI
 * Uses serverless proxy in production, direct API in development
 */

import { GoogleGenAI, Type } from "@google/genai";
import { API_CONFIG, ERROR_MESSAGES } from '../constants';
import { handleError, logError } from '../utils/errorHandler';
import { quranService } from './quranService';

// Check if running in development mode with API key
const isDevelopment = import.meta.env.DEV;
const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
const useDirectAPI = isDevelopment && hasApiKey;

// Initialize AI for development mode
const ai = useDirectAPI ? new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" }) : null;

// Tool definitions for direct API
const searchVerseTool = {
  name: 'search_verse',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity"). Supports pagination.',
    properties: {
      query: { type: Type.STRING, description: 'The search query string.' },
      language: { type: Type.STRING, description: 'Language of search (id or en). Default id.' },
      page: { type: Type.NUMBER, description: 'Page number for search results (default 1). Use this if user asks for more results.' }
    },
    required: ['query'],
  },
};

const getAyahDetailsTool = {
  name: 'get_ayah_details',
  parameters: {
    type: Type.OBJECT,
    description: 'Retrieve specific details for a verse including Arabic text and translation.',
    properties: {
      surah_number: { type: Type.NUMBER, description: 'Surah number (1-114).' },
      ayah_number: { type: Type.NUMBER, description: 'Ayah number within the surah.' }
    },
    required: ['surah_number', 'ayah_number'],
  },
};

const getSurahInfoTool = {
  name: 'get_surah_info',
  parameters: {
    type: Type.OBJECT,
    description: 'Get metadata about a Surah (revelation place, total verses, etc).',
    properties: {
      surah_number: { type: Type.NUMBER, description: 'Surah number (1-114).' }
    },
    required: ['surah_number'],
  },
};

const systemInstruction = `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.

PENTING: JANGAN PERNAH memberikan tag HTML.
Format jawaban Anda harus bersih menggunakan Markdown standar:
1. Judul Ayat: Gunakan header "### Nama Surah (Nomor Surah): Nomor Ayat" di baris paling atas sebelum teks Arab.
2. Teks Arab: Tuliskan apa adanya (Uthmani).
3. Terjemahan: Gunakan format "**Terjemahan:** [Isi Terjemahan]"
4. Gunakan garis pemisah "---" di antara ayat yang berbeda.

PERATURAN LINK:
Setiap ayat WAJIB memiliki link referensi di baris baru.
FORMAT LINK: Tuliskan URL mentah saja tanpa tanda kurung atau format markdown [teks](url).
CONTOH LINK: https://quran.com/id/1:1?translations=33

Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.`;

/**
 * Helper untuk melakukan retry jika terkena Rate Limit (429)
 */
async function apiCallWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') ||
                        error?.status === 429 ||
                        error?.message?.includes('quota') ||
                        error?.message?.includes('RATE_LIMIT');

    if (isRateLimit) {
      // Check if it's quota exceeded (daily limit)
      const isQuotaExceeded = error?.message?.includes('quota') ||
                              error?.message?.includes('exceeded your current quota');

      if (isQuotaExceeded) {
        throw new Error('QUOTA_EXCEEDED: Gemini API daily quota exceeded. Please try again tomorrow or upgrade your plan.');
      }

      // Regular rate limit - retry
      if (retries > 0) {
        console.warn(`⚠️ Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiCallWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
      }

      throw new Error('RATE_LIMIT: Too many requests. Please wait a moment and try again.');
    }

    throw error;
  }
}

export const geminiService = {
  async chat(message: string, history: any[] = []): Promise<{ text: string, toolCalls?: any[] }> {
    try {
      // Use direct API in development mode
      if (useDirectAPI && ai) {
        console.log('🔧 Development mode: Using direct Gemini API');

        const contents = history.length > 0
          ? [...history, { role: 'user', parts: [{ text: message }] }]
          : [{ role: 'user', parts: [{ text: message }] }];

        // Try with flash model first, fallback to stable if needed
        let model = 'gemini-2.0-flash-exp';

        try {
          const response = await apiCallWithRetry(() => ai.models.generateContent({
            model,
            contents: contents,
            config: {
              systemInstruction,
              tools: [{
                functionDeclarations: [
                  searchVerseTool,
                  getAyahDetailsTool,
                  getSurahInfoTool
                ]
              }],
            },
          }));

          return {
            text: response.text || '',
            toolCalls: response.functionCalls
          };
        } catch (error: any) {
          // If 403, try with stable model
          if (error?.message?.includes('403') || error?.status === 403) {
            console.warn('⚠️ Flash model failed (403), trying stable model...');
            model = 'gemini-1.5-flash';

            const response = await apiCallWithRetry(() => ai.models.generateContent({
              model,
              contents: contents,
              config: {
                systemInstruction,
                tools: [{
                  functionDeclarations: [
                    searchVerseTool,
                    getAyahDetailsTool,
                    getSurahInfoTool
                  ]
                }],
              },
            }));

            return {
              text: response.text || '',
              toolCalls: response.functionCalls
            };
          }

          throw error;
        }
      }

      // Use proxy endpoint in production
      console.log('🚀 Production mode: Using serverless proxy');
      const response = await apiCallWithRetry(async () => {
        const res = await fetch(API_CONFIG.GEMINI_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            history,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
      });

      return {
        text: response.text || '',
        toolCalls: response.toolCalls
      };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'chat', messageLength: message.length });
      throw new Error(ERROR_MESSAGES.GEMINI_ERROR);
    }
  },

  async generateVerseImage(theme: string): Promise<string> {
    try {
      // Use direct API in development mode
      if (useDirectAPI && ai) {
        console.log('🔧 Development mode: Using direct Gemini Image API');

        // Note: Image generation might not be available in all regions/plans
        // Return a placeholder or skip image generation
        console.warn('⚠️ Image generation is experimental and may not work with all API keys');

        // For now, return a placeholder message
        throw new Error('Image generation is currently unavailable. This feature requires special API access.');
      }

      // Use proxy endpoint in production
      console.log('🚀 Production mode: Using serverless image proxy');
      const response = await apiCallWithRetry(async () => {
        const res = await fetch(API_CONFIG.GEMINI_IMAGE_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
      });

      if (response.image) {
        return response.image;
      }

      throw new Error(ERROR_MESSAGES.IMAGE_GENERATION_ERROR);
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'generateVerseImage', theme });

      // Return user-friendly error instead of throwing
      console.error('Image generation failed:', appError.message);
      throw new Error('Fitur generate gambar sementara tidak tersedia. Silakan coba lagi nanti.');
    }
  },

  async executeTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'search_verse':
          const searchData = await quranService.searchVerses(args.query, args.language || 'id', args.page || 1);
          if (!searchData || searchData.length === 0) return { message: "Tidak ada ayat yang ditemukan." };
          return searchData;
        case 'get_ayah_details':
          return await quranService.getAyahDetails(args.surah_number, args.ayah_number);
        case 'get_surah_info':
          return await quranService.getSurah(args.surah_number);
        default:
          throw new Error(`Tool ${name} not found`);
      }
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'executeTool', toolName: name, args });
      return { error: "Terjadi kesalahan saat menghubungi API Quran.com." };
    }
  }
};
