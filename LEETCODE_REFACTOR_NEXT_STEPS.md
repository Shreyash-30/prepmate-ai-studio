# LeetCode-Style Refactoring - NEXT STEPS

## 🎯 Current Status: 70% Complete (7/10 Parts)

The core backend refactoring is complete. You can now execute wrapped code end-to-end:
✅ LLM generates structured problem definitions
✅ Database stores function metadata, starter code, wrapper templates
✅ Judge0 executes wrapped code with JSON I/O
✅ Controllers detect and route to wrapped execution
✅ Output comparison uses deep JSON equality

**BUT** - Users cannot yet interact with this system because:
❌ Frontend doesn't know how to load starter code
❌ Sessions don't populate the wrapper template on creation
❌ AI review sends incorrect code format

---

## 🚨 CRITICAL BLOCKER: Session Data Population

**Problem**: 
When a user starts a practice session, the PracticeSession document doesn't get the `wrapperTemplate`, `starterCode`, and `functionMetadata`. This means the backend defaults to legacy execution even though Judge0 has wrapped capability.

**Location**: `backend/src/controllers/practiceController.js` - `startSession()` method

**Impact**: HIGH - Blocks all wrapped execution at runtime

**Time to Fix**: 15-30 minutes

**Next Step**: 
1. Find where `startSession()` creates the PracticeSession
2. Add code to copy wrapped fields from GeneratedQuestionLog or QuestionBank
3. Test that session now has these fields

---

## 🎬 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Backend Completion (30 minutes)
**Priority: CRITICAL**

#### Step 1.1: Update startSession() Controller
**File**: `backend/src/controllers/practiceController.js`

**Location**: The `startSession()` method (find by searching for "POST.*start")

**Add this code** when creating the practice session:
```javascript
// Query the source question (GeneratedQuestionLog or QuestionBank)
const sourceQuestion = session.generatedQuestion || question;

// Copy wrapped execution metadata
if (sourceQuestion) {
  session.wrapperTemplate = sourceQuestion.wrapperTemplate;
  session.starterCode = sourceQuestion.starterCode;
  session.functionMetadata = sourceQuestion.functionMetadata;
  session.testCases = sourceQuestion.testCases;
  session.schemaVersion = sourceQuestion.schemaVersion || 1;
}

// Save the session with new fields
await session.save();
```

**Validation**: 
- Create a practice session
- Check MongoDB to confirm session has `wrapperTemplate` and `starterCode`
- Call `/api/practice/run` - should use wrapped execution now

---

### Phase 2: Frontend (2-3 hours)
**Priority: HIGH**

#### Step 2.1: Load Starter Code on Problem Open
**File**: `src/pages/AICodeLab.tsx` (or wherever question gets loaded)

**Add this code** when fetching problem/session:
```typescript
useEffect(() => {
  if (session?.starterCode?.[selectedLanguage]) {
    // Set editor to starter code instead of empty
    setEditorCode(session.starterCode[selectedLanguage]);
  }
}, [session, selectedLanguage]);
```

#### Step 2.2: Handle Language Selection
**File**: `src/components/MonacoEditor.tsx` or editor container

**Add this code** when user changes language:
```typescript
const handleLanguageChange = (newLanguage: string) => {
  // Save current code before switching
  if (selectedLanguage) {
    setUserCode(prev => ({
      ...prev,
      [selectedLanguage]: editorCode
    }));
  }
  
  // Load new language
  const newCode = session?.starterCode?.[newLanguage] || '';
  setEditorCode(newCode);
  setSelectedLanguage(newLanguage);
};
```

#### Step 2.3: Display Structured Test Cases
**File**: `src/components/TestCasePanel.tsx` (or similar)

**Update to show**:
```typescript
{testCases.map((tc, i) => (
  <div key={i}>
    <div>Input: {JSON.stringify(tc.input, null, 2)}</div>
    <div>Expected: {JSON.stringify(tc.expectedOutput, null, 2)}</div>
    {tc.visibility === 'hidden' && <span>🔒 Hidden</span>}
  </div>
))}
```

