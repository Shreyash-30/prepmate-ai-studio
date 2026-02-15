# ML Intelligence Layer - API Reference Guide

**Base URL:** `http://localhost:8000/ai/ml`

**Authentication:** Bearer token (inherited from parent FastAPI app)

**Response Format:** All endpoints return JSON with explainability metadata

---

## Health & Status

### GET /health
Check ML services status and readiness

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-12T10:30:00Z",
  "services": {
    "mastery_engine": "ready",
    "retention_model": "ready",
    "weakness_detector": "ready",
    "adaptive_planner": "ready",
    "readiness_model": "ready",
    "preparation_simulator": "ready",
    "telemetry_features": "ready",
    "model_registry": "ready"
  }
}
```

---

## Mastery Engine

### POST /mastery/update
Update user mastery probability for a topic using Bayesian Knowledge Tracing

**Request:**
```json
{
  "user_id": "string (required)",
  "topic_id": "string (required)",
  "attempts": [
    {
      "correct": "boolean",
      "difficulty": "integer (1-5)",
      "hints_used": "integer (0+)",
      "time_factor": "float (0.5-2.0)"
    }
  ]
}
```

**Response:**
```json
{
  "mastery_probability": "float (0.0-1.0)",
  "confidence_score": "float (0.0-1.0)",
  "improvement_trend": "string (improving|stable|declining)",
  "recommended_difficulty": "integer (1-5)",
  "explainability": {
    "success_rate": "float",
    "prior_knowledge": "float",
    "recent_performance": "float",
    "confidence": "float",
    "trend": "string"
  }
}
```

**Algorithm:** Bayesian Knowledge Tracing with 4 parameters
- P_INIT = 0.1 (initial knowledge)
- P_LEARN = 0.15 (learning rate per attempt)
- P_GUESS = 0.1 (guess probability)
- P_SLIP = 0.05 (slip probability)

**Example:**
```bash
curl -X POST http://localhost:8000/ai/ml/mastery/update \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "topic_id": "binary_trees",
    "attempts": [
      {"correct": true, "difficulty": 1, "hints_used": 0, "time_factor": 1.0},
      {"correct": true, "difficulty": 2, "hints_used": 0, "time_factor": 1.2}
    ]
  }'
```

---

### GET /mastery/profile/{user_id}
Retrieve user's mastery profile across all topics

**Parameters:**
- `user_id` (path): User identifier

**Response:**
```json
{
  "user_id": "string",
  "topics": [
    {
      "topic_id": "string",
      "mastery_probability": "float",
      "confidence_score": "float",
      "last_updated": "ISO datetime",
      "improvement_trend": "string"
    }
  ],
  "average_mastery": "float",
  "mastered_topics": "integer",
  "topics_at_risk": "integer",
  "last_updated": "ISO datetime"
}
```

**Example:**
```bash
curl http://localhost:8000/ai/ml/mastery/profile/user_123
```

---

## Retention Model

### POST /retention/update
Update retention probability and schedule next revision

**Request:**
```json
{
  "user_id": "string (required)",
  "topic_id": "string (required)",
  "is_successful_revision": "boolean",
  "time_since_last_revision_hours": "integer (0+)"
}
```

**Response:**
```json
{
  "retention_probability": "float (0.0-1.0)",
  "stability_score": "float (1.0-30.0)",
  "next_revision_date": "ISO datetime",
  "days_until_revision": "integer",
  "urgency_level": "string (critical|high|medium|low)",
  "explainability": {
    "retention_decay": "float",
    "next_optimal_time": "string",
    "stability_update": "string",
    "confidence": "float"
  }
}
```

**Algorithm:** Ebbinghaus Forgetting Curve
- Retention(t) = exp(-t_days / stability_days)
- Stability update on success: S' = S × 1.3 × (2.0 - (1.0 - R))
- Stability update on failure: S' = S × 0.5
- Stability bounds: [1.0, 30.0] days

**Urgency Levels:**
- `critical`: Retention < 0.30 (review immediately)
- `high`: 0.30 ≤ Retention < 0.50 (review today)
- `medium`: 0.50 ≤ Retention < 0.75 (review this week)
- `low`: Retention ≥ 0.75 (review next week)

**Example:**
```bash
curl -X POST http://localhost:8000/ai/ml/retention/update \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "topic_id": "binary_trees",
    "is_successful_revision": true,
    "time_since_last_revision_hours": 48
  }'
