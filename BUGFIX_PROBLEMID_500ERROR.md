# 🔧 BUG FIX: ProblemId Consistency Issue (500 Error)

## Problem Statement
**Error:** `Question not found: {problemId}. Cannot create session without a valid wrapped problem.`

When users tried to start a practice session with LLM-generated questions, the backend couldn't find the question in the database, resulting in a 500 error.

**Root Cause:** The problemId generation algorithm was inconsistent between the Python AI service and the Node.js backend. When questions were generated, saved, and then queried, the problemIds didn't match due to incomplete slug generation in Python.

## Issues Found & Fixed

### Issue 1: Incomplete Slug Generation in AI Service
**File:** `ai-services/app/llm/question_generation_service.py` - Lines 388-405

**Problem:** Python slug generation was missing the "clean up multiple hyphens" and "strip leading/trailing hyphens" steps.

```python
# BEFORE (Incomplete):
slug = title.replace(' ', '-').replace('_', '-')
slug = re.sub(r'[^a-z0-9-]', '', slug)
# Missing: collapse multiple hyphens, strip edges
q['problemId'] = slug
```

**Impact Examples:**
- Title: "Coin  Change" (two spaces)
  - Python: "coin--change" ❌
  - Node.js: "coin-change" ✅
  - **Result:** Database lookup fails!

- Title: "String-Reverse!!!"
  - Python: "string-reverse" ✅
  - But inconsistency could occur with different patterns

**Fix Applied:**
```python
# AFTER (Complete):
import re
title = q.get('problemTitle', 'problem').lower()
# Step 1: Replace spaces and underscores with hyphens
slug = title.replace(' ', '-').replace('_', '-')
# Step 2: Remove special characters
slug = re.sub(r'[^a-z0-9-]', '', slug)
# Step 3: Collapse multiple consecutive hyphens
slug = re.sub(r'-+', '-', slug)
# Step 4: Strip leading and trailing hyphens
slug = slug.strip('-')
q['problemId'] = slug
```

### Issue 2: Fallback Questions Missing ProblemId Generation
**File:** `ai-services/app/llm/question_generation_service.py` - Lines 920-932

**Problem:** When Groq API was unavailable, fallback questions were returned without problemIds.

**Fix Applied:** Applied the same complete slug algorithm to fallback questions (lines 920-932)

```python
# Generate problemId for fallback questions using EXACT algorithm
import re
for q in result:
    if 'problemId' not in q:
        title = q.get('problemTitle', 'problem').lower()
        slug = title.replace(' ', '-').replace('_', '-')
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')
        q['problemId'] = slug
```

### Issue 3: Main Question Parsing Missing Complete Algorithm
**File:** `ai-services/app/llm/question_generation_service.py` - Lines 388-402

**All Groq-generated questions now use complete slug algorithm with 4-step process.**

## Verification

### Algorithm Consistency
Both Node.js and Python now use identical slug generation:

```
Input: "Coin  Change Problem!!!" 
1. lowercase → "coin  change problem!!!"
2. spaces→hyphens → "coin--change-problem!!!"
3. remove special chars → "coin--change-problem"
4. collapse hyphens → "coin-change-problem"
5. strip edges  → "coin-change-problem"
Output: "coin-change-problem"
```

### Test Scripts Created
- **`backend/scripts/verify-db.js`** - Checks database state and question counts
- **`backend/scripts/diagnose-llm-flow.js`** - Traces flow from AI service through database
- **`backend/scripts/simple-llm-test.js`** - Single question generation test
- **`backend/scripts/test-comprehensive-flow.js`** - Full end-to-end test
- **`backend/scripts/test-problemid-flow.js`** - ProblemId consistency verification

## Data Flow (Fixed)

```
User clicks "Generate Questions for Coin Change"
        ↓
Frontend: POST /practice/topics/coin-change/generate-questions
        ↓
Backend calls AI Service with learner profile
        ↓
AI Service (Groq/Llama 3.3):
- Generates questions with problemTitle: "Coin Change Classic"
- AI Service generates: problemId: "coin-change-classic"
        ↓
Backend receives questions with problemIds
        ↓
Backend converts to wrapped format (v2)
- Preserves problemId from AI service
- Sets schemaVersion: 2, isActive: true
        ↓
Backend saves to QuestionBank with problemId
        ↓
Backend returns to Frontend:
{
  "problemId": "coin-change-classic",  ✅ Correct ID
  "problemTitle": "Coin Change Classic",
  "schemaVersion": 2,
  ...
}
        ↓
Frontend shows question to user
User clicks "Start Practice"
        ↓
Frontend: POST /practice/session/start
{
  "problemId": "coin-change-classic",
  "topicId": "coin-change",
  "language": "python"
}
        ↓
Backend queries: QuestionBank.findOne({ 
  problemId: "coin-change-classic",  ✅ FOUND!
  isActive: true,
  schemaVersion: 2
})
        ↓
Session created successfully ✅
```

## Files Modified

1. **`ai-services/app/llm/question_generation_service.py`**
   - Lines 388-402: Fixed main question parsing slug generation
   - Lines 920-932: Fixed fallback question slug generation
   - Both now use complete 4-step algorithm

2. **`backend/src/services/llmQuestionGenerationService.js`**
   - Already had complete algorithm (no changes needed)
   - Lines 1004-1008: generateProblemId() function

3. **`backend/src/controllers/practiceController.js`**
   - Lines 579-616: Question lookup logic (no changes needed)
   - Correctly queries with problemId

4. **`backend/src/middleware/wrappedExecutionEnforcement.js`**
   - Already enforcing schemaVersion 2 (no changes needed)

## Testing Instructions

```bash
# 1. Start MongoDB
mongodb

# 2. Start AI Service (in ai-services folder)
python main.py

# 3. Start Backend (in backend folder)
npm start

# 4. Run comprehensive test
node scripts/test-comprehensive-flow.js

# 5. Expected output:
# ✅ Questions generated
# ✅ Questions found in database
# ✅ Session created successfully
```

## Expected Behavior After Fix

✅ User generates LLM questions → Questions saved with correct problemIds  
✅ User clicks on generated question → Session starts without error  
✅ ProblemIds are consistent across Python AI service and Node.js backend  
✅ All questions use schemaVersion 2 (wrapped execution)  
✅ No more "Question not found" 500 errors  

## Algorithm Compliance

- **Python:** 4-step slug generation with hyphen cleanup
- **Node.js:** 4-step slug generation with hyphen cleanup  
- **Database:** Queries with lowercase problemId
- **Frontend:** Receives and sends correct problemIds

Both services now guarantee identical problemId generation for the same input titles.