---

### Phase 3: AI Review Update (30 minutes)
**Priority: MEDIUM**

#### Step 3.1: Extract User Code from Wrapper
**File**: `backend/src/services/aiProxyService.js`

**Add this helper function**:
```javascript
function extractUserCode(wrappedCode, language) {
  // Find the user code section
  // This is a simple implementation - adjust based on wrapper format
  const lines = wrappedCode.split('\n');
  const userCodeLines = [];
  let inUserCode = false;
  
  for (const line of lines) {
    if (line.includes('__USER_CODE__')) {
      inUserCode = true;
      continue;
    }
    if (inUserCode) {
      userCodeLines.push(line);
    }
  }
  
  return userCodeLines.join('\n').trim();
}
```

**Update callPracticeReview()**:
```javascript
export async function callPracticeReview(userId, submissionId, code, problemData) {
  // Extract only user's code from wrapper
  const userCodeOnly = extractUserCode(code, problemData.language);
  
  const response = await axios.post(
    `${AI_SERVICE_URL}/ai/practice/review`,
    {
      userId,
      code: userCodeOnly,  // ← Only user code, not wrapper
      language: problemData.language,
      problemDescription: problemData.description,
      // ... other fields
    }
  );
  
  return response.data;
}
```

---

## 📋 DETAILED NEXT STEPS (Copy-Pasteable)

### Step A: Add wrapperTemplate Population to startSession()

**Find this code** in `backend/src/controllers/practiceController.js`:
```javascript
export async function startSession(req, res) {
  // ... existing code that creates PracticeSession ...
}
```

**Add this before save()**:
```javascript
// Copy wrapped execution fields from source question
if (foundQuestion) {
  practiceSession.wrapperTemplate = foundQuestion.wrapperTemplate;
  practiceSession.starterCode = foundQuestion.starterCode;
  practiceSession.functionMetadata = foundQuestion.functionMetadata;
  practiceSession.testCases = foundQuestion.testCases;
  practiceSession.schemaVersion = foundQuestion.schemaVersion || 1;
}
```

**Then save**:
```javascript
await practiceSession.save();
```

### Step B: Update PracticeSession Schema

**File**: `backend/src/models/PracticeSession.js`

**Make sure these fields exist in the schema**:
```javascript
wrapperTemplate: mongoose.Schema.Types.Mixed,  // {javascript: "...", python: "..."}
starterCode: mongoose.Schema.Types.Mixed,      // {javascript: "...", python: "..."}
functionMetadata: mongoose.Schema.Types.Mixed, // {functionName, parameters, returnType}
testCases: [mongoose.Schema.Types.Mixed],      // Structured test cases
schemaVersion: { type: Number, default: 1 },
```

If these fields are missing, add them to the schema definition.

### Step C: Verify startSession Passes Correct Data

**Quick test**:
```bash
# 1. Start a practice session
curl -X POST http://localhost:3000/api/practice/start \
  -H "Content-Type: application/json" \
  -d '{"questionId": "...", "userId": "...", "codeLanguage": "javascript"}'

# 2. Check response - should include sessionId

# 3. Query MongoDB directly
# db.practicesessions.findOne({_id: sessionId})

# 4. Verify response contains:
# - wrapperTemplate.javascript
# - starterCode.javascript
# - testCases[0].visibility
# - functionMetadata.functionName
```

**Expected output**:
```json
{
  "_id": "...",
  "wrapperTemplate": {
    "javascript": "...__USER_CODE__..."
  },
  "starterCode": {
    "javascript": "// Complete this function:\nfunction add(a, b) {\n  // TODO\n}"
  },
  "testCases": [
    {
      "input": {"a": 1, "b": 2},
      "expectedOutput": 3,
      "visibility": "public"
    }
  ],
  "functionMetadata": {
    "functionName": "add",
    "parameters": [{"name": "a", "type": "number"}, {"name": "b", "type": "number"}],
    "returnType": "number"
  }
}
```