```

---

### GET /retention/queue/{user_id}
Get prioritized revision queue for user

**Parameters:**
- `user_id` (path): User identifier
- `limit` (query, default=10): Maximum topics to return

**Response:**
```json
[
  {
    "topic_id": "string",
    "retention": "float",
    "stability": "float",
    "next_revision_date": "ISO datetime",
    "days_until_revision": "integer",
    "urgency": "string"
  }
]
```

**Sort Order:** By urgency level, then by days_until_revision (ascending)

**Example:**
```bash
curl "http://localhost:8000/ai/ml/retention/queue/user_123?limit=5"
```

---

## Weakness Detection

### POST /weakness/analyze
Identify weak topics and areas requiring intervention

**Request:**
```json
{
  "user_id": "string (required)"
}
```

**Response:**
```json
{
  "weak_topics": [
    {
      "topic_id": "string",
      "risk_score": "float (0-100)",
      "mastery_gap": "float",
      "retention_risk": "float",
      "difficulty_gap": "float",
      "consistency_score": "float",
      "factors": ["string"]
    }
  ],
  "focus_areas": ["string"],
  "intervention_priority_score": "float (0-1)",
  "explainability": {
    "analysis_time": "ISO datetime",
    "sample_size": "integer",
    "methodology": "string",
    "threshold_applied": "float"
  }
}
```

**Risk Scoring Formula:**
```
Risk = (0.35 × mastery_gap) + (0.25 × retention_risk) + 
        (0.25 × difficulty_gap) + (0.15 × (1 - consistency))
```

**Thresholds:**
- Only includes topics with attempt_count > 20
- Risk score scale: 0-100
- Returns only topics with risk_score > 30

**Example:**
```bash
curl -X POST http://localhost:8000/ai/ml/weakness/analyze \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'
```

---

## Adaptive Planner

### POST /planner/generate
Generate personalized adaptive preparation plan

**Request:**
```json
{
  "user_id": "string (required)",
  "daily_study_minutes": "integer (min 30, max 480)",
  "timeline_days": "integer (min 1, max 365)",
  "target_difficulty": "string (easy|medium|hard)"
}
```

**Response:**
```json
{
  "tasks_today": [
    {
      "task_id": "string",
      "topic_id": "string",
      "task_type": "string (practice|study|revision|mock_interview)",
      "difficulty": "string (easy|medium|hard)",
      "estimated_time_minutes": "integer",
      "priority_score": "float (0-1)",
      "learning_gain": "float",
      "explainability": "object"
    }
  ],
  "weekly_structure": {
    "[Day]": ["task_type"]
  },
  "weekly_focus": ["string"],
  "statistics": {
    "total_weekly_hours": "float",
    "estimated_mastery_gain": "float",
    "difficulty_progression": "string"
  },
  "explainability": {
    "algorithm": "string",
    "constraints_satisfied": "boolean",
    "optimization_metric": "string"
  }
}
```

**Learning Gain Algorithm:**
```
LG = (1 - mastery) × topic_importance × learning_multiplier

learning_multiplier:
  - 1.5 if retention < 0.5 (spaced repetition boost)
  - 1.2 if difficulty_match > 0.7 (optimal difficulty)
  - 1.0 otherwise
```

**Priority Calculation:**
```
priority = (0.6 × learning_gain) + (0.4 × urgency)
boosted by 1.3× if mastery < 0.4
```

**Topic Importance Weights:**
- data_structures: 0.95
- algorithms: 0.93
- system_design: 0.85
- databases: 0.70
- oop: 0.65
- networking: 0.50

**Time Estimates:**
- practice: 45 minutes
- study: 30 minutes
- revision: 20 minutes
- mock_interview: 120 minutes

**Example:**
```bash
curl -X POST http://localhost:8000/ai/ml/planner/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "daily_study_minutes": 120,
    "timeline_days": 60,
    "target_difficulty": "medium"
  }'
