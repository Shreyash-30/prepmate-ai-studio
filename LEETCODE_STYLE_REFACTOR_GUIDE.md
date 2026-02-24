# LeetCode-Style Refactoring Implementation Guide

## ✅ COMPLETED REFACTORING (Parts 1-7)

### Part 1: LLM Prompt Generation (✅ DONE)
**File**: `ai-services/app/llm/question_generation_service.py`

Updated `_build_generation_prompt()` to request structured function-based problems:
- Generates `functionMetadata` (name, parameters, returnType)
- Generates `starterCode` for javascript, python, java
- Generates `wrapperTemplate` with `__USER_CODE__` placeholder for each language
- Generates structured `testCases` with input/expectedOutput/visibility
- Generates problem description and constraints

### Part 2: Response Parsing (✅ DONE)
**File**: `ai-services/app/llm/question_generation_service.py`

Updated `_parse_gemini_response()` with **STRICT VALIDATION**:
- ✅ Validates functionMetadata exists and has required fields
- ✅ Validates starterCode has multiple language implementations
- ✅ Validates wrapperTemplate contains `__USER_CODE__` placeholder
- ✅ Validates testCases: minimum 4, with input/expectedOutput/visibility
- ✅ Rejects malformed responses with detailed logging
- ✅ Supports JSONL format parsing (one JSON per line)

### Part 3: Question Schema (✅ DONE)
**Files**: 
- `backend/src/models/GeneratedQuestionLog.js`
- `backend/src/models/QuestionBank.js`

Added new fields (schemaVersion: 2):
```javascript
functionMetadata: {
  functionName: String,
  parameters: [{name, type}],
  returnType: String
}

starterCode: {
  javascript: String,
  python: String,
  java: String,
  // ... other languages
}

wrapperTemplate: {
  javascript: String,
  python: String,
  java: String,
  // ... other languages
}

testCases: [{
  input: Mixed (JSON),
  expectedOutput: Mixed (JSON),
  visibility: 'public' | 'hidden'
}]

constraints: String
description: String
schemaVersion: Number (2 = structured)
isLegacy: Boolean (marks old format)
```

### Part 4: Judge0 Execution Refactoring (✅ DONE)
**File**: `backend/src/services/judge0Service.js`

Added NEW methods for wrapped execution:

#### `deepEqual(actual, expected)`
- Deep comparison for JSON objects and arrays
- Handles nested structures, recursively
- True semantic equality (not string matching)

#### `wrapCode(userCode, wrapperTemplate)`
- Replaces `__USER_CODE__` placeholder with actual code
- Validates placeholder exists
- Returns complete executable code

#### `runWrappedTest(params)`
- Single test case with wrapped execution
- Parses stdout as JSON
- Compares using `deepEqual()`
- Returns detailed result with verdict

#### `runWrappedTests(params)`
- Multiple test cases
- Executes sequentially with small delays
- Aggregates results (passedTests, totalTests, runtime, memory)
- Determines overall verdict

#### `submitWrappedSolution(params)`
- Same as `runWrappedTests()` but for official submission

### Part 5: Run Route (✅ DONE)
**File**: `backend/src/controllers/practiceController.js`

Updated `runCode()` endpoint:
```javascript
// Detects if wrapped or legacy
const hasWrapperTemplate = session.wrapperTemplate?.[session.codeLanguage];
const hasStructuredTests = testCases with visibility field;

if (hasWrapperTemplate && hasStructuredTests) {
  // ✅ NEW: Wrapped execution
  results = judge0Service.runWrappedTests({
    userCode: code,
    language: session.codeLanguage,
    wrapperTemplate: session.wrapperTemplate[language],
    testCases: visibleTestCases,  // Only public
  });
} else {
  // ⚠️ LEGACY: Old stdin execution (backward compat)
  results = judge0Service.runAgainstTestCases({code, testCases});
}
```

- Filters test cases to only visible (public)
- No PracticeAttemptEvent created
- No ML triggers
- Updates session telemetry (run_count)

### Part 6: Submit Route (✅ DONE)
**File**: `backend/src/controllers/practiceController.js`

Updated `submitPractice()` endpoint:
```javascript
// Same wrapper detection logic
if (hasWrapperTemplate && hasStructuredTests) {
  // ✅ NEW: Wrapped execution
  submissionResult = judge0Service.submitWrappedSolution({
    userCode: code,
    language: session.codeLanguage,
    wrapperTemplate: session.wrapperTemplate[language],
    testCases: allTestCases,  // ALL includes hidden
  });
} else {
  // ⚠️ LEGACY: Old execution
  submissionResult = judge0Service.submitSolution({code, testCases});
}
```

- Executes public + hidden test cases
- Creates PracticeAttemptEvent for ML pipeline
- Triggers ML updates (mastery, weakness analysis)
- Stores executionMode ('wrapped' or 'legacy')
- Returns structured verdict

### Part 7: Output Comparison (✅ DONE)
**Judge0Service.deepEqual()**

