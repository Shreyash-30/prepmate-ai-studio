# 🔍 AI Lab Wiring Audit Report

## Executive Summary
The AI Lab (code editor page using `PracticeProblem.tsx`) has logical wiring issues between the frontend, backend, and AI services. The data flow is partially connected but has several critical mismatches in field names and missing data transformations.

## Current Wiring Status

### ✅ WORKING: Code Review Request Flow
```
Frontend: getCodeReview(code)
    ↓
GET /api/practice/review/{sessionId}?code=...&token=...
    ↓
Backend: streamCodeReview(req, res)
    ↓
practiceSessionService.getCodeReview(session)
    ↓
✅ Properly streams SSE response to frontend
```

### ⚠️ ISSUE 1: Code Review Request Field Mismatch
**Location:** `backend/src/services/practiceSessionService.js` lines 370-381

**Frontend Hook Call:**
```typescript
// In usePracticeSession.ts
await getCodeReview(code, (message: StreamingMessage) => { ... })
```

**Backend Request to AI Service:**
```javascript
// Current - WRONG field names
const reviewRequest = {
  sessionId: session._id.toString(),
  code: userCode,                          // ❌ Should be: userCode
  language: session.codeLanguage,          // ✅ OK
  problemStatement: session.problemStatement || '',     // ❌ Should be: problemDescription
  testCasesPassed: session.submissionResult?.passedTests || 0,   // ❌ Not expected by AI service
  totalTestCases: session.submissionResult?.totalTests || 0,     // ❌ Not expected by AI service
  // ❌ Missing: userId
  // ❌ Missing: difficulty
  // ❌ Missing: topic
  // ❌ Missing: problemId
};
```

**AI Service Expected:**
```python
class CodeReviewRequest(BaseModel):
    userId: str                    # ❌ MISSING in backend request
    problemDescription: str        # ❌ Backend sends: problemStatement
    userCode: str                 # ❌ Backend sends: code
    language: str                 # ✅ OK
    difficulty: str              # ❌ MISSING in backend request
    topic: str                   # ❌ MISSING in backend request
    problemId: Optional[str]      # ❌ MISSING in backend request
```

### ⚠️ ISSUE 2: Missing Data from Session

The `PracticeSession` schema stores:
- ✅ `userId`
- ✅ `topicId`
- ✅ `problemId`
- ✅ `codeLanguage`
- ❌ `difficulty` - NOT STORED
- ❌ `problemDescription` - NOT STORED
- ❌ `topic` - Already have topicId

**Problem:** These fields need to be fetched from the question source (QuestionBank or GeneratedQuestionLog).

### ▶️ ISSUE 3: Other AI Service Calls in AI Lab

#### Inline Assist (`getInlineAssist`)
**Status:** Same issue as code review

**Frontend Call:**
```typescript
GET /api/practice/inline-assist/{sessionId}?cursorLine=...&token=...
```

**Backend Route:** `GET /api/practice/inline-assist/:sessionId`
- Calls: `practiceController.streamInlineAssist`
- Which calls: `practiceSessionService.getInlineAssist(session)`

**Expected to call AI Service:** `/ai/assist/inline` (needs checking)

#### Hints (`getHint`)
**Status:** Likely similar issues

## WIRING ANALYSIS FOR EACH AI LAB FEATURE

### 1️⃣ CODE REVIEW - ⚠️ CRITICAL FIELD MISMATCH

**Status:** Partially working but data fields don't match

**Frontend → Backend:**
```
✅ GET /api/practice/review/{sessionId}?code=...&token=...
   → practiceController.streamCodeReview()
   → Correctly fetches session and handles SSE streaming
```

**Backend → AI Service:**
```
❌ POST /ai/practice/review with WRONG structure:

BACKEND SENDS (practiceSessionService.js:370-381):
{
  sessionId: "123",           ❌ Should be: userId: "user123"
  code: "user code",          ❌ Should be: userCode: "user code"  
  language: "python",         ✅ OK
  problemStatement: "...",    ❌ Should be: problemDescription: "..."
  testCasesPassed: 5,         ❌ NOT EXPECTED by AI service
  totalTestCases: 10          ❌ NOT EXPECTED by AI service
  // MISSING:
  // - userId
  // - difficulty
  // - topic
  // - problemId
}

AI SERVICE EXPECTS (CodeReviewRequest in practice_review_service.py):
{
  userId: str ✅ MISSING
  problemDescription: str ✅ MISSING (sent as problemStatement)
  userCode: str ✅ MISSING (sent as code)
  language: str ✅ OK
  difficulty: str ✅ MISSING
  topic: str ✅ MISSING
  problemId: Optional[str] ✅ MISSING
}
```

**Fix Required:** Map session data to AI service format:
- userId from session.userId
- userCode from session.code
- problemDescription from question lookup (QuestionBank/GeneratedQuestionLog)
- language from session.codeLanguage
- difficulty from question lookup
- topic from session.topicId
- problemId from session.problemId

---

### 2️⃣ INLINE ASSISTANCE - ⚠️ CURSOR POSITION MISSING

**Status:** Mostly working but missing cursor position data

**Frontend → Backend:**
```
✅ GET /api/practice/inline-assist/{sessionId}?cursorLine=25&token=...
   → practiceController.streamInlineAssist()
   → Should extract cursorLine query param
```

