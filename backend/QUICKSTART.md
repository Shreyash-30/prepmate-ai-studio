# PrepMate AI Backend Setup (Windows)

This script helps set up the backend for the PrepMate AI platform.

## Prerequisites

- Node.js 16+ and npm
- MongoDB (either local or Docker)
- Git

## Quick Start

### 1. Open Terminal in Backend Directory

```powershell
cd backend
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Create Environment File

Create a `.env` file in the `backend` directory:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` with your MongoDB connection string and other configuration.

### 4. Start Backend Server

```powershell
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

The server should start on `http://localhost:8000`

### 5. Test the Server

Open your browser and visit:
- Health check: http://localhost:8000/health

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-02-15T10:00:00.000Z"
}
```

## MongoDB Setup

### Option A: Using Docker

```powershell
# Install Docker if needed
# Then run:
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Stop MongoDB
docker stop mongodb
```

### Option B: Local MongoDB

Download and install from https://www.mongodb.com/try/download/community

## Frontend & Backend Together

Open two terminals:

**Terminal 1 - Frontend:**
```powershell
# In project root
npm run dev
```

**Terminal 2 - Backend:**
```powershell
# In backend directory
npm run dev
```

Frontend will be at `http://localhost:5173`
Backend will be at `http://localhost:8000`

## Testing Integration Endpoints

Use PowerShell to test endpoints:

```powershell
# Connect to LeetCode
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    platform = "leetcode"
    username = "your_username"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/integrations/connect" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <PID> /F
```

### MongoDB Connection Error
- Check if MongoDB is running
- Verify MONGODB_URI in .env file
- Try `mongodb://localhost:27017/prepmate-ai-studio`

### Dependencies Installation Issues
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -r node_modules package-lock.json
npm install
```

## Next Steps

1. Deploy frontend and backend to cloud
2. Set up CI/CD pipeline
3. Configure production MongoDB
4. Implement more robust authentication
5. Add monitoring and logging