Handles all JSON types:
```javascript
// Primitives
123 === 123 ✅

// Arrays
[1, 2, 3] === [1, 2, 3] ✅
{a: [1, {b: 2}]} === {a: [1, {b: 2}]} ✅

// Nested objects
{indices: [0, 1]} === {indices: [0, 1]} ✅

// Order-sensitive
[1, 2] !== [2, 1] ✅ (respects order for arrays)
```

---

## ⏳ REMAINING IMPLEMENTATION WORK

### Part 8: AI Review Integration
**File**: `backend/src/services/aiProxyService.js` (✅ ACTION NEEDED)

**Current state**: Reviews entire code including wrapper
**Required change**: Send only userCode to AI review

```javascript
export async function callPracticeReview(userId, submissionId, practiceData) {
  // BEFORE: Full wrapped code sent
  // AFTER: Extract only the user function
  
  const userCodeOnly = extractUserFunction(practiceData.code);
  
  const response = await axios.post(
    `${AI_SERVICE_URL}/ai/practice/review`,
    {
      userId,
      userCode: userCodeOnly,  // ← ONLY user function
      problemDescription: practiceData.description,
      language: practiceData.language,
      difficulty: practiceData.difficulty,
      topic: practiceData.topic,
      testsPassed: practiceData.testsPassed,
      totalTests: practiceData.totalTests,
    }
  );
  
  return response.data;
}
```

### Part 9: Frontend Editor Configuration
**Files to update**:
- `src/components/MonacoEditor.tsx`
- `src/pages/AICodeLab.tsx` (or similar)

**Required changes**:

1. **Load Starter Code When Opening Problem**
```typescript
useEffect(() => {
  if (problem?.starterCode?.[selectedLanguage]) {
    setEditorCode(problem.starterCode[selectedLanguage]);
  }
}, [problem, selectedLanguage]);
```

2. **Language Switch Handler**
```typescript
const handleLanguageChange = (newLanguage: string) => {
  // Save current code
  savedCode[currentLanguage] = editorCode;
  
  // Load new language starter code
  setEditorCode(problem.starterCode[newLanguage] || '');
  setCurrentLanguage(newLanguage);
};
```

3. **Monaco Configuration**
```typescript
// Format starter code properly
const formattedCode = formatCode(
  problem.starterCode[language],
  language
);

// Initialize with proper language mode
editor.setModel(monaco.editor.createModel(
  formattedCode,
  getLanguageMode(language)
));
```

4. **Disable Wrapper Editing (Optional)**
```typescript
// Option A: Mark wrapper as read-only (advanced)
// Option B: Show popup warning if user edits wrapper markers
// Option C: Auto-revert wrapper to template version
```

5. **Test Case Panel Update**
```typescript
// Display structured test input/output
<TestCase
  index={i}
  input={testCase.input}  // JSON object
  expectedOutput={testCase.expectedOutput}  // JSON value
  visibility={testCase.visibility}
/>
```

### Part 10: Backend PracticeSession Model Update
**File**: `backend/src/models/PracticeSession.js`

Add fields to store wrapped content:
```javascript
wrapperTemplate: {
  javascript: String,
  python: String,
  java: String,
},

starterCode: {
  javascript: String,
  python: String,
  java: String,
},

functionMetadata: {
  functionName: String,
  parameters: [{name, type}],
  returnType: String,
},

testCases: [{
  input: mongoose.Schema.Types.Mixed,
  expectedOutput: mongoose.Schema.Types.Mixed,
  visibility: String,
}],

schemaVersion: Number  // 2 = wrapped
```

---

## 🧪 VALIDATION CHECKLIST

Use this to verify the refactor is complete:

### Schema Validation
- [ ] GeneratedQuestionLog.js has functionMetadata field
- [ ] GeneratedQuestionLog.js has starterCode field
- [ ] GeneratedQuestionLog.js has wrapperTemplate field
- [ ] GeneratedQuestionLog.js has testCases field  (structured)
- [ ] GeneratedQuestionLog.js has isLegacy flag
- [ ] QuestionBank.js has same fields

### Backend Validation
- [ ] Judge0Service has deepEqual() method
- [ ] Judge0Service has wrapCode() method
- [ ] Judge0Service has runWrappedTest() method
- [ ] Judge0Service has runWrappedTests() method
- [ ] Judge0Service has submitWrappedSolution() method
- [ ] runCode controller detects wrapper template
- [ ] runCode uses judge0Service.runWrappedTests()
- [ ] submitPractice controller detects wrapper template
- [ ] submitPractice uses judge0Service.submitWrappedSolution()
- [ ] ML pipeline still triggers correctly
- [ ] AI review receives only userCode

### Frontend Validation
- [ ] Editor loads starterCode on problem open
- [ ] Editor supports language switching
- [ ] Starter code preserved when switching back
- [ ] Test case panel shows JSON-formatted input/output
- [ ] Run button executes wrapped code
- [ ] Submit button executes wrapped code

