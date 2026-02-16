# DEBUGGING GUIDE: Question Generation Issue

## What I've Done

I've added **very detailed logging** at every step to help identify where the issue is:

### Frontend (Browser Console)
- ✅ Enhanced logging showing exactly what response is received
- ✅ Shows error message from backend
- ✅ Shows response structure

### Backend (Terminal where `npm start` runs)
- ✅ Logs when learner profile is being prepared
- ✅ Logs when calling Python AI service
- ✅ Logs the exact response from AI service
- ✅ Logs if AI service returns success/failure

## How to Debug This

### Step 1: Check Backend Terminal
**While the app is running**, look at the backend terminal (where you ran `npm start`):
```
npm start 
Cwd: C:\Projects\prepmate-ai-studio\backend
```

### Step 2: Trigger the Error Again
1. Open browser to http://localhost:5173
2. Go to Practice page
3. Click on **any topic** to generate questions

### Step 3: Watch Backend Terminal
You should see output like:
```
================================================================================
🤖 CALLING PYTHON AI SERVICE
================================================================================
   URL: http://localhost:8001/ai/practice/generate-questions
   Learner Profile topicId: Dynamic Programming
   Limit: 5

✅ AI SERVICE RESPONSE RECEIVED
   Status: 200
   Success: [true/false]
   Questions: [number]
   Source: [source]
```

### Step 4: Check Browser Console
**DevTools > Console tab** should show:
```
Response.data.data: {...}
Response.data.data.questions: [...]
Response structure:
  - Questions extracted from: ...
  - Questions count: ...
  - Source: ...
```

## Expected Behavior (Working)

Backend terminal:
```
✅ AI SERVICE RESPONSE RECEIVED
   Status: 200
   Success: true
   Questions: 5
```

Frontend console:
```
Response.data.data.questions: [
  { problemTitle: "...", difficulty: "Easy", ... },
  ...
]
Questions count: 5
```

## Expected Behavior (Failing)

Backend terminal might show:
```
❌ AXIOS ERROR CALLING AI SERVICE
   Error: [specific error message]
```

Or:
```
❌ AI SERVICE RETURNED non-success
   Message: [error from Python service]
```

Frontend console would show:
```
Response.data.data: {success: false, message: "...error...", questions: []}
```

## What to Report

When you see the error, **copy & paste these logs**:

1. **From Backend Terminal**: Everything under the `🤖 CALLING PYTHON AI SERVICE` section
2. **From Browser Console**: Everything under `Response structure:` section
3. **Tell me**: Which topic you clicked on

This will help me know  exactly what's failing and why!

## Quick Checklist

Before trying again, verify:
- ✅ Backend running: `npm start` in `/backend` directory
- ✅ AI Service running: Python process on port 8001
- ✅ Both ports working:
  - http://localhost:8000 (backend)
  - http://localhost:8001 (AI service)
- ✅ Browser DevTools open (F12)
- ✅ Console tab selected

Then try clicking a topic and report what you see!
