# Changelog

All notable changes to Sahabat Quran project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-22

### 🔐 Security

#### Critical Security Fixes

- **Protected API Keys from Exposure**
  - Added `.env.local`, `.env`, `.env*.local`, and `.vercel` to `.gitignore`
  - Created `.env.example` as safe template for environment variables
  - Removed API keys from client-side bundle

- **Implemented Serverless API Proxy**
  - Created `api/gemini.ts` - Chat API proxy with rate limiting (30 req/min)
  - Created `api/gemini-image.ts` - Image generation proxy (10 req/hour)
  - Added IP-based rate limiting
  - Added CORS protection with allowed origins
  - Added input validation and sanitization

- **Enhanced Security Headers**
  - Updated `vercel.json` with security headers:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `X-XSS-Protection: 1; mode=block`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy` for camera/microphone/geolocation

### 🛡️ Reliability

#### Error Handling & Retry Logic

- **Created Centralized Error Handler** (`utils/errorHandler.ts`)
  - Error classification (NETWORK, API, VALIDATION, RATE_LIMIT, FORBIDDEN, UNKNOWN)
  - Custom `AppError` class with error types
  - Comprehensive error logging with context
  - User-friendly error messages in Indonesian

- **Created Input Validation Utilities** (`utils/validation.ts`)
  - Validate surah numbers (1-114)
  - Validate ayah numbers
  - Sanitize search queries
  - Validate language codes
  - Validate page numbers

- **Enhanced Quran Service** (`services/quranService.ts`)
  - Added `fetchWithRetry` helper with exponential backoff
  - Implemented request timeout (10 seconds)
  - Added comprehensive error handling for all API calls
  - Added input validation before API calls
  - Maximum 3 retry attempts with 2s → 4s → 8s delays

- **Enhanced Gemini Service** (`services/geminiService.ts`)
  - Refactored to use serverless proxy in production
  - Direct API in development mode for faster iteration
  - Auto-fallback to stable model (`gemini-1.5-flash`) on 403 errors
  - Better rate limit detection and handling
  - Quota exceeded vs rate limit differentiation
  - Disabled experimental image generation (not available for all API keys)

- **Created Error Boundary Component** (`components/ErrorBoundary.tsx`)
  - Catches JavaScript errors in component tree
  - Displays user-friendly fallback UI
  - Provides error details for developers
  - Recovery mechanism (retry/reload)

- **Updated Main App** (`index.tsx`)
  - Wrapped app with `ErrorBoundary` for global error handling

### ⚙️ Configuration

#### TypeScript Configuration

- **Enhanced `tsconfig.json`**
  - Added `noUncheckedIndexedAccess: true` for safer array access
  - Added `forceConsistentCasingInFileNames: true`
  - Added `exactOptionalPropertyTypes: true`
  - Fixed 4 type safety issues caught by stricter config

#### Build Configuration

- **Enhanced `vite.config.ts`**
  - Added environment variable validation
  - Implemented code splitting (`react-vendor`, `gemini-vendor`)
  - Added console removal in production
  - Configured source maps for debugging
  - Added terser minification
  - Warning if `VITE_GEMINI_API_KEY` not set

- **Added Production Dependencies**
  - `terser@5.46.0` - Code minification
  - `@vercel/node@5.5.25` - Serverless functions support

#### Constants & Configuration

- **Created `constants/index.ts`**
  - Centralized API configuration
  - Error messages in Indonesian
  - Analytics event names
  - Storage keys
  - Feature flags
  - Single source of truth for configuration

### 🔒 Privacy

#### Analytics Privacy Controls

- **Enhanced `services/analyticsService.ts`**
  - Added consent checking before tracking
  - Respect "Do Not Track" (DNT) browser header
  - IP anonymization for Google Analytics
  - LocalStorage-based consent management
  - Methods: `setConsent()`, `getConsent()`, `hasConsent()`

### 🏗️ Backend Infrastructure

#### Express.js Backend (Optional)

- **Created `server/index.ts`**
  - Express.js server for VM/Cloud deployment
  - Rate limiting (30 req/min for chat, 10 req/hour for images)
  - CORS middleware with configurable origins
  - Health check endpoint (`/health`)
  - Same functionality as Vercel serverless functions
  - Can run on VPS, Railway, Cloud Run, etc.

- **Created `server/package.json`**
  - Dependencies: express, cors, express-rate-limit, @google/genai
  - Dev dependencies: tsx, typescript, @types/\*
  - Scripts: dev, build, start

- **Created `tsconfig.server.json`**
  - TypeScript configuration for server

### 🐛 Bug Fixes

#### Type Safety Fixes

- **Fixed `components/ChatWindow.tsx`**
  - Changed analytics event from `'clear_chat'` to `'CLEAR_CHAT'` (use constant)
  - Added safe array access checks to prevent undefined errors
  - Fixed 3 TypeScript errors from stricter configuration

- **Fixed `services/quranService.ts`**
  - Added default empty string for `text_uthmani` property
  - Fixed optional property type error

- **Fixed `types.ts`**
  - Changed `text_uthmani` from optional to required (matches actual usage)

#### Error Handling Improvements

- **Better Rate Limit Handling**
  - Differentiate between per-minute and daily quota limits
  - Clear error messages for each scenario
  - Auto-retry for rate limits, immediate error for quota exceeded

- **403 Forbidden Error Handling**
  - Detect invalid or expired API keys
  - Auto-fallback to stable Gemini model
  - User-friendly error messages

- **Image Generation**
  - Disabled experimental image generation in development
  - Prevents 404 errors from unavailable models
  - User-friendly error message

### 📦 Dependencies

#### Added

- `concurrently@9.2.1` (dev) - Run multiple npm scripts
- `terser@5.46.0` (dev) - Code minification
- `@vercel/node@5.5.25` (dev) - Serverless functions

#### Server Dependencies (new)

- `express@4.22.1` - Web framework
- `cors@2.8.5` - CORS middleware
- `express-rate-limit@7.5.1` - Rate limiting
- `@google/genai@1.38.0` - Gemini AI SDK
- `tsx@4.21.0` (dev) - TypeScript runner
- `typescript@5.6.3` (dev) - TypeScript compiler
- `@types/express@4.17.25` (dev) - Express types
- `@types/cors@2.8.19` (dev) - CORS types

### 📝 Scripts

#### New Scripts in `package.json`

- `dev:server` - Run backend server only
- `dev:all` - Run frontend + backend concurrently
- `build:server` - Build backend
- `build:all` - Build frontend + backend

### 📚 Documentation

#### Created

- `DEV_SETUP.md` - Development setup guide
  - Installation instructions
  - Running modes (frontend only, backend only, both)
  - Environment variables setup
  - Project structure
  - Testing guide
  - Troubleshooting

### 🗑️ Removed

- Removed temporary documentation files (consolidated into main docs)

### 🔄 Changed

#### Development Workflow

- **Development mode** now uses direct Gemini API (faster iteration)
- **Production mode** uses serverless proxy (secure)
- Auto-detection of environment
- Fallback mechanisms for reliability

#### Error Messages

- All error messages now in Indonesian
- More specific error types
- Actionable error messages with solutions

### 📊 Build Output

#### Production Build

- **Bundle size**: 67.12 kB gzipped (optimized)
- **Code splitting**: Separate vendor chunks for React and Gemini
- **TypeScript**: All type checks passing
- **Minification**: Terser with console removal

---

## [1.0.0] - 2026-01-21

### Initial Release

- Basic Quran search and browsing functionality
- Gemini AI integration for chat
- Surah browser
- Share functionality
- Analytics integration
- Responsive design with TailwindCSS

---

## Migration Guide

### From 1.0.0 to 1.1.0

#### Required Actions

1. **Revoke Old API Key** (CRITICAL)

   ```bash
   # Go to https://aistudio.google.com/apikey
   # Revoke old key that was exposed in git
   # Generate new API key
   ```

2. **Setup Environment Variables**

   ```bash
   # Copy example
   cp .env.example .env.local

   # Edit .env.local
   VITE_GEMINI_API_KEY=your_new_api_key_here
   VITE_GA_MEASUREMENT_ID=G-0GP6SWKDB2
   ```

3. **Install New Dependencies**

   ```bash
   # Frontend
   pnpm install

   # Backend (if using)
   cd server && pnpm install
   ```

4. **Verify .gitignore**
   ```bash
   # Ensure .env.local is not tracked
   git status
   # Should NOT show .env.local
   ```

#### Optional Actions

1. **Setup Backend Server** (for VM/Cloud deployment)

   ```bash
   cd server
   pnpm install
   pnpm run dev
   ```

2. **Update Vercel Environment Variables**
   - Add `VITE_GEMINI_API_KEY` in Vercel dashboard
   - Redeploy

#### Breaking Changes

- **API Key Location**: Must be in `.env.local` (not committed)
- **Gemini Service**: Now uses proxy by default in production
- **Error Handling**: New error types, may affect custom error handling

#### Deprecations

- Direct Gemini API calls in production (use proxy instead)
- Experimental image generation (disabled, not reliable)

---

## Notes

### Security Improvements

This release focuses heavily on security, fixing a **critical vulnerability** where API keys were exposed in the client-side bundle and git history.

### Reliability Improvements

Comprehensive error handling, retry logic, and fallback mechanisms make the application much more reliable in production.

### Developer Experience

Better development workflow with separate frontend/backend, better error messages, and comprehensive documentation.

---

For detailed setup instructions, see [DEV_SETUP.md](./DEV_SETUP.md)
