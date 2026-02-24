# 🔍 Judge0 Diagnostic Guide

## Quick Check: Is Judge0 Working?

### Option 1: API Endpoint (Easiest)
Make a GET request to test Judge0 connectivity:

```bash
curl http://localhost:8000/api/practice/diagnostic/judge0
```

**Expected Response (if working):**
```json
{
  "success": true,
  "message": "Judge0 is working correctly",
  "details": {
    "configured": true,
    "testSubmission": {
      "token": "...",
      "statusId": 3,
      "statusDescription": "Accepted",
      "stdout": "hello",
      "time": 0.05,
      "memory": 1024
    }
  }
}
```

**If Judge0 is NOT configured:**
```json
{
  "success": false,
  "message": "Judge0 is NOT configured",
  "details": {
    "configured": false,
    "apiKey": "JUDGE0_RAPIDAPI_KEY not set",
    "solution": "Set JUDGE0_RAPIDAPI_KEY in .env file"
  }
}
```

---

### Option 2: Command Line Test
Run the Node.js diagnostic script:

```bash
cd backend
node scripts/test-judge0-connection.js
```

This will:
1. ✅ Check if API key is configured
2. ✅ Submit a test code snippet to Judge0
3. ✅ Poll for results
4. ✅ Display execution output

---

## 🛠️ Troubleshooting

### Problem 1: "JUDGE0_RAPIDAPI_KEY not configured"

**Solution:**
1. Create `.env` file in backend directory (if not exists):
   ```bash
   cp .env.example .env
   ```

2. Get your RapidAPI key:
   - Visit: https://rapidapi.com/judge0-official/api/judge0
   - Click "Subscribe" (free plan available)
   - Copy your API key
   
3. Set in `.env`:
   ```
   JUDGE0_RAPIDAPI_KEY=your_key_here_12345...
   JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
   JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
   ```

4. Restart backend:
   ```bash
   npm start
   ```

---

### Problem 2: "Authentication failed" (401 Error)

**Causes:**
- Invalid or expired API key
- Typo in API key

**Solution:**
1. Verify your API key on RapidAPI dashboard
2. Copy the exact key (no spaces or extra characters)
3. Update `.env` with correct key
4. Restart backend

---

### Problem 3: "Rate limit exceeded" (429 Error)

**Causes:**
- Too many requests to Judge0
- Exceeded free tier quota

**Solution:**
- Free tier: ~100-500 requests/day depending on plan
- Wait 24 hours for quota reset, OR
- Upgrade to paid plan on RapidAPI

---

### Problem 4: "Cannot connect to Judge0"

**Causes:**
- Network connectivity issue
- Judge0 service down
- Firewall blocking RapidAPI

**Solution:**
1. Check internet connection:
   ```bash
   ping judge0-ce.p.rapidapi.com
   ```

2. Test RapidAPI connection directly:
   ```bash
   curl -H "x-rapidapi-key: YOUR_KEY" https://judge0-ce.p.rapidapi.com/about
   ```

3. Check if Judge0 service is online:
   - Visit: https://judge0.com/status
   
4. If firewall is blocking:
   - Allow connections to `judge0-ce.p.rapidapi.com`
   - OR use a VPN

---

## 📊 Checking Error Messages

When running code fails, check the error message printed:

| Error | Cause | Fix |
|-------|-------|-----|
| "Judge0 authentication failed" | Bad API key | Update JUDGE0_RAPIDAPI_KEY |
| "Rate limit exceeded" | Too many requests | Wait or upgrade plan |
| "Cannot connect to Judge0" | Network issue | Check connection |
| "submission token not found" | Wrong host config | Check JUDGE0_RAPIDAPI_HOST |
| "Polling timeout" | Judge0 slow response | Increase timeout or retry |

---

## 🚀 Debugging in Development Mode

**Enable detailed logs:**
1. Set in `.env`:
   ```
   NODE_ENV=development
   DEBUG=*
   ```

2. Restart backend:
   ```bash
   npm start
   ```

3. Run code again and check console output for:
   - Full error stack traces
   - Judge0 API response details
   - Submission tokens and polling results

---

## ✅ Full End-to-End Test

Once configured, test the complete flow:

1. **Start backend:**
   ```bash
   cd backend && npm start
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **In browser:**
   - Navigate to a practice problem
   - Click any problem
   - Write code
   - Click "Run Code"

4. **Check console output:**
   - Backend should show: "Using wrapped code execution" or "Using legacy stdin execution"
   - Results should appear in 5-10 seconds

---

## 📋 Checklist Before Deployment

- [ ] `.env` file exists in backend directory
- [ ] `JUDGE0_RAPIDAPI_KEY` is set with valid key
- [ ] `JUDGE0_RAPIDAPI_HOST` is set (or using default)
- [ ] `JUDGE0_BASE_URL` is set (or using default)
- [ ] `node scripts/test-judge0-connection.js` returns success
- [ ] `/api/practice/diagnostic/judge0` endpoint returns success
- [ ] Can successfully run code on test problem

---

## 🎯 Quick Reference

```bash
# Test Judge0 via API
curl http://localhost:8000/api/practice/diagnostic/judge0

# Test Judge0 via Node script
cd backend && node scripts/test-judge0-connection.js

# View backend logs
cd backend && npm start

# Check .env file
cat backend/.env

# Get new API key
# Visit: https://rapidapi.com/judge0-official/api/judge0
```

---

## 📚 Resources

- **Judge0 API Docs**: https://judge0.com/docs
- **RapidAPI Judge0**: https://rapidapi.com/judge0-official/api/judge0
- **Judge0 Status**: https://judge0.com/status
- **Supported Languages**: https://judge0.com/docs/api/system-and-information#available-languages

---

**Need Help?**
1. Check backend console for full error messages
2. Run diagnostic script: `node backend/scripts/test-judge0-connection.js`
3. Verify `.env` configuration
4. Check Judge0 status page
5. Ensure valid RapidAPI key