**Backend → AI Service:**
```
❌ POST /ai/assist/inline

BACKEND SENDS (practiceSessionService.js:310-315):
{
  sessionId: "123",           ✅ OK
  codeChunk: "...",           ✅ OK
  language: "python",         ✅ OK
  context: "problem desc"     ✅ OK
  // MISSING:
  // - cursorPosition: not being passed!
}

AI SERVICE EXPECTS (InlineAssistRequest in schemas.py):
{
  sessionId: str ✅ OK
  codeChunk: str (max 1500) ✅ OK
  cursorPosition: Optional[int] ❌ MISSING
  context: Optional[str] ✅ OK
  language: str ✅ OK
}
```

**Fix Required:** Extract cursorLine from query parameter and pass as cursorPosition

---

### 3️⃣ HINT GENERATION - ✅ MOSTLY WORKING

**Frontend → Backend:**
```
✅ GET /api/practice/hint?level=2&token=...
   Calls usePracticeSession.getHint(level)
```

**Backend → AI Service:**
```
✅ POST /ai/hint/generate

BACKEND SENDS:
{
  sessionId: "123" ✅
  problemStatement: "..." ✅
  currentCode: "..." ✅
  hintLevel: 2 ✅
  language: "python" ✅
  topicId: "dsa" ✅
}

AI SERVICE EXPECTS (HintGenerationRequest):
  All fields match ✅
```

**Status:** ✅ Working correctly

---

## SUMMARY OF ISSUES

| Feature | Issue | Severity | Fix Complexity |
|---------|-------|----------|-----------------|
| Code Review | Field name mismatches (code→userCode, problemStatement→problemDescription) + missing userId, difficulty, topic, problemId | CRITICAL | Medium |
| Inline Assist | cursorLine query param not passed as cursorPosition to AI service | HIGH | Low |
| Hints | All fields correct | - | ✅ OK |
| Session Data | PracticeSession doesn't store difficulty or problemDescription | MEDIUM | Medium |

---

## REQUIRED FIXES

### Fix #1: Fetch & Map Problem Data in Code Review
**File:** `backend/src/services/practiceSessionService.js` (getCodeReview function)

```javascript
// Current (BROKEN):
const reviewRequest = {
  sessionId: session._id.toString(),
  code: userCode,
  language: session.codeLanguage,
  problemStatement: session.problemStatement || '',
  testCasesPassed: session.submissionResult?.passedTests || 0,
  totalTestCases: session.submissionResult?.totalTests || 0,
};

// Should be (FIXED):
// 1. Fetch question to get difficulty and description
const question = await QuestionBank.findOne({ problemId: session.problemId });

const reviewRequest = {
  userId: session.userId.toString(),
  userCode: userCode,
  language: session.codeLanguage,
  problemDescription: question?.content || session.problemStatement || '',
  difficulty: question?.difficulty || 'Medium',
  topic: session.topicId,
  problemId: session.problemId,
};
```

### Fix #2: Pass cursorLine to cursorPosition
**File:** `backend/src/controllers/practiceController.js` (streamInlineAssist function)

```javascript
// Extract from query and pass to service
const { cursorLine } = req.query;
const assistRequest = {
  sessionId: session._id.toString(),
  codeChunk: code,
  language: session.codeLanguage,
  cursorPosition: parseInt(cursorLine) || 0,  // ← ADD THIS
  context: session.problemStatement?.substring(0, 200),
};
```

---

## TESTING CHECKLIST

After fixes are applied:

- [ ] Generate LLM questions for a topic
- [ ] Open a generated question in AI Lab
- [ ] Click "Get Review" button → Verify code review loads without errors
- [ ] Click "Get Hint" button → Verify hints display correctly
- [ ] Click "Inline Assist" at different cursor positions → Verify suggestions appear
- [ ] Check backend logs for AI service calls → Verify correct parameters sent
- [ ] Check AI service logs for correct request structures

---

## SYSTEM ARCHITECTURE DIAGRAM

```
FRONTEND (React)
  │
  ├─→ GET /api/practice/review/{sessionId}?code=...
  │    └─→ Backend streamCodeReview()
  │         └─→ callAIEndpoint('/ai/practice/review', POST, reviewRequest)
  │              └─→ Python FastAPI
  │                   ├─ /ai/practice/review (CodeReviewRequest)
  │                   └─ Returns CodeReviewResponse (SSE)
  │
  ├─→ GET /api/practice/inline-assist/{sessionId}?cursorLine=X
  │    └─→ Backend streamInlineAssist()
  │         └─→ callAIEndpoint('/ai/assist/inline', POST, assistRequest)
  │              └─→ Python FastAPI
  │                   ├─ /ai/assist/inline (InlineAssistRequest)
  │                   └─ Returns InlineSuggestion (SSE)
  │
  └─→ GET /api/practice/hint?level=N
       └─→ Backend getHint()
            └─→ callAIEndpoint('/ai/hint/generate', POST, hintRequest)
                 └─→ Python FastAPI
                      ├─ /ai/hint/generate (HintGenerationRequest)
                      └─ Returns HintResponse (SSE)
```

---

## ADDITIONAL FINDINGS

1. **PracticeSession Schema Limitation:**
   - Stores: userId, topicId, problemId, code, codeLanguage
   - Does NOT store: difficulty, problemDescription, constraints
   - Workaround: Fetch from QuestionBank/GeneratedQuestionLog on demand

2. **AI Service Field Inconsistencies:**
   - Different endpoints use different field names
   - No consistent naming scheme (code vs userCode, problemStatement vs problemDescription)
   - Recommendation: Standardize all AI service inputs

3. **SSE Streaming Status:**
   - Code Review: ✅ Working SSE
   - Inline Assist: ✅ Working SSE  
   - Hints: ✅ Working SSE
   - All properly handle streaming responses
