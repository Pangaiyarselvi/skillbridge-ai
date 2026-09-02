# SkillBridge AI — Deployment Fix Checklist

## 🎯 The Problem in One Sentence
**Frontend on Vercel doesn't know where the backend is, so it defaults to `localhost:5000` which doesn't exist in production.**

---

## 📍 Exact Location of the Bug

### Frontend - File: `frontend/src/lib/api.ts` (Line 5)
```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",  // ← BUG HERE
  withCredentials: true,
});
```

**Why it's a bug:**
- When `VITE_API_URL` is undefined (not set in Vercel), it uses `http://localhost:5000/api`
- Browser cannot reach `localhost:5000` from a deployed site
- All API calls fail with **Network Error**

---

## ✅ 3-Minute Fix Checklist

### Before You Start
You need:
1. Your backend deployment URL (e.g., `https://skillbridge-ai-backend.onrender.com`)
2. Access to Vercel project settings
3. Access to backend deployment settings (Render/Railway dashboard)

### Step 1: Update Backend Environment Variables
**Where:** Your backend deployment platform (Render/Railway/AWS/etc.)

**Add/Update these variables:**
```env
NODE_ENV=production
PORT=5000
APP_URL=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
DATABASE_URL=postgresql://...your-db-url...
JWT_ACCESS_SECRET=your-strong-random-secret
JWT_REFRESH_SECRET=another-strong-random-secret
```

**Key:** No trailing slashes in URLs!

### Step 2: Update Vercel Frontend Environment Variables
**Where:** Vercel Dashboard → Project → Settings → Environment Variables

**Add this variable:**
```
Name:  VITE_API_URL
Value: https://your-backend-url.com/api
```

**Example for Render:**
```
Name:  VITE_API_URL
Value: https://skillbridge-ai-backend.onrender.com/api
```

**Important:** Must be exactly `VITE_API_URL` (Vite only exposes `VITE_*` variables)

### Step 3: Redeploy
1. **Backend:** Trigger redeploy in your deployment platform
2. **Frontend:** 
   - Commit `.env.production` file to git (add correct backend URL)
   - Push to main branch
   - Vercel auto-deploys

### Step 4: Test

#### Test Backend Health
```bash
curl https://your-backend-url.com/api/health
```

Expected response:
```json
{"status":"ok","service":"SkillBridge AI API"}
```

#### Test Frontend
1. Open: `https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app`
2. Press `F12` → Network tab
3. Click Login or Signup button
4. Look for request to `/auth/login` or `/auth/signup`
5. URL should be `https://your-backend-url.com/api/auth/login` (NOT localhost)
6. Should get HTTP 200/400 (not Network Error)

#### Test Full Login Flow
```bash
# Replace YOUR_BACKEND_URL with actual URL
curl -X POST https://YOUR_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected response (if user exists):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "id": "...",
      "email": "test@example.com",
      "role": "STUDENT"
    }
  }
}
```

---

## 📋 Environment Variables Reference

### Backend (.env on deployment)
```env
# Server
PORT=5000
NODE_ENV=production
APP_URL=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app

# CORS - Remove trailing slashes!
CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app

# Database
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_ACCESS_SECRET=abc123...32_char_minimum...
JWT_REFRESH_SECRET=xyz789...32_char_minimum...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-16-chars
SMTP_FROM="SkillBridge AI <noreply@skillbridge.ai>"

# Groq
GROQ_API_KEY=your-groq-key
```

### Frontend (Vercel Dashboard Environment Variables)
```env
VITE_API_URL=https://your-backend-url.com/api
```

### Frontend Local Development (.env.development)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🔍 Troubleshooting

### Still Getting "Network Error"?

#### Check 1: Is backend URL correct?
```bash
curl https://your-backend-url.com/api/health
```
- If this fails, backend is not accessible
- Check backend deployment status/logs

#### Check 2: Is VITE_API_URL set in Vercel?
1. Go to Vercel dashboard
2. Project → Settings → Environment Variables
3. Should see `VITE_API_URL` with your backend URL
4. If not there, add it
5. Redeploy frontend (push to main)

#### Check 3: Is frontend actually using the new variable?
1. Open deployed frontend
2. Press `F12` → Console
3. Run: `console.log(import.meta.env.VITE_API_URL)`
4. Should print your backend URL (NOT undefined)

If undefined:
- Vercel not deployed with new env var
- Wait 2-3 min for deployment
- Clear browser cache
- Try incognito window

#### Check 4: Is CORS configured correctly?
```bash
# Test CORS headers
curl -i -X OPTIONS https://your-backend-url.com/api/auth/login \
  -H "Origin: https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Look for:
```
access-control-allow-origin: https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
```

If not present:
- Backend's `CORS_ORIGIN` env var not set
- Or has trailing slash
- Update and redeploy backend

---

## 🚨 Critical Mistakes

| ❌ Wrong | ✅ Right |
|---------|---------|
| `http://localhost:5000` in prod | `https://backend-domain.com` |
| `CORS_ORIGIN=https://site.com/` | `CORS_ORIGIN=https://site.com` |
| `NODE_ENV=development` on prod | `NODE_ENV=production` |
| `VITE_API_URL` not set in Vercel | Set as Vercel env variable |
| `withCredentials: false` | `withCredentials: true` |

---

## 📊 Request Flow After Fix

```
1. User types URL in browser:
   https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app/login

2. Vercel serves frontend React app
   Vite injects: VITE_API_URL = "https://your-backend-url.com/api"

3. Frontend loads, user clicks Login button

4. Login.tsx calls:
   api.post("/auth/login", { email, password })

5. Axios uses baseURL (now correctly set):
   POST https://your-backend-url.com/api/auth/login

6. Browser makes CORS preflight request (OPTIONS)
   Backend responds with CORS headers
   ✅ Preflight passes

7. Browser sends actual POST request
   Backend receives, validates credentials
   ✅ Returns 200 with accessToken + user data

8. Frontend sets Zustand store:
   useAuthStore.setSession(accessToken, user)
   Navigates to /student dashboard
   ✅ Login successful!
```

---

## 🎬 Quick Deploy Commands

### For Render
```bash
# In Render dashboard:
1. Go to your backend service
2. Settings → Environment
3. Add/update environment variables
4. Manual Deploy → Deploy latest commit
```

### For Railway
```bash
# In Railway dashboard:
1. Select project → backend service
2. Variables → add/update
3. Wait for auto-redeploy or manually trigger
```

### For Vercel
```bash
# Option 1: Git push (auto-deploys)
git add .env.production
git commit -m "Add backend URL for production"
git push origin main

# Option 2: Manual redeploy in Vercel dashboard
1. Go to dashboard
2. Select project
3. Deployments → click latest → Redeploy
```

---

## ✨ Success Indicators

After fixing, you should see:

- [x] Backend health check returns: `{"status":"ok","service":"SkillBridge AI API"}`
- [x] Vercel dashboard shows `VITE_API_URL` in Environment Variables
- [x] Frontend loads without errors
- [x] Network tab shows requests to backend URL (not localhost)
- [x] Login/Signup buttons work without "Network Error"
- [x] After successful login, redirected to student/company/college/admin dashboard
- [x] Profile page loads user data from backend

---

## 📞 If You're Still Stuck

Provide:
1. Backend URL (from deployment platform)
2. Screenshot of Vercel env variables
3. Browser console error message (F12)
4. Result of: `curl https://your-backend-url.com/api/health`
5. Frontend network request details (F12 → Network → click failed request)
