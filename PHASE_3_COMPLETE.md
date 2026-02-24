# Phase 3: Express Routes Integration - COMPLETE ✅

## Overview

Phase 3 implements Express backend routes that orchestrate the complete practice workflow:
- **Session Management**: Create/get practice sessions
- **Code Submission**: Submit code, run Docker sandbox, get verdict
- **AI Features**: Request hints, code reviews, inline suggestions, explanation scoring
- **Cost Governance**: Enforce token limits, hint limits, cost thresholds  
- **ML Integration**: Enqueue async jobs for mastery/readiness updates
- **Streaming & Async**: Non-blocking submission with async ML processing

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ Express Backend (Port 8000)                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ POST /api/practice/session/start                             │
│   → Creates PracticeSession with idempotencyKey            │
│   ← Returns {sessionId, sessionKey, createdAt}              │
│                                                                │
│ POST /api/practice/submit                                     │
│   → Code + problem ID                                        │
│   → Runs DockerSandboxJudge (isolated execution)            │
│   → Enqueues ML jobs (masteryUpdate, readinessPrediction)  │
│   ← Returns {verdict, passedTests, mlJobIds}                │
│                                                                │
│ GET /api/practice/session/:sessionId                          │
│   → Returns session state, cost governance, verdict          │
│                                                                │
│ POST /api/practice/hint/:sessionId                            │
│   → Validates cost governance                                │
│   → Calls POST /ai/hint/generate (FastAPI)                  │
│   → Updates PracticeSession                                  │
│   ← Returns {level, text, dependencyWeight}                  │
│                                                                │
│ POST /api/practice/inline-assist/:sessionId                   │
│   → Calls POST /ai/assist/inline (FastAPI)                  │
│   → Tracks cost                                              │
│   ← Returns {suggestion, confidence, type}                    │
│                                                                │
│ POST /api/practice/review/:sessionId                          │
│   → Calls POST /ai/practice/review (FastAPI)                │
│   → Returns structured code quality scores                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
         ↓                      ↓                      ↓
┌────────────────────────────────────────────────────────────────┐
│ Python FastAPI (Port 8001)                                     │
├────────────────────────────────────────────────────────────────┤
│ /ai/hint/generate         (SSE streaming)                      │
│ /ai/practice/review       (structured JSON)                    │
│ /ai/explanation/score     (structured JSON)                    │
│ /ai/assist/inline         (fast response)                      │
│ /ai/health                (provider status)                    │
│ /ai/metrics               (aggregated metrics)                 │
└────────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────────┐
│ Supporting Services                                            │
├────────────────────────────────────────────────────────────────┤
│ Docker Sandbox Judge      (isolated code execution)            │
│ Job Queue Service         (BullMQ + Redis async jobs)          │
│ AI Observability Service  (metrics & telemetry)                │
│ MongoDB PracticeSession   (session state, cost tracking)       │
│ Cost Governance Middleware (token/hint/call limits)            │
└────────────────────────────────────────────────────────────────┘
```

## Routes Summary

### 1. Session Start
**Endpoint**: `POST /api/practice/session/start`

**Request**:
```json
{
  "problemId": "60f7b3d1c4a1e5f3a9b2c1d2",
  "topicId": "arrays",
  "language": "python"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "67a8c9d2e3f4a5b6c7d8e9f0",
    "sessionKey": "uuid-string-here",
    "createdAt": "2026-02-22T12:00:00Z"
  }
}
```

**Backend Flow**:
1. Verify user authentication
2. Create PracticeSession record with idempotencyKey
3. Initialize cost governance (maxHints=5, maxLLMCalls=20, maxTokens=10000, maxCost=$2.00)
4. Return sessionId for use in subsequent requests

### 2. Submit Solution
**Endpoint**: `POST /api/practice/submit`

**Request**:
```json
{
  "sessionId": "67a8c9d2e3f4a5b6c7d8e9f0",
  "code": "def solve():\n    return 42",
  "explanation": "Uses mathematical principle...",
  "voiceTranscript": "I think the approach is..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "67a8c9d2e3f4a5b6c7d8e9f0",
    "verdict": "accepted",
    "passedTests": 5,
    "totalTests": 5,
    "executionTime": 1.23,
    "memoryUsed": 45.6,
    "mlJobIds": {
      "masteryUpdateJobId": "job_123",
      "retentionUpdateJobId": "job_124",
      "weaknessAnalysisJobId": "job_125",
      "readinessPredictionJobId": "job_126"
    }
  }
}
```

**Backend Flow**:
1. Fetch PracticeSession
2. Verify ownership (userId matches)
3. Run code in **DockerSandboxJudge** (isolated, 256MB, 2s timeout)
4. Get verdict (accepted, wrong_answer, timeout, memory_exceeded, runtime_error)
5. Update session with submissionResult, telemetry, dependencyScore
6. **Enqueue 4 ML jobs** (non-blocking):
   - masteryUpdateJobId: Updates learner mastery based on solve_time + independence_score
   - retentionUpdateJobId: Tracks forgetting curve & practice frequency
   - weaknessAnalysisJobId: Identifies problem patterns
   - readinessPredictionJobId: Predicts interview readiness
7. Log to AIObservabilityService
8. Return immediately (jobs run async in background)

### 3. Get Session State
**Endpoint**: `GET /api/practice/session/:sessionId`

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "67a8c9d2e3f4a5b6c7d8e9f0",
    "status": "completed",
    "code": "def solve():\n    return 42",
    "verdict": "accepted",
    "passedTests": 5,
    "totalTests": 5,
    "hints": 2,
    "costRemaining": {
      "hints": 3,
      "llmCalls": 18,
      "tokensRemaining": 9800
    },
    "dependencyScore": {
      "hintDependency": 0.25,
      "voiceDependency": 0.1,
      "retryDependency": 0.05,
      "totalDependencyScore": 0.4,
      "independenceScore": 0.6
    }
  }
}
```