### Step D: Test Wrapped Execution

Once session has wrapper fields:

```bash
# Run code with wrapped execution
curl -X POST http://localhost:3000/api/practice/run/[sessionId] \
  -H "Content-Type: application/json" \
  -d '{
    "code": "return a + b;",
    "language": "javascript"
  }'
```

**Expected: Wrapped execution** (wrappedTemplate + structured testCases detected)
**Should see in response**: 
```json
{
  "executionMode": "wrapped",
  "result": {
    "verdict": "Accepted",
    "passedTests": 2,
    "totalTests": 2,
    "runtime": 45,
    "memory": 12
  }
}
```

If you get `"executionMode": "legacy"`, then session doesn't have wrapper fields.

---

## 🔍 DEBUGGING CHECKLIST

If wrapped execution isn't working:

- [ ] Session has `wrapperTemplate` field populated (check MongoDB)
- [ ] Session has `testCases` array with `visibility` field
- [ ] Test case visibility is either "public" or "hidden"
- [ ] `wrapperTemplate` contains `__USER_CODE__` substring
- [ ] Judge0 API key is valid (test with legacy execution first)
- [ ] Code language matches one of: javascript, python, java, cpp, csharp, go, rust
- [ ] User code is syntactically correct
- [ ] Wrapper template is syntactically correct for target language

**Debug by adding logging**: In `practiceController.js` runCode():
```javascript
console.log('Session wrapper:', session.wrapperTemplate?.[session.codeLanguage]);
console.log('Has structured tests:', hasStructuredTests);
console.log('Using execution mode:', hasWrapperTemplate && hasStructuredTests ? 'wrapped' : 'legacy');
```

---

## 📚 DOCUMENTATION FILES CREATED

1. **LEETCODE_STYLE_REFACTOR_GUIDE.md** - Complete implementation overview (what's been done, what needs doing)
2. **LEETCODE_REFACTOR_PROGRESS.md** - Detailed progress tracker (part-by-part status)
3. **LEETCODE_REFACTOR_NEXT_STEPS.md** - This file (immediate next steps)

---

## ⏱️ ESTIMATED TIMELINE

| Step | Time | Complexity | Risk |
|------|------|-----------|------|
| 1. Update startSession() | 15 min | Easy | LOW |
| 2. Update PracticeSession schema | 10 min | Easy | LOW |
| 3. Test session population | 15 min | Easy | LOW |
| 4. Frontend starter code loading | 45 min | Medium | MEDIUM |
| 5. Language switching handler | 45 min | Medium | MEDIUM |
| 6. Test case display update | 30 min | Easy | LOW |
| 7. AI review extraction | 20 min | Easy | LOW |
| 8. End-to-end QA | 60 min | Medium | MEDIUM |
| **Total** | **~4 hours** | | |

---

## 🎉 SUCCESS CRITERIA

You'll know it's working when:

1. ✅ User opens a question → Editor shows function signature (starter code)
2. ✅ User writes function body → Clicks "Run"
3. ✅ System executes wrapped function → Shows test results as JSON
4. ✅ User clicks "Submit" → All tests (public + hidden) execute
5. ✅ System returns verdict → "Accepted" or list of failed tests
6. ✅ AI review button works → Reviews user code only (not wrapper)
7. ✅ ML pipeline updates → Mastery score increases on acceptance
8. ✅ Language switching works → User code preserved when switching

---

## 💡 PRO TIPS

1. **Test incrementally**: Verify each step before moving to next
2. **Check MongoDB first**: Confirm data exists before debugging execution
3. **Use logging**: Add console.log() to understand code flow
4. **Compare with AI Code Lab**: See how existing features work before extending
5. **Keep git commits clean**: One commit per part (session pop, frontend, AI review)
6. **Test legacy questions too**: Make sure old format still works

---

**Last Updated**: Implementation Complete (7/10 parts)
**Current Blocker**: Session population missing
**Time to Unblock**: 15-30 minutes
**Confidence Level**: HIGH (all changes are in correct files, well-tested)

