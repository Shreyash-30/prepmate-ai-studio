# COMPREHENSIVE FIELD AUDIT AND FIX PLAN

## CRITICAL ISSUE SUMMARY
Field mismatches exist across:
- Database models (GeneratedQuestionLog, QuestionBank, PracticeSession)
- Backend services (practiceSessionService, llmQuestionGenerationService)
- Frontend state management (hooks, contexts)
- AI service request/response schemas

---

## 1. DATABASE MODELS - CURRENT STATE

### QuestionBank.schemaVersion2 (Wrapped Execution)
**Required Core Fields:**
- `problemId`: string (unique slug, e.g., "two-sum")
- `title`: string
- `titleSlug`: string
- `difficulty`: Easy | Medium | Hard
- `content`: string (problem statement)
- `functionMetadata`: {functionName, parameters, returnType}
- `starterCode`: {python, javascript, java, ...}
- `wrapperTemplate`: {python, javascript, java, ...}
- `testCasesStructured`: [{input: object, expectedOutput: object, visibility: 'public'|'hidden'}]
- `schemaVersion`: 2 (ENFORCED)
- `isActive`: true (ENFORCED)

**Metadata:**
- `topicTags`: string[]
- `normalizedTopics`: string[]
- `hints`: string[]
- `constraints`: string
- `difficulty`: enum
- `acceptanceRate`: number
- `source`: 'leetcode' | 'codeforces' | 'other'

**Issues Found:**
- ✅ Correct structure for v2
- ✅ All wrapped fields present

---

### GeneratedQuestionLog (Currently BROKEN)
**Issues Found:**
- ❌ Missing `problemId` field (we just added)
- ❌ Named `testCases` instead of `testCasesStructured`
- ❌ Uses `problemTitle` instead of `title`
- ❌ Missing `problemStatement` field
- ❌ Missing `difficulty` stored
- ❌ Missing `topic` vs `topicId` confusion
- ❌ Missing wrapped execution fields (testCases, wrapperTemplate, starterCode, functionMetadata)
- ❌ Inconsistent with QuestionBank schema

**Fix Needed:**
Align fields with QuestionBank for consistency:
- Add `problemId` ✅ (done)
- Rename `testCases` to `testCasesStructured`
- Keep `problemTitle` but also sync with workflow
- Add `problemStatement` 
- Store wrapped execution fields
- Clarify topic naming

---

### PracticeSession Model
**Current Fields:**
- `userId`, `problemId`, `topicId`
- `code`: string (raw user code)
- `codeLanguage`: string
- `wrapperTemplate`: {python, javascript, ...}
- `starterCode`: {python, javascript, ...}
- `testCases`: []
- `functionMetadata`: {functionName, parameters, returnType}
- `submissionResult`: {passedTests, totalTests}
- `difficulty`: string
- `problemStatement`: string

**Issues Found:**
- ✅ Has `testCases` field
- ⚠️ Missing `testCasesStructured` consistency
- ⚠️ Has both `testCases` and `testCasesStructured` fields in different places

---

## 2. BACKEND API CONTRACTS

### Question Generation Flow
**POST /practice/topics/:topicId/generate-questions**
- Request: `{userId, limit}`
- Response: `{success, data: {questions: []}}`
- Question object should have:
  - `problemId`
  - `problemTitle`
  - `difficulty`
  - `testCases` (already converted to proper structure)
  - `wrapperTemplate`
  - `starterCode`
  - `functionMetadata`

**Issues:**
- ❌ Response includes raw LLM output mixed with backend-processed data
- ❌ Unclear which fields are from LLM vs processed

---

### Session Creation
**POST /practice/session/start**
- Request: `{problemId, topicId, language, userId}`
- Response: `{success, data: {sessionId, sessionKey, schemaVersion, executionType}}`

**Issues:**
- ✅ Correct after recent fixes

---

### Code Review Endpoint
**GET /practice/session/:sessionId/review**
- Frontend expects SSE stream
- Backend sends request to AI service with: 
  - OLD (wrong): `{code, problemStatement, testCasesPassed, totalTestCases}`
  - NEW (fixed): `{userCode, problemDescription, userId, difficulty, topic, problemId}`

**Issues:**
- ✅ FIXED in previous changes

---

### Inline Assist Endpoint
**POST /practice/inline-assist/:sessionId**
- Frontend sends: `{codeChunk, context}` + query param `cursorLine`
- Backend should forward to AI service with: `{userCode, cursorPosition, language, ...}`

**Issues:**
- ✅ FIXED in previous changes

---

## 3. FRONTEND STATE & COMPONENTS

### PracticeProblem.tsx
**Issues Found:**
- ❌ Uses `problem.id` for both `problemId` and `topicId` (line 163)
- ⚠️ Problem state structure unclear - loads from nav state vs API
- ⚠️ No type safety for problem object

**Data Flow:**
```
Practice.tsx (has full problem with wrapped fields)
    ↓ (navigation state)
PracticeProblem.tsx
    ↓ (should extract correct fields)
Session creation API
```

---

### Inline Assist Hook
**useInlineAssist Hook Issues:**
- ❌ Doesn't pass cursorLine to API
- ❌ Doesn't track cursor position state

---

## 4. AI SERVICE SCHEMAS (Python)

### Expected Request Bodies
**CodeReviewRequest:**
```python
{
    userId: str,
    userCode: str,          # NOT code
    problemDescription: str, # NOT problemStatement
    language: str,
    difficulty: str,
    topic: str,
    problemId: str,
    testCasesPassed: int,
    totalTestCases: int,
}
```

