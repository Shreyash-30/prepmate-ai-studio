# Git History Cleanup - Step-by-Step Guide

**STATUS**: Your .env files ARE currently in git history (commits: 2813ce5, 21c3f2f, 14cdd46)

## ⚠️ CRITICAL: Exposed API Keys Found

Your repository contains **EXPOSED API KEYS** in the Git history:
- ✗ `GEMINI_API_KEY=AIzaSyB059mInbFknQhQUBlMzhJ8SOtWJXzLJ2c`
- ✗ `GEMINI_API_KEY=AIzaSyArDi9pqUDDkyhrq8Bq9-jV6bqzQdZeR1k`
- ✗ `GROQ_API_KEY=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`

---

## 🚨 IMMEDIATE ACTION ITEMS

### Step 1: Rotate All API Keys (DO THIS IMMEDIATELY)
```bash
# 1. Google Gemini - Get new keys from: https://aistudio.google.com/apikey
# 2. Groq - Get new keys from: https://console.groq.com
# 3. Update your .env files with NEW keys
```

### Step 2: Remove .env Files from Git History

Choose ONE of these methods:

---

## Method 1: Git Filter-Branch (Comprehensive - Recommended)

**Pros**: Doesn't require external tools, removes file from all history  
**Cons**: Rewrites entire git history (force push required)

```bash
cd c:\Projects\prepmate-ai-studio

# BACKUP: Save your current .env files first!
copy .env .env.backup
copy backend\.env backend\.env.backup
copy ai-services\.env ai-services\.env.backup

# Remove .env files from all git history
git filter-branch --tree-filter 'rm -f .env ai-services\.env backend\.env' -f -- --all

# Clean up reflog
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# THIS REWRITES HISTORY - Force push to all branches
git push --force --all
git push --force --tags
```

**Verification After:**
```bash
# Verify files are removed from history
git log -p --all -- ".env" | head -20  # Should show nothing or "deleted file"
```

---

## Method 2: BFG Repo-Cleaner (Easier & Faster)

**Pros**: Much faster, easier to use, preserves some history integrity  
**Cons**: Requires external tool installation

### Windows Installation:
```bash
# Download BFG
# Option A: Using PowerShell
Invoke-WebRequest -Uri "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -OutFile "bfg.jar"

# Option B: Using Chocolatey (if installed)
choco install bfg
```

### Using BFG:
```bash
cd c:\Projects\prepmate-ai-studio

# BACKUP your .env files first!
copy .env .env.backup
copy backend\.env backend\.env.backup
copy ai-services\.env ai-services\.env.backup

# Create a mirror clone (safer)
git clone --mirror https://github.com/YOUR_ORG/prepmate-ai-studio.git prepmate-ai-studio.git.backup

# Run BFG to remove files
# Note: Replace backslashes with forward slashes in BFG commands
java -jar bfg.jar --delete-files ".env" --delete-files-regex "\.env$" --no-blob-protection c:\Projects\prepmate-ai-studio

# Finalize
cd c:\Projects\prepmate-ai-studio
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force --all
git push --force --tags
```

---

## Method 3: GitHub Web UI (If Commits Not Yet Pushed)

**If you haven't pushed to GitHub yet:**
1. Delete all commits containing .env (create fresh repo)
2. Initialize new repository
3. Add files without .env
4. Push fresh history

---

## ✅ Verification Checklist

After cleanup, verify:

```bash
# 1. Check .env not in current git index
git status --short | findstr "\.env"
# Should return: (nothing)

# 2. Verify .env in .gitignore
git check-ignore -v .env ai-services\.env backend\.env
# Should return: .gitignore entries

# 3. Search git history for API keys
git log -p --all | findstr "AIzaSy"
# Should return: (nothing)

git log -p --all | findstr "gsk_"
# Should return: (nothing)

# 4. Check git log for .env files
git log --all --name-only | findstr "\.env"
# May show old commits before cleanup (which is okay after filter-branch)
```

---

## 🔒 Preventing This in the Future

### Pre-commit Hook (Local Protection)

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent secrets from being committed

FILES_PATTERN='.*\.(env|key|pem|secret)$'
FORBIDDEN_TOKENS=('GEMINI_API_KEY' 'GROQ_API_KEY' 'AIzaSy' 'gsk_' 'JWT_SECRET')

if git diff --cached --name-only | grep -E "$FILES_PATTERN"; then
    echo "❌ ERROR: Trying to commit sensitive file!"
    exit 1
fi

if git diff --cached | grep -i -E "(GEMINI_API_KEY|GROQ_API_KEY|gsk_|AIzaSy|JWT.*=.*[^=])" | grep -v "example"; then
    echo "❌ ERROR: Potential API keys or secrets in commit!"
    exit 1
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### GitHub Actions (Server-side Protection)

Add `.github/workflows/secrets-check.yml`:
```yaml
name: Secret Scanning
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

---

## 📊 Summary of Changes Made

✅ **Updated Files:**
- `.gitignore` - Comprehensive secret patterns added
- `backend/.gitignore` - Enhanced with security patterns
- `ai-services/.gitignore` - Created with Python-specific patterns
- `.env.example` - Created with full documentation
- `backend/.env.example` - Updated with better documentation
- `ai-services/.env.example` - Enhanced with better guidance

✅ **Created Documentation:**
- `SECURITY.md` - Security best practices and guidelines
- `ENVIRONMENT_SETUP.md` - Complete setup guide for team
- `GIT_CLEANUP.md` - This file, for removing secrets from history

⚠️ **Still Required:**
- [ ] Rotate all exposed API keys (MOST IMPORTANT)
- [ ] Remove .env files from git history (using one of the 3 methods above)
- [ ] Verify secrets are cleaned from history
- [ ] Force-push to update remote repository
- [ ] Notify team members

---

## 🚨 If You Can't Clean Git History

If history cleanup is too risky or complex:
1. **Create a new repository** with the current code (without .env)
2. **Rotate all API keys** to invalidate old ones
3. **Migrate team to new repository**
4. **Archive old repository** with admin-only access

---

## ❓ Questions?

- Confused about which method? → Use **Method 1: Git Filter-Branch**
- Need help with BFG? → Check [BFG Docs](https://rtyley.github.io/bfg-repo-cleaner/)
- Git filter-branch issues? → Check [Git Book](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
