
import { Surah, Verse, SearchResult } from '../types';

const BASE_URL = 'https://api.quran.com/api/v4';

export const quranService = {
  async getSurahs(): Promise<Surah[]> {
    const response = await fetch(`${BASE_URL}/chapters?language=id`);
    const data = await response.json();
    return data.chapters;
  },

  async getSurah(id: number): Promise<Surah> {
    const response = await fetch(`${BASE_URL}/chapters/${id}?language=id`);
    const data = await response.json();
    return data.chapter;
  },

  async searchVerses(query: string, language: string = 'id', page: number = 1): Promise<SearchResult[]> {
    const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&language=${language}&page=${page}`);
    const data = await response.json();
    return data.search.results || [];
  },

  async getAyahDetails(surah: number, ayah: number, translationId: number = 33): Promise<Verse> {
    // 33 is Indonesian (Kemenag)
    const response = await fetch(`${BASE_URL}/verses/by_key/${surah}:${ayah}?translations=${translationId}&words=true`);
    const data = await response.json();
    
    const uthmaniResponse = await fetch(`${BASE_URL}/quran/verses/uthmani?verse_key=${surah}:${ayah}`);
    const uthmaniData = await uthmaniResponse.json();
    
    return {
      ...data.verse,
      text_uthmani: uthmaniData.verses[0]?.text_uthmani
    };
  }
};
