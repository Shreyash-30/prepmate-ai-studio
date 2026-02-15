# PrepMate AI Backend - Integration Implementation

This document outlines the Platform Integration foundation for the adaptive preparation platform.

## Overview

The platform integration system allows users to connect their coding platform accounts (LeetCode, Codeforces) to PrepMate AI, automatically fetching their submissions and profile data for adaptive learning.

## Architecture

### Models

#### IntegrationAccount
- Stores user's connection to external platforms
- Tracks connection and bootstrap status
- Fields: userId, platform, username, connectionStatus, bootstrapStatus, connectedAt, lastSyncAt

#### ExternalPlatformProfile
- Normalized profile data from external platforms
- Fields: userId, platform, username, totalSolved, acceptanceRate, contestRating, ranking, badges, lastFetchedAt

#### ExternalPlatformSubmission
- Normalized submission/problem-solving data
- Fields: userId, platform, platformSubmissionId, problemId, problemTitle, difficulty, tags, status, language, runtime, memory, submissionTime
- Unique index: (userId, platform, platformSubmissionId)

#### IntegrationSyncLog
- Audit trail of all sync operations
- Fields: userId, platform, status, recordsFetched, recordsInserted, recordsDuplicated, startTime, endTime, durationMs, errorMessage

### Services

#### integrationBootstrapService
- Core service that orchestrates the sync process
- Functions:
  - `bootstrap(userId, platform, username)` - Synchronous bootstrap
  - `bootstrapAsync(userId, platform, username)` - Non-blocking background execution

Flow:
1. Set bootstrapStatus to 'running'
2. Fetch profile from platform service
3. Fetch submissions from platform service
4. Normalize data
5. Upsert profile data
6. Bulk upsert submissions (duplicate-safe)
7. Update IntegrationAccount status
8. Create IntegrationSyncLog

#### leetcodeIntegrationService
- GraphQL integration with LeetCode API
- Functions:
  - `fetchProfile(username)` - Get user profile
  - `fetchSubmissions(username, limit)` - Get recent accepted submissions

#### codeforcesIntegrationService
- REST API integration with Codeforces
- Functions:
  - `fetchProfile(username)` - Get user info and rating
  - `fetchSubmissions(username, limit)` - Get submissions

### Controllers

#### integrationController
- API endpoint handlers
- Endpoints:
  - POST /api/integrations/connect
  - GET /api/integrations/status
  - POST /api/integrations/resync/:platform
  - DELETE /api/integrations/:platform

## API Endpoints

### POST /api/integrations/connect
Connect a new platform account.

**Request Body:**
```json
{
  "platform": "leetcode",
  "username": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Integration started. Syncing in background...",
  "data": {
    "platform": "leetcode",
    "username": "user123",
    "connectionStatus": "pending",
    "bootstrapStatus": "pending"
  }
}
```

### GET /api/integrations/status
Get all connected platforms and their status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "platform": "leetcode",
      "username": "user123",
      "connectionStatus": "connected",
      "bootstrapStatus": "completed",
      "lastSyncAt": "2024-02-15T10:30:00Z",
      "errorMessage": null,
      "connectedAt": "2024-02-14T15:20:00Z",
      "profile": {
        "totalSolved": 185,
        "acceptanceRate": 0,
        "lastFetchedAt": "2024-02-15T10:30:00Z"
      }
    }
  ]
}
```

### POST /api/integrations/resync/:platform
Manually trigger a resync for a platform.

**Response:**
```json
{
  "success": true,
  "message": "Resync initiated for leetcode",
  "data": {
    "platform": "leetcode",
    "username": "user123"
  }
}
```

### DELETE /api/integrations/:platform
Disconnect from a platform.

**Response:**
```json
{
  "success": true,
  "message": "Successfully disconnected from leetcode"
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/prepmate-ai-studio

# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d
```

### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use local MongoDB
mongod
```

### 4. Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will be available at `http://localhost:8000`

## Usage

### From Frontend

The frontend has been updated to use the new integration API. The Integrations page now:

1. Fetches all connected platforms
2. Displays connection status and profile info
3. Allows connecting new accounts with username input
4. Supports manual resync
5. Allows disconnecting from platforms

## Data Flow

1. **User initiates connection** → POST /api/integrations/connect
2. **Backend creates IntegrationAccount** with pending status
3. **Bootstrap service starts asynchronously** via setImmediate
4. **Platform service fetches profile & submissions**
5. **Data is normalized and saved to MongoDB**
6. **IntegrationAccount status is updated to connected**
7. **Frontend polls for status updates** or uses WebSocket (future)

## Future Enhancements

1. **ML Pipeline Integration**: ExternalPlatformSubmission data will feed into adaptive learning algorithms
2. **LLM Analysis**: Use Gemini to analyze submission patterns and generate insights
3. **WebSocket Updates**: Real-time sync status updates instead of polling
4. **Queue System**: Add task queue for better sync management at scale
5. **More Platforms**: Expand to include HackerRank, CodeSignal, etc.
6. **Submission Analysis**: Track compilation errors, time to solve, etc.

## Error Handling

### Connection Failures
- Invalid username: Returns 400 error
- Network timeout: Retries with exponential backoff
- API rate limit: Queues request for later

### Sync Failures
- Logged in IntegrationSyncLog with error message
- IntegrationAccount status set to 'failed'
- User can retry via manual resync button

## Performance Considerations

1. **Indexing**: All queries optimized with compound indexes
2. **Batch Operations**: Submissions upserted in bulk for efficiency
3. **Duplicate Prevention**: Unique index prevents duplicate submissions
4. **Non-blocking**: Bootstrap runs asynchronously via setImmediate
5. **Pagination**: Large submission lists handled with limit parameter

## Database Indexes

```javascript
// IntegrationAccount
- (userId, platform) unique

// ExternalPlatformProfile
- (userId, platform)

// ExternalPlatformSubmission
- (userId, platform)
- (userId, platform, platformSubmissionId) unique

// IntegrationSyncLog
- (userId, platform, createdAt)
```

## Testing

### Test Connection
```bash
curl -X POST http://localhost:8000/api/integrations/connect \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "leetcode",
    "username": "test_user"
  }'
```

### Check Status
```bash
curl -X GET http://localhost:8000/api/integrations/status \
  -H "Authorization: Bearer your_token"
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file

### LeetCode API Timeout
- LeetCode GraphQL might have rate limits
- Add retry logic with exponential backoff

### Codeforces API Issues
- Check username spelling (case-sensitive)
- Ensure internet connectivity

## Security Considerations

1. **Authentication**: All endpoints require valid Bearer token
2. **Rate Limiting**: Should be added for production
3. **Input Validation**: Username length and platform validation
4. **Error Messages**: Avoid exposing sensitive information
5. **CORS**: Configured to allow frontend-only requests
