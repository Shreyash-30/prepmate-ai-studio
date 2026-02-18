# Environment Setup Guide - PrepMate AI Studio

## 🚀 Quick Setup (Local Development)

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_ORG/prepmate-ai-studio.git
cd prepmate-ai-studio
```

### 2. Create Environment Files from Examples
```bash
# Root environment
cp .env.example .env

# Backend environment
cp backend/.env.example backend/.env

# AI Services environment
cp ai-services/.env.example ai-services/.env
```

### 3. Fill in Your API Keys
Edit each `.env` file and add your actual API keys:

#### `.env` (Root)
```dotenv
# Get from https://aistudio.google.com/apikey
GEMINI_API_KEY=your-actual-key-here
GROQ_API_KEY=your-actual-key-here

# Generate secure JWT_SECRET:
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

#### `backend/.env`
```dotenv
GEMINI_API_KEY=your-actual-key-here
JWT_SECRET=your-secure-secret-here
MONGODB_URI=mongodb://localhost:27017/prepmate-ai-studio
```

#### `ai-services/.env`
```dotenv
GEMINI_API_KEY=your-actual-key-here
GROQ_API_KEY=your-actual-key-here
TOGETHER_API_KEY=your-actual-key-here (optional)
MONGO_URI=mongodb://localhost:27017/prepmate-ai-studio
```

### 4. Install Dependencies
```bash
# Install Node dependencies
npm install
cd backend && npm install && cd ..

# Install Python dependencies
cd ai-services
pip install -r requirements.txt
cd ..
```

### 5. Start Services
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start AI Services
cd ai-services
python main.py
# or: ./start-ai-services.sh

# Terminal 3: Start Backend
cd backend
npm start

# Terminal 4: Start Frontend
npm run dev
```

---

## 🔐 Security Best Practices

### DO ✅
1. **Always use `.env.example` as template** - never modify it with real secrets
2. **Keep `.env` in `.gitignore`** - already configured for you
3. **Use environment variables** in production (Docker, K8s, etc.)
4. **Rotate API keys regularly** - especially if ever committed
5. **Use different keys per environment** - dev, staging, prod
6. **Review `.gitignore`** before commits to ensure secrets aren't tracked

### DON'T ❌
1. **Never commit `.env` files** - they're in `.gitignore` for a reason
2. **Never hardcode secrets** in code or documentation
3. **Never share `.env` files** via email or chat
4. **Never use same credentials** across environments
5. **Never push without checking** `git status` for `.env` files

---

## 🔑 How to Get API Keys

### Google Gemini API (Primary LLM Provider)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key to `GEMINI_API_KEY`
4. **Free tier available** - 60 requests per minute

### Groq API (Fallback LLM Provider)
1. Go to [Groq Console](https://console.groq.com)
2. Sign up or log in
3. Create API key
4. Copy to `GROQ_API_KEY`
5. **Free tier available** - higher quotas than Gemini

### Together AI (Alternative Fallback)
1. Go to [Together AI](https://www.together.ai/)
2. Sign up and verify email
3. Create API key in dashboard
4. Copy to `TOGETHER_API_KEY`
5. **Free tier available** - $5 free credits

---

## 📋 Environment Variables Reference

### Required Variables
| Variable | Purpose | Get From | Example |
|----------|---------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini LLM | [AI Studio](https://aistudio.google.com/apikey) | `AIzaSy...` |
| `JWT_SECRET` | Authentication token | Generate with crypto | 64+ random chars |
| `MONGODB_URI` | Database connection | Local or MongoDB Atlas | `mongodb://localhost:27017/...` |
| `AI_SERVICE_URL` | AI service endpoint | Local or deployment | `http://localhost:8001` |

### Optional Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| `GROQ_API_KEY` | Fallback LLM provider | Optional |
| `TOGETHER_API_KEY` | Alternative fallback | Optional |
| `NODE_ENV` | Development/production | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `ENABLE_AI_SERVICES` | Feature flag | `true` |

---

## 🐳 Docker / Production Setup

### Using Environment Variables
Instead of `.env` files in Docker:

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "backend/src/index.js"]
```

```bash
# Run with environment variables
docker run \
  -e GEMINI_API_KEY=your-key \
  -e MONGODB_URI=your-uri \
  -e JWT_SECRET=your-secret \
  -e NODE_ENV=production \
  prepmate-ai-studio
```

### Using Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    ports:
      - "8000:8000"
```

```bash
# Create .env file (this one IS gitignored at deployment)
echo "GEMINI_API_KEY=your-key" > .env.production
echo "MONGODB_URI=your-uri" >> .env.production

# Run
docker-compose up
```

---

## 🔍 Troubleshooting

### "Cannot find module .env"
- Make sure you created `.env` from `.env.example`
- Run: `cp .env.example .env`

### "GEMINI_API_KEY is undefined"
- Check `.env` file exists in project root
- Verify the key is correct from [AI Studio](https://aistudio.google.com/apikey)
- Restart the service to reload environment

### "MongoDB connection failed"
- Verify MongoDB is running: `mongod`
- Check `MONGODB_URI` is correct in `.env`
- For Atlas: ensure IP whitelist includes your current IP

### ".env file is being tracked by Git!"
Run these commands:
```bash
# Remove from git (doesn't delete local file)
git rm --cached .env ai-services/.env backend/.env

# Commit the removal
git commit -m "Remove committed .env files (security fix)"

# Verify it's in .gitignore
cat .gitignore | grep "\.env"
```

---

## 📚 Additional Resources

- [OWASP Environment Variables Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App Configuration](https://12factor.net/config)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git Secrets](https://github.com/awslabs/git-secrets) - Prevent secrets from being committed

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] `.env` file created from `.env.example`
- [ ] `.env` file is NOT tracked by git (`git status` shows nothing related to .env)
- [ ] All API keys are filled in `.env` files
- [ ] Backend can connect to MongoDB (test with `npm run test`)
- [ ] AI service can start (`python main.py`)
- [ ] Frontend can reach backend (`npm run dev`)
- [ ] No `console.log()` or debugging with real credentials
- [ ] `.gitignore` includes all `.env*` patterns
