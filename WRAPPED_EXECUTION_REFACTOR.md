# 🔥 Wrapped Execution System - Full Refactor Status

## ✅ COMPLETED PHASES (1-5)

### PHASE 1 & 4: Backend Execution Pipeline - HARDENED

**File: `backend/src/controllers/practiceController.js`**

Changed:
- ❌ Removed ALL `schemaVersion === 1` checks
- ❌ Removed ALL fallback to legacy stdin execution
- ❌ Removed ALL `exampleCases` references
- ❌ Removed conditional logic checking for wrapped vs legacy
- ✅ Added HARD FAIL for non-v2 sessions
- ✅ Enforced wrapped execution ONLY in:
  - `submitCode()` endpoint
  - `runCode()` endpoint

**Impact:**
```javascript
// BEFORE: if (isValidWrappedExecution) { ... } else { ...legacy... }
// AFTER:  if (schemaVersion !== 2) {  throw Error }
//         Execute wrapped ONLY
```

### PHASE 2: QuestionBank Schema - STRICT ENFORCEMENT

**File: `backend/src/models/QuestionBank.js`**

Changed:
- ✅ Changed `schemaVersion` from `default: 2` to `required: true, enum: [2]`
- ✅ Added comprehensive pre-save validation hook
- ✅ Enforces wrapperTemplate.python existence and `__USER_CODE__` placeholder
- ✅ Enforces starterCode.python existence
- ✅ Enforces testCasesStructured non-empty with all required fields
- ✅ Enforces functionMetadata existence
- ✅ Added error messages for all violations

**Validation Rules:**
```
Before save():
  ✓ schemaVersion must be 2 (only value allowed)
  ✓ wrapperTemplate.python must exist
  ✓ wrapperTemplate.python must contain "__USER_CODE__"
  ✓ starterCode.python must exist
  ✓ testCasesStructured must have >= 1 item
  ✓ Each testCase[].input (required)
  ✓ Each testCase[].expectedOutput (required)
  ✓ Each testCase[].visibility in ['public', 'hidden']
  ✓ functionMetadata must exist
```

### PHASE 3: Session Creation - PURE SNAPSHOTS

**File: `backend/src/controllers/practiceController.js` - startSession()**

Already correct:
```javascript
session.schemaVersion = 2
session.testCases = sourceQuestion.testCasesStructured
session.wrapperTemplate = sourceQuestion.wrapperTemplate
session.starterCode = sourceQuestion.starterCode
session.functionMetadata = sourceQuestion.functionMetadata
// NO stringify
// NO transformation
// Pure copy
```

### PHASE 5: Frontend Editor - HARD ENFORCEMENT

**File: `src/pages/PracticeProblem.tsx`**

Changed:
- ✅ Removed ALL fallback to `problem.initialCode`
- ✅ Removed ALL fallback to `problem.testCases`
- ✅ Added HARD FAIL for non-v2 sessions:
  - Check `session.schemaVersion === 2` → error if not
  - Check `session.wrapperTemplate` exists → error if not
  - Check `session.testCases.length > 0` → error if not
- ✅ Enforces `session.starterCode[selectedLanguage]` ONLY
- ✅ Enforces `session.testCases` for Run button
- ✅ Added comprehensive logging

**Startup Validation:**
```typescript
if (sessionData.schemaVersion !== 2) { throw Error }
if (!sessionData.wrapperTemplate) { throw Error }
if (!Array.isArray(sessionData.testCases) || length === 0) { throw Error }
```

**Code Loading:**
```typescript
const starter = sessionData.starterCode?.[selectedLanguage]
if (!starter) { throw Error }
setCode(starter)
```

**Test Case Display:**
```typescript
// NO fallback to problem.testCases
if (session?.testCases?.length > 0) {
  // Show session.testCases
} else {
  // Error: "No test cases loaded from session"
}
```

**Run Button:**
```typescript
const testCasesToUse = (session as any)?.testCases
if (!testCasesToUse || testCasesToUse.length === 0) {
  throw Error("Cannot run without wrapped test cases")
}
runCode(code, testCasesToUse)
```

---

## 🚀 REMAINING PHASES (6-10)

### PHASE 6: LLM Question Generation

**Status:** Not started

**File to update:** `backend/src/services/llmService.js` or similar

**What to do:**
- [ ] Update LLM prompt to enforce schemaVersion: 2
- [ ] Add JSON schema validation after LLM response
- [ ] Verify wrapperTemplate contains `__USER_CODE__`
- [ ] Verify starterCode has all required languages
- [ ] Verify testCasesStructured non-empty
- [ ] Reject malformed responses

### PHASE 7: Migration Script

**Status:** Not started

**File to create:** `backend/scripts/migrate-to-wrapped-only.js`

**What to do:**
- [ ] Find all problems with `schemaVersion !== 2`
- [ ] Either:
  - Auto-convert if possible
  - Mark as inactive
- [ ] Update UI to hide inactive problems
- [ ] Add migration status logging

### PHASE 8: Remove Double Stringification

**Status:** In progress

**Search needed:**
```bash
grep -r "JSON.stringify(.*JSON.stringify" backend/src
grep -r "JSON.parse(JSON.stringify" backend/src
```

**What to do:**
- [ ] Find all double stringify calls
- [ ] Verify they're not needed (should store Mixed objects)
- [ ] Remove them

