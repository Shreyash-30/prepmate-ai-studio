# PrepMate AI - Backend

Express.js + MongoDB backend for the adaptive interview preparation platform.

## Overview

This backend implements the Platform Integration foundation that allows users to:
- Connect their LeetCode and Codeforces accounts
- Automatically fetch their submissions and profile data
- Store normalized telemetry for future adaptive learning
- Track synchronization history and status

## Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **HTTP Client**: Axios
- **Logging**: Morgan
- **CORS**: Express CORS middleware
- **Environment**: dotenv

## Project Structure

```
backend/
├── src/
│   ├── app.js                 # Express app setup
│   ├── config/
│   │   └── database.js        # MongoDB connection
│   ├── controllers/
│   │   └── integrationController.js   # API handlers
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── models/
│   │   ├── IntegrationAccount.js
│   │   ├── ExternalPlatformProfile.js
│   │   ├── ExternalPlatformSubmission.js
│   │   └── IntegrationSyncLog.js
│   ├── routes/
│   │   └── integrationRoutes.js       # Route definitions
│   └── services/
│       ├── integrationBootstrapService.js
│       ├── leetcodeIntegrationService.js
│       └── codeforcesIntegrationService.js
├── package.json
├── .env.example
├── INTEGRATION_SETUP.md
├── QUICKSTART.md
└── README.md (this file)
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start MongoDB
```bash
# Docker
docker run -d -p 27017:27017 mongo:latest

# Or local installation
mongod
```

### 4. Run Server
```bash
npm run dev    # Development with auto-reload
npm start      # Production
```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## API Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### Integration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/integrations/connect` | Connect a new platform account |
| GET | `/api/integrations/status` | Get all connected platforms |
| POST | `/api/integrations/resync/:platform` | Manually trigger resync |
| DELETE | `/api/integrations/:platform` | Disconnect from platform |

### Health Check

- `GET /health` - Server health status

## Core Features

### 1. Platform Integration
- **LeetCode**: GraphQL API integration for profile & submissions
- **Codeforces**: REST API integration for stats & submissions
- Extensible architecture for adding more platforms

### 2. Data Normalization
All platform data is normalized into consistent schemas:
- Unified difficulty levels (Easy, Medium, Hard)
- Consistent tag format across platforms
- Standardized submission status

### 3. Background Sync
- Non-blocking sync using `setImmediate()`
- Immediate API response while data syncs in background
- Automatic retry on failure
- Complete sync audit trail

### 4. Duplicate Handling
- Unique indexes prevent duplicate submissions
- Upsert operations safely update existing records
- Detailed sync logs track duplicates and new records

## Database Schema

### IntegrationAccount
User's platform connections with sync tracking.

```javascript
{
  userId: ObjectId,
  platform: "leetcode" | "codeforces",
  username: String,
  connectionStatus: "pending" | "connected" | "failed",
  bootstrapStatus: "pending" | "running" | "completed" | "failed",
  connectedAt: Date,
  lastSyncAt: Date,
  errorMessage: String
}
```

### ExternalPlatformProfile
Cached user profile from external platforms.

```javascript
{
  userId: ObjectId,
  platform: String,
  username: String,
  totalSolved: Number,
  acceptanceRate: Number,
  contestRating: Number,
  ranking: Number,
  badges: [String],
  lastFetchedAt: Date
}
```

### ExternalPlatformSubmission
Individual problem submissions for ML analysis.

```javascript
{
  userId: ObjectId,
  platform: String,
  platformSubmissionId: String,
  problemId: String,
  problemTitle: String,
  difficulty: "Easy" | "Medium" | "Hard",
  tags: [String],
  status: String,
  language: String,
  runtime: String,
  memory: String,
  submissionTime: Date
}
```

### IntegrationSyncLog
Audit trail of all sync operations.

```javascript
{
  userId: ObjectId,
  platform: String,
  status: "success" | "failed" | "partial",
  recordsFetched: Number,
  recordsInserted: Number,
  recordsDuplicated: Number,
  startTime: Date,
  endTime: Date,
  durationMs: Number,
  errorMessage: String
}
```

## Platform Integrations

### LeetCode
- **API**: GraphQL at `https://leetcode.com/graphql`
- **Features**:
  - Profile with ranking and badges
  - Recent accepted submissions (up to 100)
  - Problem difficulty and tags
  - Acceptance rate (if available)

### Codeforces
- **API**: REST at `https://codeforces.com/api`
- **Features**:
  - User rating and rank
  - All submissions with timestamps
  - Problem tags and rating-based difficulty
  - Contest information

## Authentication

Currently uses Bearer token authentication. Integrate with your auth system:

```javascript
// In auth.js middleware - implement proper JWT verification
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
```

## Error Handling

The system provides detailed error messages:

```json
{
  "success": false,
  "message": "User not found on LeetCode",
  "error": "..."
}
```

Common error codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Resource not found
- `500` - Server error

## Performance Optimizations

1. **Database Indexes**: Compound indexes on frequently queried fields
2. **Bulk Operations**: Submissions upserted in bulk
3. **Async/Non-blocking**: Background syncs don't block responses
4. **Caching**: Profile data cached in database
5. **Efficient Queries**: Minimal mongo roundtrips

## Future Integration

This backend is designed to integrate with:

- **ML Services**: Python microservice for adaptive algorithm
- **LLM Services**: Gemini for insight generation
- **Queue System**: Background job processing at scale
- **WebSocket**: Real-time sync status updates
- **Analytics**: Detailed user behavior analysis

## Configuration

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/prepmate-ai-studio

# Server
PORT=8000
NODE_ENV=development

# Authentication (implement with JWT)
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d

# External APIs
LEETCODE_API_TIMEOUT=10000
CODEFORCES_API_TIMEOUT=10000

# Logging
LOG_LEVEL=info
```

## Monitoring & Logging

- **Request Logging**: Morgan middleware logs all HTTP requests
- **Sync Audit Trail**: Every sync operation logged in IntegrationSyncLog
- **Error Tracking**: Detailed error messages in logs and sync logs
- **Performance Metrics**: Duration tracking in sync logs

## Security Notes

1. ✅ Input validation on all endpoints
2. ✅ Authentication middleware on protected routes
3. ✅ CORS configured for frontend only
4. ⚠️ TODO: Rate limiting for production
5. ⚠️ TODO: Request size limits
6. ⚠️ TODO: Secret rotation for JWT

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Manual endpoint testing with curl
curl -X POST http://localhost:8000/api/integrations/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"platform":"leetcode","username":"test"}'
```

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB is running
- Check MONGODB_URI in .env
- Test with: `mongo --version`

### LeetCode API Errors
- Rate limiting: Wait and retry
- Invalid username: Check spelling
- Timeout: Increase LEETCODE_API_TIMEOUT

### Codeforces API Errors
- Invalid username: Usernames are case-sensitive
- No submissions: User might not have any
- Rate limit: Codeforces has API limits

## Deployment

### Cloud Deployment
- Environment variables must be set before deployment
- MongoDB should be hosted (Atlas, Azure Cosmos, etc.)
- Add rate limiting for production
- Implement proper error tracking (Sentry, etc.)

### Docker Deployment
```bash
docker build -t prepmate-backend .
docker run -p 8000:8000 prepmate-backend
```

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Keep models and services separated

## Support

For issues or questions:
1. Check INTEGRATION_SETUP.md for detailed docs
2. Review logs for error details
3. Test endpoints manually with curl

## License

MIT
