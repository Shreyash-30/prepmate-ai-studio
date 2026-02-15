# ML Intelligence Layer - Testing & Validation Guide

## 1. Pre-Deployment Validation

### 1.1 Check Dependencies
```bash
cd ai-services
pip install -r requirements.txt
```

**Expected Output:**
```
Successfully installed numpy-1.24.3 scikit-learn-1.3.2 xgboost-2.0.3 scipy-1.11.4 pandas-2.1.3
```

### 1.2 Verify Installation
```bash
python -c "import numpy; import xgboost; import scikit_learn; import scipy; import pandas; print('✅ All ML dependencies installed')"
```

### 1.3 Check Models Directory
```bash
# Create models directory for persisted models
mkdir -p models
```

---

## 2. Unit Testing

### 2.1 Run Individual Service Tests
```bash
cd ai-services

# Test mastery engine
pytest test_ml_services.py::test_mastery_update -v

# Test retention model
pytest test_ml_services.py::test_retention_update -v

# Test feature engineering
pytest test_ml_services.py::test_feature_engineering -v
```

### 2.2 Run Full Test Suite
```bash
pytest test_ml_services.py -v --tb=short
```

**Expected Test Results:**
- ✅ test_mastery_update - mastery_probability > 0
- ✅ test_mastery_profile - retrieves multi-topic profile
- ✅ test_retention_update - retention_probability > 0
- ✅ test_revision_queue - returns sorted queue
- ✅ test_ml_services_workflow - end-to-end workflow
- ✅ test_feature_engineering - handles missing data gracefully

---

## 3. Service Startup Validation

