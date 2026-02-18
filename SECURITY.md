# Security Guidelines - CRITICAL

## 🚨 URGENT: Exposed API Keys in Git History

Your repository currently contains exposed API keys in the git history:
- **GEMINI_API_KEY** (Google)
- **GROQ_API_KEY** (Fallback LLM provider)
- **MONGODB_URI** (Database connection string)
- **JWT_SECRET** (Authentication secret)

### ⚠️ IMMEDIATE ACTIONS REQUIRED

#### 1. **Rotate All Exposed Credentials** (DO THIS FIRST)
- [ ] Go to [Google AI Studio](https://aistudio.google.com/apikey) and regenerate API keys
- [ ] Go to [Groq Console](https://console.groq.com) and regenerate API keys
- [ ] Regenerate JWT_SECRET with a strong random string
- [ ] If using MongoDB Atlas, reset database access credentials

#### 2. **Remove Secrets from Git History**

The .env files are currently in your git history. Use one of these methods:

**Option A: Using git filter-branch (Comprehensive)**
```bash
cd c:\Projects\prepmate-ai-studio

# Remove .env files from all history
git filter-branch --tree-filter 'rm -f .env ai-services/.env backend/.env' --prune-empty -f -- --all

# Remove reflog entries
git reflog expire --expire=now --all
git gc --prune=now

# Force push (CAREFUL: This rewrites history)
git push --force --all
git push --force --tags
```

**Option B: Using BFG Repo-Cleaner (Faster)**
```bash
# Install BFG (if not installed)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Delete .env files from history
bfg --delete-files .env --delete-files-regex "\.env$" --no-blob-protection

# Clean and push
git reflog expire --expire=now --all
git gc --prune=now
git push --force --all
```

**Option C: Create a Fresh Repository (Nuclear Option)**
If Option A/B causes issues:
```bash
# Create new repo
git clone --bare https://github.com/YOUR_ORG/prepmate-ai-studio.git prepmate-ai-studio-clean.git

# Mirror-push with security focus
git -C prepmate-ai-studio-clean.git push --mirror https://github.com/YOUR_ORG/prepmate-ai-studio.git
```

#### 3. **Verify Secrets Are Removed**
```bash
# Search for API keys in history (examples)
git log -p --all | grep -i "AIzaSy"
git log -p --all | grep -i "gsk_"
git log -p --all | grep -i "GEMINI_API_KEY"
```

---

## 📋 Environment Setup - Proper Way

### Before Cloning Repository
1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in actual values from secure credential storage

### Step-by-Step Setup

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..
cd ai-services && pip install -r requirements.txt && cd ..

# 2. Create environment files from examples
cp .env.example .env
cp backend/.env.example backend/.env
cp ai-services/.env.example ai-services/.env

# 3. Edit .env files with your actual values
# DO NOT share or commit these files!
```

### Secure Credential Management

**For Local Development:**
- Use `.env` files (never commit)
- Copy from `.env.example` as template
- Keep all credentials in `.gitignore`

**For Production/Deployment:**
Use environment management tools:
- **Environment Variables** (Docker, Kubernetes)
- **Secrets Manager** (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- **Configuration Services** (Spring Cloud Config, Consul)
- **CI/CD Platform Secrets** (GitHub Actions, GitLab CI, Jenkins)

---

## 🔒 Required Environment Variables

### Root `.env` File
```dotenv
# ➜ NEVER commit this file to Git
# ➜ Copy from .env.example and fill in values

VITE_APP_NAME=PrepMate AI Studio
VITE_APP_VERSION=1.0.0
NODE_ENV=development

PORT=8000
JWT_SECRET=<your-secure-random-string-64-chars-minimum>

MONGO_URI=<your-mongodb-connection-string>
MONGODB_URI=<your-mongodb-connection-string>

AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8001
AI_SERVICE_URL=http://localhost:8001

GEMINI_API_KEY=<regenerated-key-from-google>
GEMINI_MODEL=gemini-2.5-flash

VITE_API_BASE_URL=http://localhost:8000/api
VITE_AI_SERVICE_URL=http://localhost:8001
```

### Backend `.env` File
```dotenv
MONGODB_URI=<your-mongodb-connection-string>
PORT=8000
NODE_ENV=development
JWT_SECRET=<your-secure-random-string>
AI_SERVICE_URL=http://localhost:8001
GEMINI_API_KEY=<regenerated-key>
LOG_LEVEL=info
```

### AI Services `.env` File
```dotenv
MONGO_URI=<your-mongodb-connection-string>

# Primary LLM Provider
GEMINI_API_KEY=<regenerated-key>

# Fallback Providers
GROQ_API_KEY=<regenerated-key>
TOGETHER_API_KEY=<optional>

AI_SERVICE_PORT=8001
LOG_LEVEL=INFO
```

---

## ✅ Security Checklist

- [ ] Rotated all exposed API keys (Gemini, Groq, etc.)
- [ ] Removed .env files from git history (using filter-branch or BFG)
- [ ] Updated .gitignore (already done - `.gitignore` is now comprehensive)
- [ ] Verified no credentials in code/comments
- [ ] All `.env` files are in `.gitignore`
- [ ] `.env.example` files exist and don't contain real credentials
- [ ] Team members have been notified of rotation
- [ ] GitHub/GitLab branch protection rules are enabled
- [ ] Audit git log for remaining secrets: `git log -p | grep -iE "(apikey|api_key|secret|password|token)"`

---

## 🛡️ Best Practices Going Forward

### DO ✅
- Store all secrets in `.env` (local) or secure vault (production)
- Use `.env.example` to document required variables
- Keep `.gitignore` updated with patterns for sensitive files
- Rotate credentials periodically
- Use unique credentials per environment (dev, staging, prod)
- Add `.env*` to `.gitignore`
- Use GitHub Actions secrets for CI/CD
- Enable GitHub secret scanning

### DON'T ❌
- Never commit `.env` files
- Never hardcode API keys in code
- Never put secrets in comments
- Never include credentials in documentation
- Never share `.env` files via email/chat
- Never use the same API key for multiple services
- Never leave old credentials in backup branches

---

## 🔍 Automated Secret Detection

Add to your CI/CD pipeline to prevent future commits:

### GitHub Actions Example
```yaml
name: Secret Detection
on: [push, pull_request]
jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### Pre-commit Hook (Local)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
if git diff --cached | grep -iE "(GEMINI_API_KEY|GROQ_API_KEY|JWT_SECRET|mongodb)" | grep -v "example"; then
    echo "❌ ERROR: Potential secrets detected in commit!"
    exit 1
fi
```

---

## 📚 References

- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub - Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Git-Secrets Tool](https://github.com/awslabs/git-secrets)
- [TruffleHog - Secret Scanner](https://github.com/trufflesecurity/trufflehog)