### 4. Request Hint
**Endpoint**: `POST /api/practice/hint/:sessionId`

**Request**:
```json
{
  "hintLevel": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "level": 1,
    "text": "Consider iterating through the array with two pointers...",
    "dependencyWeight": 0.2
  }
}
```

**Backend Flow** (practiceSessionService):
1. Verify cost governance: `canRequestHint()`
   - Check: hintCallCount < 5
   - Check: totalTokens < 10000
   - Check: totalCost < $2.00
2. Call **FastAPI POST /ai/hint/generate**
3. Estimate tokens: 50 * (level/2) ≈ 25-100 tokens
4. Estimate cost: tokens * $0.0001
5. Update PracticeSession:
   - Add hint to hints array {level, text, tokensUsed, requestedAt}
   - Increment hintCallCount
   - Update llmUsageTokens
   - Update llmCostEstimate
   - Update telemetry.hint_levels_used
6. Recompute dependencyScore
7. Log to AIObservabilityService
8. Return hint

**Error Handling**:
- 404: Session not found
- 403: Unauthorized (not session owner)
- 429: Hint limit exceeded

### 5. Request Inline Assistance
**Endpoint**: `POST /api/practice/inline-assist/:sessionId`

**Request**:
```json
{
  "codeChunk": "for i in range(len(arr)):\n    for j in range(i+1, len(arr)):",
  "context": "Finding two numbers that sum to target"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestion": "Consider using a hash set for O(n) efficiency",
    "confidence": 0.85,
    "type": "idiom",
    "codeSnippet": "seen = set()\nfor num in arr:\n    if target - num in seen:\n        return [target - num, num]\n    seen.add(num)"
  }
}
```

**Backend Flow**:
1. Check: `canMakeLLMCall()`
2. Limit codeChunk to 1500 chars
3. Call **FastAPI POST /ai/assist/inline**
4. Estimate: ~30 tokens, $0.003 cost
5. Update session cost governance
6. Return suggestion

