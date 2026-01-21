/**
 * Vercel Serverless Function: Gemini Image Generation Proxy
 * Securely proxies image generation requests to Google Gemini API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sahabatquran.com',
  'https://sahabat-quran.vercel.app',
];

// Rate limiting for image generation (more restrictive)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

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
    return res.status(429).json({ error: 'Too many image generation requests. Please try again later.' });
  }

  try {
    const { theme } = req.body;

    // Validate input
    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    if (theme.length > 200) {
      return res.status(400).json({ error: 'Theme description too long' });
    }

    // Prepare request to Gemini Image API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: {
            parts: [{
              text: `Create a professional and serene wallpaper background with a theme of: ${theme}.

STRICT GUIDELINES:
1. CONTENT: Must be strictly beautiful, peaceful, and inspiring. Focus on serene landscapes, morning dew, calm oceans, starry skies, or elegant abstract Islamic geometric patterns (arabesque).
2. STYLE: High-quality minimalist digital art, cinematic lighting, soft atmospheric glow. Colors: Elegant tones like deep emerald green, royal gold, soft sapphire blue, or warm dawn colors.
3. COMPOSITION: NO text in the image. NO human faces or clear human figures.`
            }]
          },
          generationConfig: {
            responseModalities: ['image'],
            imageConfig: {
              aspectRatio: '1:1'
            }
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini Image API error:', errorText);
      return res.status(geminiResponse.status).json({
        error: 'Image generation service error',
        details: geminiResponse.status === 429 ? 'Rate limit exceeded' : 'Service unavailable'
      });
    }

    const data = await geminiResponse.json();

    // Extract image data
    const candidates = data.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            return res.status(200).json({
              image: `data:image/png;base64,${part.inlineData.data}`
            });
          }
        }
      }
    }

    return res.status(500).json({ error: 'Failed to generate image' });

  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