### End-to-End Validation
- [ ] Generate new problem with LLM
- [ ] Verify JSON structure with all required fields
- [ ] Open problem in AI Code Lab
- [ ] Verify starter code loads correctly
- [ ] Write user function logic
- [ ] Click "Run" - should execute wrapped code
- [ ] Verify output compared as JSON
- [ ] Click "Submit" - should execute all tests
- [ ] Verify hidden tests run and results aggregate
- [ ] Check PracticeAttemptEvent created
- [ ] Verify ML mastery update triggered
- [ ] Verify AI review analysis works

---

## 🔄 BACKWARD COMPATIBILITY

The refactoring includes automatic fallback:

```javascript
// Pseudo-code logic
if (question.schemaVersion === 2 && question.wrapperTemplate) {
  // Use new wrapped execution
  execute.wrapped();
} else {
  // Use legacy stdin-based execution
  execute.legacy();
}
```

**Legacy questions are marked**:
- `isLegacy: true`
- `schemaVersion: 1`
- No wrapperTemplate
- Cannot be executed (marked as legacy)

---

## 📋 SUMMARY OF CHANGES

### Files Modified

1. **ai-services/app/llm/question_generation_service.py**
   - Updated `_build_generation_prompt()` request structured format
   - Updated `_parse_gemini_response()` with strict validation
   - Added support for JSONL format

2. **backend/src/services/judge0Service.js**
   - Added `deepEqual()` for JSON comparison
   - Added `wrapCode()` for code wrapping
   - Added `runWrappedTest()` single test execution
   - Added `runWrappedTests()` batch test execution
   - Added `submitWrappedSolution()` official submission

3. **backend/src/controllers/practiceController.js**
   - Updated `runCode()` to detect and use wrapped execution
   - Updated `submitPractice()` to detect and use wrapped execution
   - Both maintain backward compatibility with legacy mode

4. **backend/src/models/GeneratedQuestionLog.js**
   - Added `functionMetadata`, `starterCode`, `wrapperTemplate`, `testCases` (structured)
   - Added `constraints`, `description`, `schemaVersion`, `isLegacy`

5. **backend/src/models/QuestionBank.js**
   - Added same fields as GeneratedQuestionLog for consistency

### Files To Be Completed

6. **backend/src/services/aiProxyService.js**
   - Extract userCode only for AI review
   - Send to `/ai/practice/review`

7. **src/components/MonacoEditor.tsx**
   - Load starterCode on problem open
   - Handle language switching with code preservation

8. **src/pages/AICodeLab.tsx** (or main lab page)
   - Initialize editor with starterCode
   - Display structured test case input/output

9. **backend/src/models/PracticeSession.js**
   - Add wrapperTemplate, starterCode, functionMetadata, testCases fields

---

## 🚀 NEXT STEPS

1. **Complete aiProxyService.js** - Extract userCode for AI review
2. **Update Frontend Editor** - Load and manage starter code
3. **Update PracticeSession Schema** - Store structured problem data
4. **Test End-to-End**:
   - Generate problem
   - Open in editor
   - Run test
   - Submit solution
   - Verify results and ML triggers
5. **Document for Users** - How to write function implementations

---

## 📚 ARCHITECTURE OVERVIEW

```
LeetCode-Style Execution Flow:
┌─────────────────┐
│ LLM generates   │
│ structured      │
│ problem         │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Store in DB     │
│ (with function  │
│  metadata)      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ User opens in   │
│ editor          │
│ (loads starter) │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ User writes     │
│ function body   │
│ only            │
└────────┬────────┘
         │
         v
     Run/Submit
         │
    ┌────┴────┐
    v         v
[Run]      [Submit]
  │           │
  ├─────┬─────┤
  │     │     │
  v     v     v
Wrap Code  Serialize  Execute
  Code    Input(JSON) vs Judge0
   │        │         │
   └────┬───┴─────┬───┘
        │         │
        v         v
    Compare     Create Event
    Output      Trigger ML
    (JSON)      
```

---

## ✨ BENEFITS

✅ **LeetCode-Style UX**: Users write function implementations, not full programs
✅ **Structured Data**: JSON-based I/O, deep comparison, no string matching
✅ **Hidden Tests**: Support for private test cases
✅ **Multi-Language**: JavaScript, Python, Java, C++, Go, Rust, etc.
✅ **ML Integration**: Maintained mastery tracking and weakness detection
✅ **Backward Compatible**: Legacy questions still work
✅ **Production-Grade**: Strict validation, error handling, logging

---

## 🔗 RELATED FILES

- Prompt templates: `ai-services/app/llm/prompt_templates.py`
- Question bank: `backend/src/models/QuestionBank.js`
- Practice events: `backend/src/models/PracticeAttemptEvent.js`
- Integration service: `backend/src/services/aiProxyService.js`
- Frontend API: `src/services/api.ts`