### 6. Request Code Review
**Endpoint**: `POST /api/practice/review/:sessionId`

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": "Brute force solution with O(n²) complexity, good variable names...",
    "scores": {
      "readability": 0.85,
      "structure": 0.80,
      "naming": 0.75,
      "errorHandling": 0.60,
      "optimization": 0.40
    },
    "insights": "Consider hash table for O(n) solution, good for interviews...",
    "improvements": ["Use hash set", "Add edge case handling"],
    "strengths": ["Clear variable names", "Correct logic"]
  }
}
```

**Backend Flow**:
1. Check: `canMakeLLMCall()`
2. Validate user submitted code (not empty)
3. Call **FastAPI POST /ai/practice/review**
4. Estimate: ~200 tokens, $0.02 cost
5. Store codeReview in session
6. Return structured response

## Implementation Files

### New/Modified Files

**1. backend/src/routes/practiceRoutes.js** ✅
- Added 6 new Phase 3 routes
- All routes require authentication (auth middleware)
- Routes:
  - POST /session/start
  - POST /submit
  - GET /session/:sessionId
  - POST /hint/:sessionId
  - POST /inline-assist/:sessionId
  - POST /review/:sessionId

**2. backend/src/controllers/practiceController.js** ✅
- Added 5 new controller functions:
  - `startSession()` - creates PracticeSession
  - `submitPractice()` - orchestrates submission
  - `getSession()` - returns session state
  - `requestHint()` - proxies to FastAPI
  - `requestInlineAssist()` - proxies to FastAPI
  - `requestCodeReview()` - proxies to FastAPI

**3. backend/src/services/practiceSessionService.js** ✅ NEW
- Orchestration service (360+ lines)
- Functions:
  - `submitPractice()` - Docker sandbox + ML jobs
  - `getHint()` - FastAPI call + cost tracking
  - `getInlineAssistance()` - FastAPI call + cost tracking
  - `getCodeReview()` - FastAPI call + storage
  - `scoreExplanation()` - FastAPI call + evaluation
  - `getSessionCostSummary()` - cost report
- All functions:
  - Call FastAPI with retry logic (3 attempts)
  - Track tokens used and estimated cost
  - Update PracticeSession
  - Log via AIObservabilityService
  - Handle errors gracefully

**4. backend/.env** ✅ UPDATED
- Changed `AI_SERVICE_URL=http://localhost:8001` (was 8000)

**5. backend/src/models/PracticeSession.js** ✅ (from Phase 1)
- Already complete with all required fields
- No changes needed

**6. backend/src/services/DockerSandboxJudge.js** ✅ (from Phase 1)
- Already integrated
- Used in submitPractice()

**7. backend/src/services/JobQueueService.js** ✅ (from Phase 1)
- Already integrated
- Used for `enqueueSubmissionMLJobs()`

**8. backend/src/services/AIObservabilityService.js** ✅ (from Phase 1)
- Already integrated
- Logs all LLM calls and sandbox executions

## Request/Response Flow

### Complete Practice Flow (User Perspective)

```
1. User opens problem
   POST /api/practice/session/start
   ← sessionId

2. User builds solution
   (no network calls)

3. User clicks "Submit"
   POST /api/practice/submit {code, explanation}
   ├→ DockerSandboxJudge (isolated execution)
   ├→ Get verdict: accepted/wrong_answer/timeout
   ├→ Enqueue ML jobs (async, non-blocking)
   └← Return {verdict, passedTests, mlJobIds}

4. User requests hint (optional)
   POST /api/practice/hint/:sessionId {hintLevel}
   ├→ Check cost governance (limit=5 hints)
   ├→ Call FastAPI /ai/hint/generate (streaming)
   ├→ Update session, track cost
   └← Return {level, text, dependencyWeight}

5. User requests inline suggestion (optional)
   POST /api/practice/inline-assist/:sessionId {codeChunk}
   ├→ Check cost governance (limit=20 LLM calls)
   ├→ Call FastAPI /ai/assist/inline
   ├→ Update session, track cost
   └← Return {suggestion, confidence, type}

6. User submits explanation (optional)
   GET /api/practice/session/:sessionId
   ← Show hints used, cost remaining, dependencyScore

7. Background: ML jobs complete
   - Mastery updated: effective_learning = P_LEARN * independenceScore
   - Retention tracked: next review scheduled
   - Weaknesses identified: problem pattern analysis
   - Readiness scored: interview preparation level
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: problemId, topicId, language"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized (not session owner)"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Practice session not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Hint limit reached (5 hints per session)"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to [operation]",
  "error": "Detailed error message"
}
```

## Cost Governance

All Phase 3 submissions are governed by these limits:

| Metric | Limit | Enforcement |
|--------|-------|-------------|
| Hints per session | 5 | Return 429 on 6th hint |
| LLM calls per session | 20 | Return 429 on 21st call |
| Tokens per session | 10,000 | Return 429 when exceeded |
| Cost per session | $2.00 | Return 429 when threshold exceeded |
| Code chunk max | 1,500 chars | Truncated in inline assist |
| Hint levels | 1-4 | Clamped to range |

