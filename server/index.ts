/**
 * Express Backend for Gemini API Proxy
 * Use this for deployment to VM, Cloud Run, or traditional hosting
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many requests. Please try again later.' }
});

const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: { error: 'Too many image generation requests. Please try again later.' }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/gemini', chatLimiter, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const contents = history && Array.isArray(history) && history.length > 0
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents,
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
            {
              name: 'search_verse',
              description: 'Search for Quranic verses based on keywords',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'The search query string.' },
                  language: { type: 'string', description: 'Language of search (id or en).' },
                  page: { type: 'number', description: 'Page number for search results.' }
                },
                required: ['query']
              }
            },
            {
              name: 'get_ayah_details',
              description: 'Retrieve specific details for a verse',
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
              description: 'Get metadata about a Surah',
              parameters: {
                type: 'object',
                properties: {
                  surah_number: { type: 'number', description: 'Surah number (1-114).' }
                },
                required: ['surah_number']
              }
            }
          ]
        }]
      }
    });

    const text = response.text || '';
    const toolCalls = response.functionCalls;

    res.json({ text, toolCalls });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: 'AI service error',
      message: error.message
    });
  }
});

// Image generation endpoint
app.post('/api/gemini-image', imageLimiter, async (req, res) => {
  try {
    const { theme } = req.body;

    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    if (theme.length > 200) {
      return res.status(400).json({ error: 'Theme description too long' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image',
      contents: {
        parts: [{
          text: `Create a professional and serene wallpaper background with a theme of: ${theme}.

STRICT GUIDELINES:
1. CONTENT: Must be strictly beautiful, peaceful, and inspiring.
2. STYLE: High-quality minimalist digital art, cinematic lighting.
3. COMPOSITION: NO text in the image. NO human faces.`
        }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            return res.json({
              image: `data:image/png;base64,${part.inlineData.data}`
            });
          }
        }
      }
    }

    res.status(500).json({ error: 'Failed to generate image' });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: 'Image generation service error',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gemini Proxy Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
