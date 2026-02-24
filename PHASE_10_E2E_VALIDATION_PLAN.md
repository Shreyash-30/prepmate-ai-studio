# PHASE 10: End-to-End Validation Plan

## Overview
PHASE 10 is an end-to-end validation test to ensure all wrapped execution enforcement is working correctly throughout the entire system. This test requires:
1. Backend server running
2. A wrapped test problem available
3. Frontend accessible
4. Complete flow verification

## Prerequisites

### 1. Backend Environment Setup
```bash
# In backend directory
# Set up environment variables in .env file:
MONGODB_URI=your_mongodb_uri
JUDGE0_API_KEY=your_judge0_api_key
JUDGE0_API_HOST=your_judge0_host
JWT_SECRET=test_secret
NODE_ENV=development
PORT=3001
```

### 2. Database Ready
- MongoDB must be running and accessible
- Database should have at least one schemaVersion: 2 active question
- No legacy (v1) questions should be accessible

### 3. Judge0 API Ready
- Judge0 API credentials configured
- Connection tested and working

## Test Scenario

### Step 1: Start Backend Server
```bash
cd backend
npm install  # If needed
npm start
```

Expected Output:
```
✅ Server running on port 3001
✅ MongoDB connected
✅ Route middleware loaded
```

### Step 2: Get a Wrapped Test Problem
Option A: Use an existing v2 problem
```bash
# Query database for a schemaVersion: 2 problem
node scripts/find-wrapped-problem.js
```

Option B: Create a test wrapped problem using:
```bash
# Run the wrapped problem creation script (next step)
node scripts/create-wrapped-test-problem.js
```

### Step 3: Test via API Directly (CLI)
```bash
# Start a practice session with the wrapped problem
node scripts/test-wrapped-execution-e2e.js
```

This script will:
1. Start a practice session with wrapped problem
2. Submit test code in Python
3. Verify wrapped execution works
4. Check results match v2 format
5. Validate test case visibility (public/hidden)

### Step 4: Test via Frontend
1. Open http://localhost:8080 in browser
2. Navigate to Practice
3. Select a topic (e.g., Arrays, Strings)
4. Click on any problem that appears
5. Try to load the problem

Expected Behavior:
```
✅ Session created with schemaVersion: 2
✅ Frontend loads session.starterCode
✅ Code editor shows wrapped execution
✅ Test cases display correctly
✅ Run button works with wrapped test cases
✅ Submit button works with wrapped execution
```

### Step 5: Verify Error Handling
Attempt to bypass v2 enforcement:

**Test 5a: Session With v1 Schema**
```bash
# Manually create a v1 session in database
# Try to access via API
curl -X GET "http://localhost:3001/api/practice/session/{sessionId}"
```

Expected Response:
```
❌ HTTP 400
{
  "success": false,
  "error": "Session not using wrapped execution (schemaVersion 2)",
  "code": "INVALID_SCHEMA_VERSION"
}
```

**Test 5b: Query Legacy Question**
```bash
# Try to fetch a legacy question via QuestionBank
# Database should reject non-v2 during pre-save hook
```

Expected Behavior:
```
❌ No legacy questions returned (filtered by middleware)
✅ Only v2 questions available
```

### Step 6: Code Execution Validation
In the frontend or via API:

1. **Test Code Execution**
   - Enter Python code in editor
   - Click "Run"
   - Code injected into wrapperTemplate.__USER_CODE__
   - Judge0 executes wrapped version
   - Results displayed

Expected Flow:
```
User Code: def solution(n): return n * 2
    ↓
Wrapped:   def solution(n): 
             return n * 2
           input_data = json.loads(sys.argv[1])
           result = solution(input_data['n'])
           print(json.dumps(result))
    ↓
Judge0: Executes wrapped code
    ↓
Output: {"result": 10}
    ↓
Frontend: Displays "✅ Test Passed"
```

2. **Test Submission**
   - Click "Submit"
   - Run all test cases (public + hidden)
   - Verify results show passed/failed count
   - Check next button recommends harder problem

## Validation Checklist

### ✅ Database Layer
- [ ] Only v2 questions can be saved (pre-save hook validates)
- [ ] Legacy questions cannot be created
- [ ] Query filter returns only v2, active questions
- [ ] No v1 questions accessible via API