## Telemetry Collected

Per PracticeSession:

```
telemetry: {
  solve_time: float (seconds)
  retry_count: int
  hint_levels_used: int (max hint level requested)
  voice_solution_ratio: float (0-1)
  strategy_change_count: int
  optimized_solution_flag: bool
  explanation_quality_score: float (0-1, set after scoring)
  independence_score: float (0-1, from dependencyScore)
}

dependencyScore: {
  hintDependency: float = (hint_levels_used / 4) * 0.5
  voiceDependency: float = voice_solution_ratio * 0.3
  retryDependency: float = (retry_count / 10) * 0.2
  totalDependencyScore: float (sum of above)
  independenceScore: float = 1 - totalDependencyScore
}
```

## Integration with ML Pipeline

Phase 3 automatically enqueues jobs when submission completes:

```javascript
// After DockerSandboxJudge returns verdict:
const jobs = await JobQueueService.enqueueSubmissionMLJobs(
  sessionId,
  userId,
  topicId,
  {
    verdict: 'accepted',
    passedTests: 5,
    totalTests: 5,
    dependencyScore: 0.4,
    codeLength: 156,
    solveTime: 45.2
  }
);

// Jobs run async in Redis workers
// (Phase 4 will update ML intelligence with results)
```

## Testing Checklist

- ✅ POST /api/practice/session/start creates session
- ✅ POST /api/practice/submit runs Docker sandbox + enqueues jobs
- ✅ GET /api/practice/session/:sessionId returns state
- ✅ POST /api/practice/hint/:sessionId calls FastAPI hint endpoint
- ✅ POST /api/practice/inline-assist/:sessionId calls FastAPI
- ✅ POST /api/practice/review/:sessionId calls FastAPI review
- ✅ Cost governance enforces limits (429 on exceed)
- ✅ Telemetry collected in PracticeSession
- ✅ AI_SERVICE_URL correctly points to localhost:8001
- ✅ FastAPI endpoints responding with correct schemas
- ✅ Errors handled gracefully (404, 403, 429, 500)

## Next Phase (Phase 4: ML Enhancements)

Phase 4 will:
1. Create ML job workers (process BullMQ jobs)
2. Update TelemetryFeatures (extract features from telemetry)
3. Update MasteryEngine (use independence_score for effective learning)
4. Update ReadinessModel (incorporate explanation scores)
5. Implement WeaknessDetection (pattern analysis)
6. Create AdaptivePlanner (next problem recommendations)

ML Pipeline Activation:
```javascript
// When masteryUpdateJobId completes:
mastery_update = P_LEARN * (1 - hint_dependency) * (1 - voice_ratio)
                = 0.85 * (1 - 0.25) * (1 - 0.1)
                = 0.85 * 0.75 * 0.9
                = 0.574 (57.4% effective learning)

// Store in UserTopicProgression:
progression.masteryScore = mastery_update
progression.lastSolveTime = 45.2s
progression.independenceScore = 0.6
```

## Deployment Status

✅ **Phase 3: COMPLETE**

**Routes Implemented**: 6 new Express routes
**Services Created**: practiceSessionService (360+ lines)
**Integration Points**: 
- PracticeSession model (Phase 1) ✅
- DockerSandboxJudge service (Phase 1) ✅
- JobQueueService (Phase 1) ✅
- AIObservabilityService (Phase 1) ✅
- FastAPI Phase 2 endpoints ✅
- Cost governance (Phase 1) ✅

**API Endpoints Status**: All 6 routes registered and tested
**Backend Server**: Running on port 8000
**FastAPI Server**: Running on port 8001
**Database**: MongoDB connected
**Job Queue**: Redis + BullMQ ready

---

## Summary

Phase 3 **successfully bridges** the gap between:
- **Express backend** (requests) ↔ **FastAPI services** (AI endpoints)
- **Synchronous submissions** ↔ **Asynchronous ML processing**
- **Real-time feedback** (hints, reviews) ↔ **Background intelligence** (mastery updates)

All Phase 3 routes are **production-ready**, fully integrated with cost governance, error handling, and telemetry collection.

**Next**: Phase 4 - ML Enhancements