### PHASE 9: Add Global Hard Fails

**Status:** Partially done

**Already added:**
- ✅ Session creation checks schemaVersion
- ✅ runCode checks schemaVersion
- ✅ submitCode checks schemaVersion
- ✅ Frontend checks schemaVersion

**Still needed:**
- [ ] Global middleware to reject non-v2 problems
- [ ] Query filters to only show v2 problems
- [ ] Error logging for any v1 access attempts

### PHASE 10: End-to-End Validation

**Status:** Not started

**Test flow:**
```
1. Create session for wrapped problem
   ✓ Returns sessionId with schemaVersion: 2
   ✓ Returns wrapperTemplate, starterCode, testCases

2. Frontend loads
   ✓ Validates schemaVersion === 2
   ✓ Loads session.starterCode[language]
   ✓ Displays session.testCases count
   ✓ No fallback logs

3. User runs tests
   ✓ Pass in session.testCases
   ✓ Judge0 receives wrapped code
   ✓ Results accurate

4. User submits
   ✓ Pass in ALL session.testCases
   ✓ Judge0 receives wrapped code
   ✓ Verdict accurate

5. No legacy paths executed
   ✓ No "Using legacy execution" logs
   ✓ No fallback to problem.initialCode
   ✓ No fallback to exampleCases
```

---

## 📋 HARD FAIL CODES ADDED

### Backend Hard Fails:

```javascript
// Session creation
if (sourceQuestion.schemaVersion !== 2) {
  throw new Error(`Only schemaVersion 2 supported. Got: ${sourceQuestion.schemaVersion}`)
}

if (!sourceQuestion.wrapperTemplate) {
  throw new Error(`wrapperTemplate required`)
}

// Code execution
if (!session.schemaVersion || session.schemaVersion !== 2) {
  throw new Error(`Session not using wrapped execution`)
}

if (!wrapperTemplate.includes('__USER_CODE__')) {
  throw new Error(`Invalid wrapper template`)
}

if (!session.testCases || session.testCases.length === 0) {
  throw new Error(`Session missing test cases`)
}
```

### Frontend Hard Fails:

```typescript
// Session check
if (sessionData.schemaVersion !== 2) {
  throw Error(`Session is not wrapped execution`)
}

if (!sessionData.wrapperTemplate) {
  throw Error(`Session missing wrapper template`)
}

if (!sessionData.testCases?.length) {
  throw Error(`Session has no test cases`)
}

// Code loading
const starter = sessionData.starterCode?.[selectedLanguage]
if (!starter) {
  throw Error(`No starter code for language`)
}

// Test running
const testCases = session?.testCases
if (!testCases?.length) {
  throw Error(`Cannot run without wrapped test cases`)
}
```

---

## 🎯 NEXT IMMEDIATE STEPS

1. **PHASE 6 - LLM Generation:**
   - Update question generation prompt
   - Add JSON schema validation
   - Implement auto-generation of schemaVersion 2 questions

2. **PHASE 7 - Migration:**
   - Run migration for existing problems
   - Mark/convert legacy questions
   - Test with real problem data

3. **Build & Test:**
   ```bash
   cd backend && npm run build
   cd frontend && npm run build
   nohup node app.js &
   ```

4. **Integration Test:**
   - Create wrapped problem with all v2 fields
   - Test full flow: session → editor → run → submit
   - Verify no v1 code paths execute

---

## 🔒 SYSTEM GUARANTEES AFTER REFACTOR

✅ **Every session** uses schemaVersion 2
✅ **Every question** has wrapperTemplate with `__USER_CODE__`
✅ **Every question** has starterCode for all languages
✅ **Every question** has structuredTestCases (objects, not strings)
✅ **Every execution** injects code into wrapper
✅ **Every comparison** uses deepEqual on structured objects
✅ **Frontend never** falls back to problem fields
✅ **Backend never** executes legacy stdin mode
✅ **No double stringify** anywhere in chain
✅ **Hard fails** on any deviation from v2 spec

---

## 📊 REFACTOR COMPLETION SCORE

**Total Phases:** 10
**Completed:** 5 (50%)
**In Progress:** 0
**Remaining:** 5 (50%)

| Phase | Status | Files | Changes |
|-------|--------|-------|---------|
| 1 | ✅ Complete | practiceController.js | Removed v1 execution paths |
| 2 | ✅ Complete | QuestionBank.js | Added schemaVersion validation |
| 3 | ✅ Complete | practiceController.js | Already correct |
| 4 | ✅ Complete | practiceController.js | Hardened execution checks |
| 5 | ✅ Complete | PracticeProblem.tsx | Removed all fallbacks |
| 6 | ⏳ Pending | LLM service | Add JSON validation |
| 7 | ⏳ Pending | Migration script | Convert/disable v1 |
| 8 | ⏳ Pending | All backend | Remove double stringify |
| 9 | ⏳ Pending | Middleware | Global hard fails |
| 10 | ⏳ Pending | E2E tests | Validation suite |

---

## 🛠️ CURRENT BLOCKER

Cannot proceed to PHASE 7-10 without:
- Backend server running (for testing)
- At least one wrapped problem (schemaVersion 2) in database
- Judge0 API key (for execution testing)

**Recommendation:** Create seed wrapped problem and test end-to-end before proceeding.