### ✅ API Layer
- [ ] Session object contains:
  - [ ] schemaVersion: 2
  - [ ] starterCode[language]
  - [ ] testCases (testCasesStructured)
  - [ ] wrapperTemplate[language]
- [ ] submitCode endpoint rejects non-v2 sessions
- [ ] runCode endpoint rejects non-v2 sessions
- [ ] Middleware validates every request

### ✅ Frontend Layer
- [ ] Editor loads from session.starterCode only
- [ ] No fallback to problem.initialCode
- [ ] Test cases displayed from session.testCases
- [ ] No fallback to problem.testCases
- [ ] Run button requires session.testCases
- [ ] schemaVersion check on load (fail if !== 2)

### ✅ Execution Layer
- [ ] User code injected at __USER_CODE__ marker
- [ ] wrapperTemplate wraps all sides of user code
- [ ] Test cases injected as JSON
- [ ] Judge0 receives complete wrapped code
- [ ] Output parsed correctly
- [ ] Results match expected format

### ✅ Migration Status
- [ ] Legacy problems marked inactive
- [ ] User cannot practice legacy problems
- [ ] All active problems are schemaVersion: 2

## Success Criteria

✅ **PHASE 10 is complete when:**

1. Backend server starts without errors
2. At least one wrapped v2 problem loads successfully
3. Practice session created with schemaVersion: 2
4. Frontend editor displays session fields correctly
5. Code execution with wrapped template works
6. Test cases (public/hidden) visible and correct
7. Hard fail blocks attempt to access legacy questions
8. No fallback code paths triggered
9. All validation functions working correctly
10. E2E flow works: start session → edit code → run → submit

## Running the Full E2E Test

### Quick Start (Automated)
```bash
cd backend
npm start &
sleep 3
node scripts/run-phase-10-validation.js
```

### Manual Testing (For debugging)
```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Run E2E tests
cd backend
node scripts/test-wrapped-execution-e2e.js
node scripts/test-v1-rejection.js  # Verify hard fails work
```

## Expected Output

```
🧪 PHASE 10: End-to-End Validation

📋 Test 1: Backend Server Running
   ✅ PASS: Server on http://localhost:3001

📋 Test 2: Wrapped Problem Available  
   ✅ PASS: Found schemaVersion 2 question

📋 Test 3: Session Creation
   ✅ PASS: Session created with v2 schema

📋 Test 4: Frontend Integration
   ✅ PASS: Editor loads session.starterCode

📋 Test 5: Code Execution
   ✅ PASS: Wrapped execution works

📋 Test 6: Test Cases Display
   ✅ PASS: Public/hidden visibility correct

📋 Test 7: Hard Fail on v1
   ✅ PASS: Legacy rejected with 400 error

📋 Test 8: No Fallback Paths
   ✅ PASS: All enforcement active

✅ PHASE 10 E2E VALIDATION PASSED
```

## Troubleshooting

### Backend won't start
```bash
# Check MongoDB connection
npm run check-db

# Check environment variables
cat .env | grep MONGO
```

### No wrapped problems found
```bash
# Create a test wrapped problem
node scripts/create-wrapped-test-problem.js

# Or verify existing
node scripts/find-wrapped-problem.js
```

### Frontend shows "Test cases not found"
```bash
# Check session has testCasesStructured
curl http://localhost:3001/api/practice/session/{sessionId}
# Should see: "testCasesStructured": [{...}]
```

### Hard fail middleware not working
```bash
# Verify middleware is applied
grep "enforceWrappedExecutionMiddleware" src/routes/practiceRoutes.js

# Check middleware file exists
ls -la src/middleware/wrappedExecutionEnforcement.js
```

## Files for PHASE 10

- [scripts/test-wrapped-execution-e2e.js](scripts/test-wrapped-execution-e2e.js) - API-level E2E test
- [scripts/test-v1-rejection.js](scripts/test-v1-rejection.js) - Verify hard fails
- [scripts/run-phase-10-validation.js](scripts/run-phase-10-validation.js) - Full automation
- [scripts/find-wrapped-problem.js](scripts/find-wrapped-problem.js) - Find test problem

## After PHASE 10

Once validation passes:
1. Update README with new wrapped execution documentation
2. Document for developers how to generate v2 questions
3. Deprecate any v1 problem templates
4. Schedule legacy problem migration
5. Announce breaking changes to users

## Status
⏳ **PHASE 10 PENDING** - Awaiting manual backend launch and E2E validation
