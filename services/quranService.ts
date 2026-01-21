
import { Surah, Verse, SearchResult } from '../types';
import { API_CONFIG, ERROR_MESSAGES } from '../constants';
import {
  validateSurahNumber,
  validateAyahNumber,
  validateSearchQuery,
  validatePageNumber,
  isValidLanguage
} from '../utils/validation';
import { handleError, createTimeoutPromise, shouldRetry, logError, AppError } from '../utils/errorHandler';

/**
 * Helper untuk melakukan retry dengan exponential backoff
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<Response>,
  retries = API_CONFIG.MAX_RETRIES,
  delay = API_CONFIG.RETRY_DELAY
): Promise<T> {
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await Promise.race([
        fetchFn(),
        createTimeoutPromise(API_CONFIG.REQUEST_TIMEOUT)
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      lastError = handleError(error);
      logError(lastError, { attempt, retries });

      if (attempt < retries && shouldRetry(lastError, attempt, retries)) {
        console.warn(`Retrying in ${delay}ms... (${retries - attempt} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        break;
      }
    }
  }

  throw lastError || new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
}

export const quranService = {
  async getSurahs(): Promise<Surah[]> {
    try {
      const data = await fetchWithRetry<{ chapters: Surah[] }>(
        () => fetch(`${API_CONFIG.QURAN_BASE_URL}/chapters?language=id`)
      );
      return data.chapters || [];
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'getSurahs' });
      throw appError;
    }
  },

  async getSurah(id: number): Promise<Surah> {
    try {
      validateSurahNumber(id);

      const data = await fetchWithRetry<{ chapter: Surah }>(
        () => fetch(`${API_CONFIG.QURAN_BASE_URL}/chapters/${id}?language=id`)
      );
      return data.chapter;
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'getSurah', id });
      throw appError;
    }
  },

  async searchVerses(query: string, language: string = 'id', page: number = 1): Promise<SearchResult[]> {
    try {
      const sanitizedQuery = validateSearchQuery(query);
      validatePageNumber(page);

      const lang = isValidLanguage(language) ? language : 'id';

      const data = await fetchWithRetry<{ search: { results: SearchResult[] } }>(
        () => fetch(`${API_CONFIG.QURAN_BASE_URL}/search?q=${encodeURIComponent(sanitizedQuery)}&language=${lang}&page=${page}`)
      );
      return data.search?.results || [];
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'searchVerses', query, language, page });
      throw appError;
    }
  },

  async getAyahDetails(surah: number, ayah: number, translationId: number = 33): Promise<Verse> {
    try {
      validateSurahNumber(surah);
      validateAyahNumber(ayah);

      // Fetch verse with translation
      const verseData = await fetchWithRetry<{ verse: Verse }>(
        () => fetch(`${API_CONFIG.QURAN_BASE_URL}/verses/by_key/${surah}:${ayah}?translations=${translationId}&words=true`)
      );

      // Fetch Uthmani text
      const uthmaniData = await fetchWithRetry<{ verses: Array<{ text_uthmani: string }> }>(
        () => fetch(`${API_CONFIG.QURAN_BASE_URL}/quran/verses/uthmani?verse_key=${surah}:${ayah}`)
      );

      return {
        ...verseData.verse,
        text_uthmani: uthmaniData.verses[0]?.text_uthmani ?? ''
      };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'getAyahDetails', surah, ayah, translationId });
      throw appError;
    }
  }
};