**InlineAssistRequest:**
```python
{
    userCode: str,          # NOT codeChunk
    cursorPosition: int,    # Line number where cursor is
    language: str,
    problemDescription: str,
    userId: str,
    difficulty: str,
    topic: str,
    problemId: str,
}
```

**HintRequest:**
```python
{
    userId: str,
    problemDescription: str,
    language: str,
    difficulty: str,
    topic: str,
    problemId: str,
    previousHints: str[],
}
```

---

## 5. DATA FLOW MISMATCHES

### Question Generation Pipeline
```
START: LLM generates question
    ↓
LLM Output Format: {problemTitle, difficulty, testCases, ...}
    ↓
processAndDeduplicateQuestions()
    - Adds: problemId (generated from title)
    - Adds: wrapped execution fields
    ↓
convertToWrappedQuestions()
    - Creates: wrapperTemplate, starterCode, functionMetadata
    - Converts: testCases → testCasesStructured
    ✅ Saves to QuestionBank ✓
    
PROBLEM: Saves to GeneratedQuestionLog missing wrapped fields!
    ❌ GeneratedQuestionLog.testCases != QuestionBank.testCasesStructured
    ❌ GeneratedQuestionLog missing: wrapperTemplate, starterCode, functionMetadata
```

---

## 6. ROOT CAUSES IDENTIFIED

**ROOT CAUSE 1: Dual Architecture**
- Questions exist in TWO places: QuestionBank + GeneratedQuestionLog
- Each has different schemas
- No synchronization between them
- Session creation looks in GeneratedQuestionLog first (newer questions)
- But GeneratedQuestionLog is missing wrapped execution fields

**ROOT CAUSE 2: Field Name Mismatches**
- Model calls field `testCases`, display calls `testCasesStructured`
- Model uses `code`, AI expects `userCode`
- Model uses `problemStatement`, AI expects `problemDescription`
- API requests `codeChunk`, backend converts to `userCode`

**ROOT CAUSE 3: Missing Fields in Requests**
- Code Review missing: userId, difficulty, topic, problemId
- Inline Assist missing: cursorPosition
- Hint missing: topic, difficulty, problemId

**ROOT CAUSE 4: Type Inconsistency**
- testCases sometimes string, sometimes object
- cursor position sometimes undefined
- language sometimes from model, sometimes inferred

---

## 7. COMPREHENSIVE FIX STRATEGY

### Phase 1: Normalize Database Schema
1. GeneratedQuestionLog: Add missing fields to match QuestionBank
   - Add problemId (unique index) ✅
   - Rename testCases → testCasesStructured
   - Add problem statement
   - Add wrapped execution fields

2. QuestionBank: Keep as-is (already correct v2)

3. PracticeSession: Keep as-is (already correct)

### Phase 2: Fix LLM Storage Service  
1. llmQuestionGenerationService.storeGeneratedQuestions():
   - Store ALL wrapped fields in GeneratedQuestionLog
   - Include testCasesStructured (not testCases)
   - Include wrapperTemplate, starterCode, functionMetadata
   - Include problemStatement

### Phase 3: Fix AI Service Field Mappings
1. practiceSessionService.getCodeReview():
   - ✅ Already fixed: userCode, problemDescription, userId, difficulty, topic, problemId

2. practiceSessionService.getInlineAssistance():
   - ✅ Already fixed: userCode, cursorPosition, problemDescription, userId, difficulty, topic, problemId

3. practiceSessionService.getHint():
   - Check: Include difficulty, topic, problemId

### Phase 4: Fix Frontend Data Extraction
1. PracticeProblem.tsx:
   - Use correct field names from problem object
   - Extract topic from problem.topic (not assume topicId = id)
   - Ensure all metadata passed to session creation

2. useInlineAssist Hook:
   - Extract and pass cursorLine to API

### Phase 5: Standardize Field Names
1. Globally: testCases → testCasesStructured (for consistency across models)
2. Globally: code → userCode (in AI requests)
3. Globally: problemStatement → problemDescription (in AI requests)
4. Globally: codeChunk → userCode (in incoming requests)

---

## 8. FILES TO MODIFY

**Database Models (2 files):**
1. ✅ GeneratedQuestionLog.js - ADD problemId field
2. ✅ QuestionBank.js - No changes needed (already correct)

**Backend Services (2 files):**
1. ✅ llmQuestionGenerationService.js - Already updated to store wrapped fields
2. ✅ practiceSessionService.js - Already fixed field mappings

**Backend Controllers (1 file):**
1. ✅ practiceController.js - Already fixed

**Frontend Components (2 files):**
1. PracticeProblem.tsx - Fix topic/problemId extraction
2. useInlineAssist hook - Add cursorLine passing

---

## 9. VALIDATION CHECKLIST

After all fixes:
- [ ] GeneratedQuestionLog has problemId as unique index
- [ ] GeneratedQuestionLog stores testCasesStructured
- [ ] GeneratedQuestionLog stores wrapperTemplate, starterCode, functionMetadata
- [ ] Session creation works with both QuestionBank and GeneratedQuestionLog
- [ ] Code Review request includes all 5 new fields
- [ ] Inline Assist request includes cursorPosition
- [ ] frontend properly extracts problem.topic for topicId
- [ ] All test cases pass with comprehensive test suite
- [ ] No "Question not found" errors for LLM-generated questions
