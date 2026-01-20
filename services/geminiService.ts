
import { GoogleGenAI, Type } from "@google/genai";
import { quranService } from "./quranService";

// Inisialisasi AI menggunakan API_KEY dari environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

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

/**
 * Helper untuk melakukan retry jika terkena Rate Limit (429)
 */
async function apiCallWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429;
    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiCallWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

export const geminiService = {
  async chat(message: string, history: any[] = []): Promise<{ text: string, toolCalls?: any[] }> {
    const contents = history.length > 0 
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const response = await apiCallWithRetry(() => ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: contents,
      config: {
        systemInstruction: `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.
        
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
        
        Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.`,
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
  },

  async generateVerseImage(theme: string): Promise<string> {
    const response = await apiCallWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `Create a professional and serene wallpaper background with a theme of: ${theme}. 

          STRICT GUIDELINES:
          1. CONTENT: Must be strictly beautiful, peaceful, and inspiring. Focus on serene landscapes, morning dew, calm oceans, starry skies, or elegant abstract Islamic geometric patterns (arabesque).
          2. STYLE: High-quality minimalist digital art, cinematic lighting, soft atmospheric glow. Colors: Elegant tones like deep emerald green, royal gold, soft sapphire blue, or warm dawn colors.
          3. COMPOSITION: NO text in the image. NO human faces or clear human figures.`
        }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    }));

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }
    
    throw new Error("Gagal menghasilkan gambar.");
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
      console.error("Tool execution failed", error);
      return { error: "Terjadi kesalahan saat menghubungi API Quran.com." };
    }
  }
};