```

---

## Readiness Model

### POST /readiness/predict
Predict interview readiness and confidence

**Request:**
```json
{
  "user_id": "string (required)",
  "target_company": "string (optional)",
  "target_date": "ISO date (optional)"
}
```

**Response:**
```json
{
  "readiness_score": "float (0-100)",
  "confidence_score": "float (0-1)",
  "probability_passing": "float (0-1)",
  "time_to_readiness_days": "integer",
  "estimated_readiness_date": "ISO datetime",
  "primary_gaps": ["string"],
  "recommendations": ["string"],
  "explainability": {
    "model_type": "string (xgboost|linear)",
    "features_used": "integer",
    "feature_contributions": "object",
    "confidence": "float"
  }
}
```

**Feature Vector (7D):**
1. avg_mastery (weight: 0.25)
2. stability_score (weight: 0.15)
3. consistency (weight: 0.15)
4. difficulty_progression (weight: 0.15)
5. mock_interview_score (weight: 0.15)
6. completion_rate (weight: 0.10)
7. days_prepared (weight: 0.05)

**Model:** XGBoost (primary) with LGR fallback

**Passing Probability:**
```
P(pass) = 1 / (1 + exp(-5 × (readiness/100 - 0.5)))
```

**Time to Readiness:**
```
time_days = (100 - readiness) / 2
(assumes ~2 points/day improvement with current study pace)
```

**Example:**
```bash
curl -X POST http://localhost:8000/ai/ml/readiness/predict \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "target_company": "Google",
    "target_date": "2024-03-01"
  }'
```

---

## Simulator

### POST /simulator/run
Simulate preparation scenarios and project learning trajectories

**Request:**
```json
{
  "user_id": "string (required)",
  "daily_study_hours": "float (0.5-12.0)",
  "focus_topics": ["string"],
  "timeline_days": "integer (1-365)",
  "consistency": "string (high|medium|low)"
}
```

**Response:**
```json
{
  "projected_readiness_trajectory": ["float"],
  "projected_mastery_curves": {
    "[topic_id]": ["float"]
  },
  "completion_forecast_date": "ISO datetime",
  "estimated_hours_required": "float",
  "confidence_score": "float (0-1)",
  "key_milestones": [
    {
      "day": "integer",
      "milestone": "string",
      "projected_readiness": "float"
    }
  ]
}
```

**Simulation Parameters:**

**Consistency Multiplier:**
- high: 1.2× improvement rate
- medium: 1.0× improvement rate
- low: 0.7× improvement rate

**Daily Improvement Rate:**
```
Δ readiness = 0.02 × (daily_hours / 2.0) × consistency_factor

For focus topics: +apply_factor
For other topics: 0.005 × consistency_factor (passive)
```

**Completion Criteria:** Readiness score reaches 80

**Example:**
```bash
curl -X POST http://localhost:8000/ai/ml/simulator/run \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "daily_study_hours": 3,
    "focus_topics": ["binary_trees", "dynamic_programming"],
    "timeline_days": 60,
    "consistency": "high"
  }'
