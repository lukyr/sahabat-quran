/**
 * Vercel Serverless Function: Gemini AI Proxy
 * Securely proxies requests to Google Gemini API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
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

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key
  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
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

    // Prepare request to Gemini API
    const contents = history && Array.isArray(history) && history.length > 0
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{
              text: `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.

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

Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.`
            }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: 'search_verse',
                description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity"). Supports pagination.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'The search query string.' },
                    language: { type: 'string', description: 'Language of search (id or en). Default id.' },
                    page: { type: 'number', description: 'Page number for search results (default 1). Use this if user asks for more results.' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'get_ayah_details',
                description: 'Retrieve specific details for a verse including Arabic text and translation.',
                parameters: {
                  type: 'object',
                  properties: {
                    surah_number: { type: 'number', description: 'Surah number (1-114).' },
                    ayah_number: { type: 'number', description: 'Ayah number within the surah.' }
                  },
                  required: ['surah_number', 'ayah_number']
                }
              },
              {
                name: 'get_surah_info',
                description: 'Get metadata about a Surah (revelation place, total verses, etc).',
                parameters: {
                  type: 'object',
                  properties: {
                    surah_number: { type: 'number', description: 'Surah number (1-114).' }
                  },
                  required: ['surah_number']
                }
              }
            ]
          }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return res.status(geminiResponse.status).json({
        error: 'AI service error',
        details: geminiResponse.status === 429 ? 'Rate limit exceeded' : 'Service unavailable'
      });
    }

    const data = await geminiResponse.json();

    // Extract response
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const functionCalls = candidate?.content?.parts
      ?.filter((part: any) => part.functionCall)
      .map((part: any) => part.functionCall);

    return res.status(200).json({
      text,
      toolCalls: functionCalls || undefined,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
