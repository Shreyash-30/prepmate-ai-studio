# Integration Flow Testing Guide

## Backend Integration Flow - Complete End-to-End

### Architecture Overview

```
Frontend (Connect Button Click)
    ↓
POST /api/integrations/connect { platform, username }
    ↓
validateRequest → Auth Middleware (verify JWT token)
    ↓
Create/Update IntegrationAccount (status: pending)
    ↓
Trigger bootstrapAsync() [Non-blocking with setImmediate]
    ↓
=== Async Bootstrap Process ===
    ↓
Fetch Profile Data:
  - LeetCode: GraphQL API query → fetch problems solved, ranking, badges, acceptance rate
  - Codeforces: REST API → fetch solved count, rating, rank
    ↓
Fetch Submissions:
  - LeetCode: GraphQL API query → recentAcSubmissionList (normalized to 'accepted' status)
  - Codeforces: REST API → user.status filtered to verdict='OK' (normalized to 'accepted' status)
    ↓
Store ExternalPlatformProfile:
  - Save profile data (totalSolved, acceptanceRate, ranking, badges)
    ↓
Update User Model:
  - platformProfiles.{platform}.*  ← Profile data
  - lastSyncedAt ← Current timestamp
    ↓
Store ExternalPlatformSubmission (Bulk):
  - Upsert each submission with unique constraint: (userId, platform, platformSubmissionId)
  - Handle duplicates gracefully (E11000 errors)
    ↓
Calculate Unique Problems:
  - Count distinct problemTitle from accepted submissions
  - For each platform separately
    ↓
Update User Model:
  - totalProblemsCount ← Sum of distinct problems across platforms
  - platformProfiles.{platform}.totalSolved ← Unique problems for that platform
    ↓
Update IntegrationAccount:
  - connectionStatus: 'connected'
  - bootstrapStatus: 'completed'
  - lastSyncAt: now
    ↓
Log Success in IntegrationSyncLog
    ↓
Frontend receives: 200 OK { success: true, connectionStatus: 'pending', bootstrapStatus: 'pending' }
Frontend polls: GET /api/integrations/status → Updates UI when bootstrapStatus: 'completed'
```

## Fixed Issues

### 1. Status Field Normalization
**Problem**: Inconsistent status values
- LeetCode submissions had status: "Accepted"
- Codeforces submissions had status: "OK"
- Bootstrap filtering expected: "accepted" (lowercase)
- Result: No submissions matched, incorrect problem counts

**Solution**:
- LeetCode service normalized status → "accepted"
- Codeforces service normalized verdict='OK' → "accepted"
- Bootstrap filtering now correctly matches "accepted" status

### 2. LeetCode Acceptance Rate
**Problem**: Always set to 0
- LeetCode GraphQL doesn't return acceptance rate directly in profile query
- No way to calculate it from recentAcSubmissionList

**Solution**:
- Added `fetchAcceptanceRate()` function using separate GraphQL query
- Queries `submitStatsGlobal` with both acSubmissionNum and totalSubmissionNum
- Calculates percentage: (accepted / total) * 100
- Falls back to 0 if data unavailable

### 3. Unique Problems Counting
**Problem**: Counting submissions instead of problems
- Multiple submissions to same problem would be counted multiple times
- totalProblemsCount was incorrect

**Solution**:
- Changed from `.countDocuments()` to `.distinct('problemTitle')`
- Counts unique problems per platform
- Aggregates across platforms using Set to avoid duplicates

### 4. Error Handling
**Problem**: E11000 duplicate key errors not handled properly
- Only checked `error.code === 11000`
- Some duplicates had different error structure

**Solution**:
- Check both `error.code === 11000` and `error.message.includes('E11000')`
- Log skipped duplicates for debugging
- Graceful degradation - doesn't fail entire sync on duplicate

## Database Collections

### ExternalPlatformProfile
- Stores: profile data (totalSolved, acceptanceRate, contestRating, ranking, badges)
- Index: (userId, platform) for quick lookups
- Updated when: User connects or resync triggered

### ExternalPlatformSubmission
- Stores: All accepted submissions from external platforms
- Index: (userId, platform, platformSubmissionId) with unique constraint
- Records: ~100 or more per connection
- Updated when: User connects or resync triggered

### IntegrationAccount
- Stores: Connection metadata (username, status, timestamps, error messages)
- Status values:
  - connectionStatus: 'pending' | 'connected' | 'failed'
  - bootstrapStatus: 'pending' | 'running' | 'completed' | 'failed'

### User
- Stores: Aggregated data from platform connections
- platformProfiles.{platform}: connected, username, totalSolved, acceptanceRate, lastSyncedAt
- totalProblemsCount: Unique problems across all platforms

## API Endpoints

### POST /api/integrations/connect
**Request**:
```json
{
  "platform": "leetcode" | "codeforces",
  "username": "string"
}
```

**Response** (Immediate):
```json
{
  "success": true,
  "message": "Integration started. Syncing in background...",
  "data": {
    "platform": "leetcode",
    "username": "john_doe",
    "connectionStatus": "pending",
    "bootstrapStatus": "pending"
  }
}
```

**Async Bootstrap Process** (0-30 seconds):
- Fetches profile and submissions
- Stores in database
- Updates User model with platform data
- Updates totalProblemsCount

### GET /api/integrations/status
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "platform": "leetcode",
      "username": "john_doe",
      "connectionStatus": "connected",
      "bootstrapStatus": "completed",
      "lastSyncAt": "2026-02-15T13:45:00Z",
      "profile": {
        "totalSolved": 150,
        "acceptanceRate": 68,
        "lastFetchedAt": "2026-02-15T13:45:00Z"
      }
    }
  ]
}
```

## Frontend Integration

### Integrations Page Flow
1. User enters platform username
2. Click "Connect Account" button
3. Frontend calls: `integrationsService.connect(platform, username)`
4. Backend responds immediately with pending status
5. Frontend shows "Connecting..." state
6. Frontend polls `integrationsService.getStatus()` every 1-2 seconds
7. When bootstrapStatus changes to "completed", UI updates with connected state and stats

### Profile Page Flow
1. Page loads and calls `authService.getProfile()`
2. Displays platform stats from User model:
   - platformProfiles.leetcode.totalSolved
   - platformProfiles.codeforces.totalSolved
   - totalProblemsCount
3. Shows connection status for each platform
4. Link to Integrations page for managing connections

## Testing Checklist

- [ ] LeetCode connection fetches profile data
- [ ] LeetCode acceptance rate calculates correctly
- [ ] LeetCode submissions stored without duplicates
- [ ] Codeforces connection fetches profile data  
- [ ] Codeforces submissions stored without duplicates
- [ ] totalProblemsCount updates correctly
- [ ] Platform stats display in Profile page
- [ ] Connection status shows in Integrations page
- [ ] Resync works and updates data
- [ ] Disconnect removes connection and clears data
- [ ] Error handling works for invalid usernames
- [ ] Error handling works for API failures
- [ ] Multiple users have isolated data
