# Development Setup Guide

## 📦 Installation

### Install All Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server && pnpm install && cd ..
```

---

## 🚀 Running the Application

### Option 1: Run Frontend Only (Current Setup)

```bash
pnpm run dev
```

- Frontend: http://localhost:5173
- Uses direct Gemini API (development mode)

### Option 2: Run Frontend + Backend Together

```bash
pnpm run dev:all
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Runs both concurrently

### Option 3: Run Separately

**Terminal 1 - Frontend:**

```bash
pnpm run dev
```

**Terminal 2 - Backend:**

```bash
pnpm run dev:server
# or
cd server && pnpm run dev
```

---

## 🏗️ Building for Production

### Build Frontend Only

```bash
pnpm run build
```

### Build Backend Only

```bash
pnpm run build:server
# or
cd server && pnpm run build
```

### Build Everything

```bash
pnpm run build:all
```

---

## 🔧 Environment Variables

### Frontend (.env.local)

```bash
# Required for development
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GA_MEASUREMENT_ID=G-0GP6SWKDB2

# Optional: Backend API URL (if using separate backend)
VITE_API_URL=http://localhost:3001
```

### Backend (server/.env)

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

---

## 📁 Project Structure

```
sahabat-quran/
├── components/          # React components
├── services/           # API services
├── utils/              # Utility functions
├── constants/          # Constants & config
├── server/             # Express backend (optional)
│   ├── index.ts       # Server entry point
│   └── package.json   # Server dependencies
├── api/                # Vercel serverless functions
├── .env.local         # Frontend env (gitignored)
├── .env.example       # Env template
└── package.json       # Frontend dependencies
```

---

## 🎯 Development Modes

### Mode 1: Serverless (Vercel) - Production

```
Browser → Vercel Functions (/api/gemini) → Gemini AI
```

- Deploy to Vercel
- Serverless functions auto-deployed
- No backend server needed

### Mode 2: Express Backend - VM/Cloud

```
Browser → Express Server (localhost:3001) → Gemini AI
```

- Deploy to VPS, Railway, Cloud Run
- Traditional backend server
- More control

### Mode 3: Direct API - Development

```
Browser → Direct Gemini API
```

- Local development only
- No backend needed
- API key in .env.local

---

## 🧪 Testing

### Test Frontend

```bash
pnpm run dev
# Open http://localhost:5173
```

### Test Backend

```bash
cd server && pnpm run dev
# Test: curl http://localhost:3001/health
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Chat endpoint
curl -X POST http://localhost:3001/api/gemini \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Ayat tentang sabar"}'
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
rm -rf server/node_modules server/pnpm-lock.yaml
pnpm install
cd server && pnpm install
```

### TypeScript Errors

```bash
# Check types
pnpm run build

# Server types
cd server && pnpm run build
```

---

## 📚 Available Scripts

| Script                  | Description              |
| ----------------------- | ------------------------ |
| `pnpm run dev`          | Run frontend only        |
| `pnpm run dev:server`   | Run backend only         |
| `pnpm run dev:all`      | Run frontend + backend   |
| `pnpm run build`        | Build frontend           |
| `pnpm run build:server` | Build backend            |
| `pnpm run build:all`    | Build everything         |
| `pnpm run preview`      | Preview production build |

---

## 🚀 Deployment

See:

- [DEPLOYMENT_ALTERNATIVES.md](./DEPLOYMENT_ALTERNATIVES.md) - Deploy to VM/Cloud
- [SECURITY_SETUP.md](./SECURITY_SETUP.md) - Security guide
- [RATE_LIMIT_GUIDE.md](./RATE_LIMIT_GUIDE.md) - Handle rate limits

---

## 💡 Tips

1. **Development**: Use `pnpm run dev` (direct API, faster)
2. **Testing Backend**: Use `pnpm run dev:all` (test proxy)
3. **Production**: Deploy to Vercel (easiest) or VPS (more control)

---

**Need Help?** Check the documentation files or open an issue!