```

---

## Error Handling

### Common HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | All operations complete |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid user_id format |
| 404 | Not Found | User has no mastery data |
| 422 | Validation Error | Invalid field types |
| 500 | Server Error | Database connection failed |
| 503 | Service Unavailable | ML service not initialized |

### Error Response Format
```json
{
  "detail": "string",
  "error_code": "string",
  "timestamp": "ISO datetime"
}
```

### Error Handling Strategy
- All endpoints validate input with Pydantic
- Invalid requests return 422 with validation details
- Missing dependencies fall back to secondary methods
- Database errors logged and return 500 with generic message
- Services check initialization on startup

---

## Rate Limiting & Performance

### Recommended Limits
- Mastery updates: 1000/minute per user
- Readiness predictions: 100/minute per user
- Planner generation: 20/minute per user (computationally intensive)
- Retention queue: 500/minute per user

### Expected Response Times
- Mastery update: 150-250ms
- Retention update: 150-200ms
- Weakness analysis: 200-400ms
- Readiness prediction: 200-400ms (XGBoost) / 50-100ms (fallback)
- Planner generation: 300-600ms
- Simulator: 300-500ms
- Health check: 20-50ms

### Optimization Tips
- Cache readiness predictions for 1 hour per user
- Pre-compute mastery profiles nightly
- Use revision queue results for 24 hours
- Batch weakness analysis across users

---

## Models & Algorithms

### Bayesian Knowledge Tracing
- **File:** `app/ml/mastery_engine.py`
- **Parameters:** P_INIT, P_LEARN, P_GUESS, P_SLIP
- **Output:** Mastery probability, confidence, trend

### Ebbinghaus Forgetting Curve
- **File:** `app/ml/retention_model.py`
- **Formula:** R(t) = exp(-t / S)
- **Output:** Retention probability, next review date

### Risk Scoring Engine
- **File:** `app/ml/weakness_detection.py`
- **Weights:** 0.35 mastery, 0.25 retention, 0.25 difficulty, 0.15 consistency
- **Output:** Risk scores for weak topics

### Adaptive Planning
- **File:** `app/ml/adaptive_planner.py`
- **Metric:** Learning gain optimization
- **Output:** Prioritized task list with weekly structure

### XGBoost Readiness
- **File:** `app/ml/readiness_model.py`
- **Features:** 7D vector with domain-weighted importance
- **Fallback:** Linear logistic regression

### Preparation Simulator
- **File:** `app/ml/simulator.py`
- **Approach:** Linear projection with consistency factors
- **Output:** Trajectory and completion date

---

## Database Schema

### Collections Used by ML Services

#### topic_mastery
```json
{
  "userId": "string",
  "topicId": "string",
  "mastery_probability": "float",
  "confidence_score": "float",
  "prior_knowledge": "float",
  "learning_rate": "float",
  "attempt_count": "integer",
  "success_count": "integer",
  "recent_performance": "float",
  "improvement_trend": "string",
  "lastUpdated": "date"
}
```

#### revision_schedule
```json
{
  "userId": "string",
  "topicId": "string",
  "retention_probability": "float",
  "stability_score": "float",
  "nextRevisionDate": "date",
  "lastRevisionDate": "date",
  "urgency_level": "string",
  "lastUpdated": "date"
}
```

#### weak_topic_signals
```json
{
  "userId": "string",
  "topicId": "string",
  "riskScore": "float",
  "mastery_gap": "float",
  "retention_risk": "float",
  "difficulty_gap": "float",
  "detected_at": "date"
}
```

#### preparation_tasks
```json
{
  "userId": "string",
  "topicId": "string",
  "taskType": "string",
  "difficulty": "string",
  "priority_score": "float",
  "scheduledDate": "date",
  "estimatedMinutes": "integer",
  "created_at": "date"
}
```

#### readiness_score
```json
{
  "userId": "string",
  "targetCompany": "string",
  "readiness_score": "float",
  "confidence_score": "float",
  "probability_passing": "float",
  "predicted_at": "date"
}
```

---

## Authentication & Authorization

All endpoints inherit authentication from parent FastAPI app.

**Required Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Scope:** All endpoints require `read:ai` and `write:ai` scopes

---

## Pagination & Filtering

Most listing endpoints support:
- `limit` (default: 10, max: 100)
- `offset` (default: 0)
- `sort_by` (default endpoint-specific)
- `sort_order` (asc|desc, default: asc)

---

## Webhooks (Optional)

Future enhancement: Events fired on mastery thresholds, weak topic detection, readiness milestone changes

---

**API Version:** 1.0
**Last Updated:** 2024-01-12
**Status:** Production Ready
