# Development Authentication Guide

## Overview

The PrepMate AI Studio uses a two-layer authentication system:

### Backend (Node.js/Express)
- **Auth Middleware**: `src/middleware/auth.js`
- **Behavior in Development** (`NODE_ENV=development`):
  - Allows requests without Bearer token
  - Allows requests with invalid tokens
  - Auto-generates a temporary user ID
- **Behavior in Production** (`NODE_ENV=production`):
  - Requires valid Bearer token
  - Validates JWT signature
  - Returns 401 if auth fails

### Frontend (React)
- **API Interceptor**: `src/services/api.ts`
- **Auto-Token Setup**: `src/utils/devSetup.ts`
- **Behavior in Development**:
  - Auto-creates a dev token in localStorage (first load)
  - Sends Bearer token with every API request
  - Logs out on 401 (production auth errors only)

## Development Setup

### 1. Backend Configuration

Create `backend/.env`:
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/prepmate-ai-studio
PORT=8000
JWT_SECRET=dev-secret-key
```

**Key:** `NODE_ENV=development` enables development mode

### 2. Frontend Configuration

No special configuration needed! The app automatically:
1. Detects development mode (`import.meta.env.DEV`)
2. Creates a JWT-like token on first load
3. Stores it in localStorage
4. Includes it with all API requests

### 3. Running for Development

```bash
# Terminal 1: Frontend
npm run dev
# http://localhost:5173

# Terminal 2: Backend
cd backend
npm run dev
# http://localhost:8000
```

## How It Works

### First Time Load (Frontend)
1. `main.tsx` loads and calls `setupDevToken()`
2. `devSetup.ts` checks if `auth_token` exists in localStorage
3. If not, creates a fake JWT token:
   ```
   header.payload.signature
   ```
4. Token is stored in localStorage
5. Subsequent API calls include `Authorization: Bearer <token>`

### API Request (Frontend → Backend)
1. Frontend makes request with Bearer token in header
2. Backend auth middleware receives the token
3. In dev mode: Extracts or creates a user ID
4. Request proceeds with `req.user.id` set

### Token Format (Development Only)

```json
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "userId": "dev-user-1708000000000",
  "email": "dev@prepmate.local",
  "iat": 1708000000
}

// Signature
"dev-signature"
```

## Testing Integration Page

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Navigate to Integrations:**
   - Click "Integrations" in sidebar
   - Should load without logout
   - Can connect LeetCode/Codeforces

## Debugging

### "Logging Out When Clicking Integration"
**Cause:** Missing or invalid auth token
**Solution:** 
1. Check Backend has `NODE_ENV=development`
2. Clear localStorage and reload: `localStorage.clear(); location.reload()`
3. Check browser console for token creation logs

### Check Dev Token
Open browser console:
```javascript
localStorage.getItem('auth_token')
// Should show: header.payload.signature
```

### Check API Response
In browser DevTools → Network → Click API request:
- Check "Request Headers" for `Authorization: Bearer ...`
- Check "Response" for success or 401 error

## Transitioning to Production

For production authentication:

1. **Update backend auth middleware** to use proper JWT verification:
   ```javascript
   const jwt = require('jsonwebtoken');
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   req.user = decoded;
   ```

2. **Set NODE_ENV to production** in deployment:
   ```env
   NODE_ENV=production
   ```

3. **Implement frontend login:**
   - Replace `setupDevToken()` with real login flow
   - Get token from auth endpoint
   - Store in secure storage (not localStorage for sensitive data)

4. **Set JWT_SECRET** to a strong value:
   ```env
   JWT_SECRET=your_secure_secret_key_of_at_least_32_characters
   ```

## Key Files

- **Frontend Setup**: `src/utils/devSetup.ts`
- **Frontend API**: `src/services/api.ts`
- **Backend Auth**: `backend/src/middleware/auth.js`
- **Backend App**: `backend/src/app.js`
