# SkillBridge AI — Network Error Root Cause Analysis

## 🔴 ROOT CAUSE: Missing Backend API URL in Vercel Environment

The frontend attempts to call `http://localhost:5000/api` because `VITE_API_URL` environment variable is **NOT** configured in Vercel.

---

## Issue #1: Frontend API Configuration (CRITICAL)

### File: `frontend/src/lib/api.ts` — Lines 4-5
```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",  // ❌ PROBLEM
  withCredentials: true,
});
```

### Problem:
- When `VITE_API_URL` is undefined (because it's not set in Vercel), defaults to `http://localhost:5000/api`
- In production, this URL is **unreachable** from the client's browser
- Result: All API calls return **"Network Error"**

### Request Flow That Fails:
```
User clicks Login in Vercel (https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app)
  ↓
Login.tsx calls: api.post("/auth/login", { email, password })
  ↓
api.ts resolves baseURL to: http://localhost:5000/api/auth/login
  ↓
Browser tries to reach: http://localhost:5000 (which doesn't exist from client)
  ↓
❌ Network Error
```

### The Fix:
Set `VITE_API_URL` in Vercel environment variables to point to your backend URL.

---

## Issue #2: Backend CORS Configuration (SECONDARY)

### File: `backend/src/app.ts` — Line 18
```typescript
app.use(cors({ 
  origin: process.env.CORS_ORIGIN?.split(",") ?? "*", 
  credentials: true 
}));
```

### Problem:
- `.env.example` specifies a hardcoded frontend URL with a **trailing slash** ❌:
  ```
  CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app/
  ```
- Trailing slashes in CORS origins may cause issues
- The `process.env.NODE_ENV` check for cookies uses string comparison which might fail

### File: `backend/src/modules/auth/auth.controller.ts` — Lines 23-29
```typescript
res
  .cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",  // String comparison
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
```

### The Fix:
- Remove trailing slash from CORS_ORIGIN
- Ensure `NODE_ENV=production` is set correctly in backend deployment

---

## Issue #3: Missing Frontend Environment Files

### Problem:
- No `.env.local`, `.env.development`, or `.env.production` files in frontend
- Only `VITE_API_URL` is referenced but nowhere configured
- Vite doesn't know where the backend is

### Solution:
Create environment configuration files for development and production.

---

## Issue #4: Backend Deployment URL Unknown

### Problem:
- The backend URL (Render/Railway endpoint) is **not documented**
- You can't configure `VITE_API_URL` in Vercel without knowing the backend URL
- No environment variable naming consistency

---

## ✅ STEP-BY-STEP FIX INSTRUCTIONS

### Step 1: Find Your Backend Deployment URL
```
If deployed on Render: https://skillbridge-ai-backend.onrender.com
If deployed on Railway: https://skillbridge-ai-backend-prod.up.railway.app
If deployed on AWS/GCP: https://your-backend-domain.com

Note: It should be a HTTPS URL, NOT localhost
```

### Step 2: Configure Backend Environment Variables

#### File: `.env` (in backend root, on your deployment service)

**For Render / Railway / Any PaaS:**
```env
# Server
PORT=5000
NODE_ENV=production
APP_URL=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app

# CORS — Remove trailing slashes!
CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# JWT
JWT_ACCESS_SECRET=your-secure-random-secret-here
JWT_REFRESH_SECRET=your-another-secure-random-secret-here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="SkillBridge AI <no-reply@skillbridge.ai>"

# Groq API
GROQ_API_KEY=your-groq-api-key
```

**Key Points:**
- `NODE_ENV=production` (MUST be set for secure cookies)
- `CORS_ORIGIN` **without trailing slash**
- All secrets must be strong random strings

### Step 3: Create Frontend Environment Files

#### File: `frontend/.env.development`
```env
VITE_API_URL=http://localhost:5000/api
```

#### File: `frontend/.env.production`
```env
# Replace with your actual backend URL
VITE_API_URL=https://your-backend-url.com/api
```

**For Render example:**
```env
VITE_API_URL=https://skillbridge-ai-backend.onrender.com/api
```

### Step 4: Configure Vercel Environment Variables

**Go to Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables:

```
VITE_API_URL = https://your-backend-url.com/api
```

**Example for Render backend:**
```
VITE_API_URL = https://skillbridge-ai-backend.onrender.com/api
```

**Important:** The variable name MUST be `VITE_API_URL` (Vite only exposes variables starting with `VITE_`)

### Step 5: Rebuild and Redeploy

#### Frontend (Vercel)
1. Commit `.env.production` to git (DO NOT commit `.env.development`)
2. Push to main branch
3. Vercel will auto-deploy with the new environment variable
4. Verify in Vercel deployment logs that `VITE_API_URL` is set

#### Backend (Render/Railway)
1. Set all environment variables in the deployment platform dashboard
2. Trigger a redeploy
3. Check backend health: `curl https://your-backend-url.com/api/health`
   - Expected response: `{"status":"ok","service":"SkillBridge AI API"}`

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Backend health check works:
  ```bash
  curl https://your-backend-url.com/api/health
  ```
  Expected: `{"status":"ok","service":"SkillBridge AI API"}`

- [ ] Frontend loads without 404/errors:
  ```bash
  Open: https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
  ```

- [ ] Check browser console (F12 → Network tab):
  - Login request should go to your backend URL
  - NOT to localhost

- [ ] Test login:
  ```
  1. Go to https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app/login
  2. Enter credentials
  3. Should NOT see "Network Error"
  ```

- [ ] Inspect network request (F12 → Network):
  - Find the `/auth/login` request
  - URL should be: `https://your-backend-url.com/api/auth/login`
  - Status should be 200 (not failed connection)

---

## 📋 Quick Reference: All Files That Need Changes

| File | Issue | Fix |
|------|-------|-----|
| `backend/.env` (on deployment) | Missing env vars | Set all vars from `.env.example` |
| `frontend/.env.production` | Missing API URL | Create with `VITE_API_URL=https://backend-url/api` |
| `Vercel Dashboard` | VITE_API_URL not set | Add env var: `VITE_API_URL` |
| `backend/src/app.ts` | CORS origin might have trailing slash | Ensure `CORS_ORIGIN` is set correctly (no slash) |

---

## 🎯 What's Currently Happening

```
Frontend (Vercel):                    Backend (Render/Railway):
┌─────────────────────────┐          ┌──────────────────────┐
│ Login page loads OK     │          │ Running but         │
│ VITE_API_URL = undefined│          │ Frontend doesn't    │
│ Defaults: localhost:5000│          │ know about it!      │
└────────────┬────────────┘          └──────────────────────┘
             │
             └─→ Tries to hit http://localhost:5000
                 ❌ Network Error (browser can't reach)
```

## What Should Happen After Fix

```
Frontend (Vercel):                    Backend (Render/Railway):
┌─────────────────────────┐          ┌──────────────────────┐
│ Login page loads OK     │          │ Running and         │
│ VITE_API_URL set       │          │ accessible via      │
│ = https://backend...   │          │ HTTPS               │
└────────────┬────────────┘          └──────────────────────┘
             │
             └─→ api.post("/auth/login")
                 to: https://backend-url.com/api/auth/login
                 ✅ Works! 200 OK response
```

---

## 🔗 Additional Configuration Notes

### Cookie Handling (Refresh Token)

The backend sets `refreshToken` as an `httpOnly` cookie:

```typescript
// backend/src/modules/auth/auth.controller.ts — Line 20-26
res.cookie("refreshToken", result.refreshToken, {
  httpOnly: true,              // Can't access from JS
  secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
  sameSite: "lax",             // Allows cross-site POST
  maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
})
```

**Frontend automatically handles this:**
```typescript
// frontend/src/lib/api.ts — Line 4
withCredentials: true,  // Sends cookies with requests
```

This works because:
1. Both frontend and backend use same domain (after fix)
2. `withCredentials: true` in axios
3. `sameSite: "lax"` allows POST requests to send cookies

---

## 🚨 Common Mistakes to Avoid

1. ❌ Using `http://` in production VITE_API_URL (use `https://`)
2. ❌ Forgetting to set `NODE_ENV=production` on backend
3. ❌ Including trailing slashes in CORS_ORIGIN
4. ❌ Committing real secrets to `.env.production`
5. ❌ Using `localhost` in any production environment variable
6. ❌ Forgetting to rebuild frontend after setting VITE_API_URL
7. ❌ Not setting `withCredentials: true` in axios (breaks cookie refresh)

---

## 📞 Summary

**Why you're getting "Network Error":**
- Frontend doesn't know where backend is
- Defaults to localhost:5000
- That URL is unreachable from the browser

**Solution:**
- Set backend URL in Vercel as `VITE_API_URL` environment variable
- Ensure backend environment variables are properly configured
- Verify backend is running and accessible

**Time to fix:** ~5 minutes once you have:
1. Backend deployment URL
2. Access to Vercel settings
3. Access to backend deployment settings