### 3.1 Start FastAPI Application
```bash
cd ai-services
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
✅ LLM Intelligence Layer initialized
✅ ML Intelligence Layer initialized
INFO:     Application startup complete [00:XX:XX]
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3.2 Verify Health Endpoint
```bash
curl http://localhost:8000/ai/ml/health
```

**Expected Response:**
```json
{
  "status": "healthy",
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

## 4. Integration Tests - Manual API Testing

### 4.1 Test Mastery Engine
```bash
# Update mastery
curl -X POST http://localhost:8000/ai/ml/mastery/update \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "topic_id": "binary_trees",
    "attempts": [
      {"correct": true, "difficulty": 1, "hints_used": 0, "time_factor": 1.0},
      {"correct": true, "difficulty": 2, "hints_used": 0, "time_factor": 1.2},
      {"correct": false, "difficulty": 3, "hints_used": 1, "time_factor": 1.5}
    ]
  }'
```

**Expected Response:**
```json
{
  "mastery_probability": 0.62,
  "confidence_score": 0.78,
  "improvement_trend": "improving",
  "recommended_difficulty": 2,
  "explainability": {
    "success_rate": 0.667,
    "prior_knowledge": 0.1,
    "recent_performance": 0.68,
    "confidence": 0.78,
    "trend": "improving"
  }
}
```

### 4.2 Test Retention Model
```bash
# Update retention
curl -X POST http://localhost:8000/ai/ml/retention/update \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "topic_id": "binary_trees",
    "is_successful_revision": true,
    "time_since_last_revision_hours": 48
  }'
```

**Expected Response:**
```json
{
  "retention_probability": 0.82,
  "stability_score": 1.58,
  "next_revision_date": "2024-01-15T10:30:00",
  "days_until_revision": 3,
  "urgency_level": "medium",
  "explainability": {
    "retention_decay": 0.82,
    "next_optimal_time": "3 days",
    "confidence": 0.85
  }
}
```

### 4.3 Test Weakness Detection
```bash
curl -X POST http://localhost:8000/ai/ml/weakness/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001"
  }'
```

**Expected Response:**
```json
{
  "weak_topics": [
    {
      "topic_id": "dynamic_programming",
      "risk_score": 72,
      "factors": ["mastery_gap", "retention_decay"]
    }
  ],
  "focus_areas": ["dynamic_programming", "graph_algorithms"],
  "intervention_priority_score": 0.68,
  "explainability": {
    "analysis_time": "2024-01-12T10:30:00",
    "sample_size": 45
  }
}
```

### 4.4 Test Adaptive Planner
```bash
curl -X POST http://localhost:8000/ai/ml/planner/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "daily_study_minutes": 120,
    "timeline_days": 60,
    "target_difficulty": "medium"
  }'
```

**Expected Response:**
```json
{
  "tasks_today": [
    {
      "task_id": "task_001",
      "topic_id": "binary_trees",
      "task_type": "practice",
      "difficulty": "medium",
      "estimated_time_minutes": 45,
      "priority_score": 0.92,
      "learning_gain": 0.35
    }
  ],
  "weekly_structure": {
    "Monday": ["mock_interview"],
    "Tuesday": ["practice", "study"],
    "Wednesday": ["revision"],
    "Thursday": ["practice"],
    "Friday": ["study"],
    "Saturday": ["mock_interview"],
    "Sunday": ["revision"]
  },
  "weekly_focus": ["binary_trees", "dynamic_programming", "system_design"],
  "explainability": {
    "constraints_satisfied": true,
    "difficulty_progression": "optimal",
    "revision_priority": "respected"
  }
}
```

### 4.5 Test Readiness Prediction
```bash
curl -X POST http://localhost:8000/ai/ml/readiness/predict \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "target_company": "Google",
    "target_date": "2024-03-01"
  }'
```

**Expected Response:**
```json
{
  "readiness_score": 68,
  "confidence_score": 0.82,
  "probability_passing": 0.74,
  "time_to_readiness_days": 28,
  "estimated_readiness_date": "2024-02-09",
  "primary_gaps": ["system_design", "behavioral"],
  "explainability": {
    "model_type": "xgboost",
    "features_used": 7,
    "avg_mastery": 0.65,
    "consistency": 0.78,
    "confidence": 0.82
  }
}
```

### 4.6 Test Simulator
```bash
curl -X POST http://localhost:8000/ai/ml/simulator/run \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "daily_study_hours": 3,
    "focus_topics": ["binary_trees", "dynamic_programming"],
    "timeline_days": 30,
    "consistency": "high"
  }'
```

**Expected Response:**
```json
{
  "projected_readiness_trajectory": [55, 56, 57, 59, 61, 63, 65, ...],
  "projected_mastery_curves": {
    "binary_trees": [0.45, 0.47, 0.50, 0.52, ...],
    "dynamic_programming": [0.38, 0.40, 0.42, 0.45, ...]
  },
  "completion_forecast_date": "2024-02-15",
  "confidence_score": 0.75
}
```

---

## 5. Database Validation

### 5.1 Check MongoDB Collections
```bash
# Connect to MongoDB
mongosh

# List all collections
use prepmate_ai
db.getCollectionNames()
```

**Expected Collections:**
```
[
  "users",
  "problems",
  "submissions",
  "practice_sessions",
  "topic_mastery",           # ML - Mastery Engine
  "revision_schedule",       # ML - Retention Model
  "weak_topic_signals",      # ML - Weakness Detection
  "preparation_tasks",       # ML - Adaptive Planner
  "readiness_score",         # ML - Readiness Model
  ... (other collections)
]
```

### 5.2 Check ML Collection Indexes
```bash
db.topic_mastery.getIndexes()
```

**Expected Indexes:**
```
[
  { "_id": 1 },
  { "userId": 1, "topicId": 1 },
  { "userId": 1, "lastUpdated": -1 }
]
```

### 5.3 Query Sample ML Data
```bash
# Get mastery data for user
db.topic_mastery.findOne({ userId: "test_user_001" })

# Get revision queue
db.revision_schedule.find({ userId: "test_user_001" }).sort({ nextRevisionDate: 1 }).limit(5)

# Get weak topics
db.weak_topic_signals.find({ userId: "test_user_001" }).sort({ riskScore: -1 })
```

---

## 6. Load Testing

### 6.1 Basic Load Test (Mastery Updates)
```bash
# Install Apache Bench
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: pre-installed

# Send 100 requests, 10 concurrent
ab -n 100 -c 10 \
  -H "Content-Type: application/json" \
  -p mastery_payload.json \
  http://localhost:8000/ai/ml/mastery/update
```

**Expected Response:** Should complete in < 5 seconds

### 6.2 Create Load Test Payload
```json
{
  "user_id": "load_test_user",
  "topic_id": "binary_trees",
  "attempts": [
    {"correct": true, "difficulty": 1, "hints_used": 0, "time_factor": 1.0}
  ]
}
```

---

## 7. Model Training & Validation

### 7.1 Generate Dummy Models
```bash
cd ai-services
python -m app.ml.model_training
```

**Expected Output:**
```
Generating synthetic training data...
Generated 1000 samples with 7 features ✓
Training XGBoost readiness model...
Model trained successfully ✓
RMSE: 0.124
Feature importances: [0.25, 0.15, 0.15, ...]
Models saved to ./models ✓
```

### 7.2 Verify Model Registry
```python
from app.ml.model_registry import ModelRegistry
import motor.motor_asyncio

# Initialize
client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
db = client.prepmate_ai
registry = ModelRegistry()

# Load and inspect model
model = registry.load_model("readiness_xgboost")
info = registry.get_model_info("readiness_xgboost")
print(info)
```

---

## 8. Error Handling Verification

### 8.1 Test Invalid Input Handling
```bash
# Send invalid mastery request
curl -X POST http://localhost:8000/ai/ml/mastery/update \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "attempts": "invalid"}'
```

**Expected Response (422 Validation Error):**
```json
{
  "detail": [
    {
      "loc": ["body", "attempts"],
      "msg": "value is not a valid list",
      "type": "type_error.list"
    }
  ]
}
```

### 8.2 Test Missing Database
```bash
# Stop MongoDB
# Try API call
curl http://localhost:8000/ai/ml/mastery/profile/test_user
```

**Expected Response (500 Error with logging):**
```json
{
  "detail": "Internal server error"
}
```

---

## 9. Performance Metrics

### 9.1 Endpoint Response Times
```
GET  /ai/ml/health                      ~50ms
POST /ai/ml/mastery/update              ~200ms
GET  /ai/ml/mastery/profile/{user_id}   ~150ms
POST /ai/ml/retention/update            ~180ms
GET  /ai/ml/retention/queue/{user_id}   ~200ms
POST /ai/ml/weakness/analyze            ~300ms
POST /ai/ml/planner/generate            ~400ms
POST /ai/ml/readiness/predict           ~250ms (XGBoost) / ~100ms (fallback)
POST /ai/ml/simulator/run               ~350ms
```

### 9.2 Memory Usage
```
XGBoost Model:        ~50MB
ML Services:          ~30MB per service
MongoDB Connections:  ~5MB
Total ML Layer:       ~200MB baseline
```

---

## 10. Troubleshooting

### Issue: XGBoost Model Not Loading
**Solution:**
```python
# Falls back to LGR model automatically
# Check logs for: "Using fallback LGR model"
```

### Issue: MongoDB Connection Timeout
**Solution:**
```bash
# Verify MongoDB is running
mongosh
# Check connection string in config.py
```

### Issue: Slow Readiness Predictions
**Solution:**
```bash
# Check if XGBoost is available
python -c "import xgboost; print('XGBoost OK')"

# If not, install: pip install xgboost
```

### Issue: Feature Vector Dimension Mismatch
**Solution:**
```python
# Ensure 7 features always returned from telemetry_features
# Default features if no data: [0, 0, 0, 0, 0, 0, 0]
```

---

## 11. Deployment Checklist

- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] MongoDB running and accessible
- [ ] Models directory created (`mkdir -p models`)
- [ ] Environment variables configured (.env file)
- [ ] Health endpoint responding (`GET /ai/ml/health`)
- [ ] All 8 services showing "ready" status
- [ ] Sample API tests passing
- [ ] Database collections created with proper indexes
- [ ] No import errors in logs
- [ ] Response times within acceptable range
- [ ] Error handling verified
- [ ] Load testing completed

---

## 12. Production Deployment

### 12.1 Scale Configuration
```python
# In main.py production config:
workers = 4  # CPU cores
reload = False
log_level = "info"
```

### 12.2 Monitor Metrics
- Response times per endpoint
- Error rates (500s, 422s)
- Model inference latency
- MongoDB query times
- Memory usage per service

### 12.3 Backup Models
```bash
# Backup trained models
tar -czf models_backup_$(date +%Y%m%d).tar.gz models/

# Backup MongoDB
mongodump --db prepmate_ai --out backups/
```

---

## 13. Documentation References

- **Bayesian Knowledge Tracing**: `app/ml/mastery_engine.py` - Algorithm reference
- **Ebbinghaus Forgetting Curve**: `app/ml/retention_model.py` - Retention model
- **Risk Scoring**: `app/ml/weakness_detection.py` - Weakness detection
- **Learning Gain**: `app/ml/adaptive_planner.py` - Adaptive planning algorithm
- **XGBoost**: `app/ml/readiness_model.py` - Readiness prediction

---

**Last Updated:** 2024-01-12
**Version:** 1.0 - Production Ready
