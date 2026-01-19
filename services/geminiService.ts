
import { GoogleGenAI, Type } from "@google/genai";
import { quranService } from "./quranService";

// Initialize AI helper
const createAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const searchVerseTool = {
  name: 'search_verse',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity").',
    properties: {
      query: { type: Type.STRING, description: 'The search query string.' },
      language: { type: Type.STRING, description: 'Language of search (id or en). Default id.' }
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

export const geminiService = {
  async chat(message: string, history: any[] = []): Promise<{ text: string, toolCalls?: any[] }> {
    const ai = createAI();
    
    // Build contents without mutating the original history array
    const contents = history.length > 0 
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: `Anda adalah Quran MCP Assistant. Tugas Anda adalah membantu pengguna mengeksplorasi Al-Quran menggunakan data terverifikasi dari Quran.com API.
        
        ATURAN UTAMA:
        1. Gunakan Bahasa Indonesia sepenuhnya.
        2. Jangan pernah berhalusinasi. Jika alat (tools) tidak mengembalikan data, katakan bahwa data tidak ditemukan.
        3. Setiap kali menyebutkan ayat, sertakan teks Arab (uthmani) dan terjemahan resmi yang didapat dari alat.
        4. Berikan tautan Quran.com/id untuk setiap ayat: https://quran.com/id/[surah]:[ayah]?translations=33
        5. Tampilkan hasil pencarian dalam bentuk list yang rapi jika ada banyak hasil.
        6. Fokus pada keakuratan nomor ayat dan surat.`,
        tools: [{ 
          functionDeclarations: [
            searchVerseTool, 
            getAyahDetailsTool, 
            getSurahInfoTool
          ] 
        }],
      },
    });

    return {
      text: response.text || '',
      toolCalls: response.functionCalls
    };
  },

  async executeTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'search_verse':
          const searchData = await quranService.searchVerses(args.query, args.language || 'id');
          // If no results, return a clear message to the model
          if (!searchData || searchData.length === 0) return { message: "Tidak ada ayat yang ditemukan untuk kata kunci ini." };
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
