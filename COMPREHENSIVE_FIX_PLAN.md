# 🔧 COMPREHENSIVE FIX: End-to-End LLM Question Flow

## Current Problem
Error: `Question not found: maximum-depth-of-a-binary-tree. Cannot create session`

**Root Cause Analysis:**
1. LLM generates questions for topic
2. Questions saved to database with problemId
3. Frontend sends correct problemId to backend
4. Backend tries to find question in GeneratedQuestionLog or QuestionBank
5. ⚠️ QUESTION NOT FOUND - lookup fails

**Why?** Multiple possible causes:
- Question saved to wrong collection
- Question doesn't have schemaVersion 2
- Question saved as inactive
- ProblemId format doesn't match

## Complete End-to-End Flow (Corrected)

```
PRACTICE PAGE (Practice.tsx)
  ↓
User clicks DSA subject → view topics
  ↓
User clicks topic (e.g., "trees") → topic-detail view
  ↓
Auto-trigger: generateQuestions(topicId)
  ↓ POST /api/practice/topics/trees/generate-questions
  ↓
Backend: generatePersonalizedQuestions()
  │
  ├─ Call LLM: generatePersonalizedQuestions(userId, topicId)
  │  ↓
  │  └─ AI Service generates questions with problemId
  │     (Uses clean slug: "maximum-depth-of-a-binary-tree")
  │
  ├─ Convert to v2 wrapped format
  │
  ├─ Save to QuestionBank with:
  │  - problemId: "maximum-depth-of-a-binary-tree" ✅
  │  - schemaVersion: 2 ✅
  │  - isActive: true ✅
  │  - source: "llm" ✅
  │
  ├─ Return to Frontend:
  │  {
  │    problemId: "maximum-depth-of-a-binary-tree",
  │    problemTitle: "Maximum Depth of a Binary Tree",
  │    schemaVersion: 2,
  │    ...wrapped fields...
  │  }
  │
  └─ Frontend displays QuestionCard with AI Lab button
       ↓
USER CLICKS "AI LAB" on QuestionCard
       ↓
Frontend navigates: /ai-lab/maximum-depth-of-a-binary-tree
       ↓ Passes state: { problem: generatedQuestion }
       ↓
PRACTICE PROBLEM PAGE (PracticeProblem.tsx) loads
       ↓
1. Load problem from locationState
2. Extract problemId
3. Call usePracticeSession.createSession(problemId, problemId, language)
       ↓ POST /api/practice/session/start
       ↓
Backend: startSession()
  │
  ├─ Extract problemId: "maximum-depth-of-a-binary-tree"
  │
  ├─ Query GeneratedQuestionLog OR QuestionBank:
  │  SELECT * FROM questions WHERE 
  │    problemId = "maximum-depth-of-a-binary-tree" AND
  │    schemaVersion = 2 AND
  │    isActive = true
  │
  ├─ ✅ FIND question
  │
  ├─ Create PracticeSession with all wrapped fields:
  │  - wrapperTemplate
  │  - starterCode
  │  - testCasesStructured
  │  - functionMetadata
  │
  └─ Return sessionId
       ↓
Frontend receives sessionId
       ↓
AI LAB EDITOR PAGE ready with:
  ✅ Code editor with starterCode
  ✅ Test cases displayed
  ✅ Run tests button
  ✅ Submit button
  ✅ Code review panel
  ✅ Inline assist
  ✅ Hints
```

## Issues to Fix

### ISSUE 1: Generation Flow - Missing Database Persistence
**Status:** Questions may not be saved properly

**Check:**
1. Do LLM questions get saved to QuestionBank?
2. Are they marked as schemaVersion 2?
3. Are test cases properly structured?

### ISSUE 2: Lookup Failure
**Status:** Session creation queries fail to find generated questions

**Root Cause Options:**
- A) Questions saved to GeneratedQuestionLog but lookup is slow/delayed
- B) Questions not saved with correct schemaVersion
- C) Database lookup query is wrong
- D) Frontend sending wrong problemId format

### ISSUE 3: Frontend Data Passing
**Status:** PracticeProblem might receive incomplete problem data

**Check:**
1. Does locationState contain full problem object?
2. Are all required wrapped fields populated?
3. Is problemId format consistent?

## Test Cases

### Test 1: Question Generation
```
POST /api/practice/topics/trees/generate-questions
Expected:
- Response contains questions array
- Each question has problemId: "slug-format"
- Database check: Questions exist in QuestionBank
- Schema check: schemaVersion = 2, isActive = true
```

### Test 2: Session Creation
```
POST /api/practice/session/start
{
  problemId: "maximum-depth-of-a-binary-tree",
  topicId: "trees",
  language: "python"
}
Expected:
- No 404 error
- Session created with all wrapped fields
- starterCode populated
- testCasesStructured populated
```

### Test 3: AI Lab Page Load
```
Navigate -> /ai-lab/maximum-depth-of-a-binary-tree (with problem in state)
Expected:
- Problem loads from state
- Session created automatically
- Code editor displays with starterCode
- Test cases visible
```

## Fixes to Implement

### FIX 1: Ensure Questions Are Saved Correctly (llmQuestionGenerationService.js)
- Verify saveWrappedQuestionsToDatabase populates ALL fields
- Check schemaVersion = 2 enforcement
- Verify isActive = true

### FIX 2: Debug Session Query (practiceController.js)
- Add detailed logging to identify why lookup fails
- Check both collections (GeneratedQuestionLog, QuestionBank)
- Log what question data was found vs expected

### FIX 3: Frontend Problem Data Passing (PracticeProblem.tsx)
- Verify locationState is passed through navigate()
- Check problem object contains all required fields
- Add fallback data fetching if state missing

### FIX 4: Create Diagnostic Script
- Query database for recently generated questions
- Check their fields and format
- Identify schema mismatches

## Implementation Order

1. ✅ Add console logging to identify exact failure point
2. ✅ Check database: What questions exist? What's their schema?
3. ✅ Fix generation if needed
4. ✅ Fix lookup if needed
5. ✅ Test end-to-end
