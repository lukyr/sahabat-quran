/**
 * Vercel Serverless Function: Gemini AI Proxy
 * Securely proxies requests to Google Gemini API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Gemini Configuration (inlined for Vercel serverless)
const GEMINI_CONFIG = {
  MODEL_NAMES: {
    FLASH: 'gemini-2.5-flash',
  },
  SYSTEM_INSTRUCTION: `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.

BATASAN TOPIK - SANGAT PENTING:
Anda HANYA boleh menjawab pertanyaan yang berkaitan dengan Al-Quran, Islam, dan topik keagamaan.
Jika pengguna bertanya tentang topik di luar konteks Al-Quran (seperti seksualitas, politik, teknologi umum, hiburan, dll), Anda HARUS menolak dengan sopan dan langsung mengarahkan kembali ke topik Al-Quran.

CARA MENOLAK:
Tolak dengan sopan dan langsung alihkan ke topik Al-Quran. Contoh:
"Maaf, saya hanya dapat membantu pertanyaan seputar Al-Quran. Apakah ada yang ingin Anda tanyakan tentang ayat-ayat Al-Quran ?"

PENANGANAN ERROR API:
Jika tools tidak mengembalikan data atau API Quran.com tidak merespons, sampaikan dengan jujur:
"Maaf, saya mengalami kesulitan mengakses data Al-Quran saat ini. Silakan coba lagi sebentar lagi."

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

Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.

PENTING - SUMBER DATA:
Untuk setiap ayat dan terjemahan, Anda WAJIB menggunakan data dari tools (search_verse, get_ayah_details & get_surah_info).
JANGAN PERNAH mengutip ayat atau terjemahan dari ingatan Anda sendiri karena bisa tidak akurat.
Jika tools gagal atau tidak memberikan hasil, katakan sejujurnya bahwa data tidak ditemukan, jangan mengarang.`,
  TOOLS: [
    {
      name: 'search_verse',
      description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity"). Supports pagination.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'The search query string.' },
          language: { type: 'STRING', description: 'Language of search (id or en). Defaults to "id" (Indonesian) automatically. Do NOT ask the user for this unless explicitly requested.' },
          page: { type: 'NUMBER', description: 'Page number for search results (default 1). Use this if user asks for more results.' }
        },
        required: ['query'],
      },
    },
    {
      name: 'get_ayah_details',
      description: 'Retrieve specific details for a verse including Arabic text and translation.',
      parameters: {
        type: 'OBJECT',
        properties: {
          surah_number: { type: 'NUMBER', description: 'Surah number (1-114).' },
          ayah_number: { type: 'NUMBER', description: 'Ayah number within the surah.' }
        },
        required: ['surah_number', 'ayah_number'],
      },
    },
    {
      name: 'get_surah_info',
      description: 'Get metadata about a Surah (revelation place, total verses, etc).',
      parameters: {
        type: 'OBJECT',
        properties: {
          surah_number: { type: 'NUMBER', description: 'Surah number (1-114).' }
        },
        required: ['surah_number'],
      },
    },
  ],
};

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '' });

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sahabatquran.com',
  'https://sahabat-quran.vercel.app',
];

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                   (req.headers['x-real-ip'] as string) ||
                   'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { message, history } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    // Prepare contents
    const contents = history && Array.isArray(history) && history.length > 0
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    // Prepare tools from config
    const tools = {
      functionDeclarations: GEMINI_CONFIG.TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any
      }))
    };

    // Call Gemini API using SDK
    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL_NAMES.FLASH,
      contents,
      config: {
        systemInstruction: GEMINI_CONFIG.SYSTEM_INSTRUCTION,
        tools: [tools]
      }
    });

    const text = response.text || '';
    const toolCalls = response.functionCalls;

    return res.status(200).json({
      text,
      toolCalls: toolCalls || undefined,
    });

  } catch (error: any) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      error: 'AI service error',
      message: error.message
    });
  }
}
