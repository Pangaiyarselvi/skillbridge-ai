# SkillBridge AI Network Error — Executive Summary

## 🎯 The Problem in 1 Sentence

**Frontend on Vercel defaults to `http://localhost:5000/api` instead of your actual backend URL, causing all API calls to fail with "Network Error".**

---

## Root Cause Code

**File:** `frontend/src/lib/api.ts` (Line 5)

```typescript
baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"
```

When `VITE_API_URL` is undefined (NOT set in Vercel), it uses localhost which doesn't exist in production.

---

## The Fix (3 Steps)

### Step 1: Set Vercel Environment Variable (2 minutes)
- Go to Vercel Dashboard → Project Settings → Environment Variables
- Add: `VITE_API_URL = https://your-backend-url.com/api`
- Example: `https://skillbridge-ai-backend.onrender.com/api`

### Step 2: Create Frontend Production Config (1 minute)
- Create file: `frontend/.env.production`
- Content:
  ```env
  VITE_API_URL=https://your-backend-url.com/api
  ```

### Step 3: Configure Backend & Redeploy (2 minutes)
- Set environment variables in backend deployment:
  ```
  NODE_ENV=production
  CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
  DATABASE_URL=... (your database URL)
  JWT_ACCESS_SECRET=... (random secret)
  JWT_REFRESH_SECRET=... (random secret)
  ```
- Redeploy backend

---

## Why It's Broken NOW

```
Frontend on Vercel
  ↓
Code: axios.create({ baseURL: env.VITE_API_URL ?? "localhost:5000" })
  ↓
VITE_API_URL = undefined (not set in Vercel)
  ↓
Uses: http://localhost:5000/api
  ↓
Browser tries to reach: localhost from a deployed site
  ↓
❌ Network Error (localhost doesn't exist in production)
```

---

## Why It Works AFTER Fix

```
Frontend on Vercel
  ↓
Code: axios.create({ baseURL: env.VITE_API_URL ?? "localhost:5000" })
  ↓
VITE_API_URL = "https://skillbridge-ai-backend.onrender.com/api" (set in Vercel)
  ↓
Uses: https://skillbridge-ai-backend.onrender.com/api
  ↓
Browser requests: https://skillbridge-ai-backend.onrender.com/api/auth/login
  ↓
Backend responds with data
  ↓
✅ Login works!
```

---

## What You Need to Know

**The code is NOT broken.** It's designed to:
- Use backend URL from environment variable in production
- Use localhost for local development (when running `npm run dev`)

**The issue is just configuration:**
- Frontend doesn't know where backend is deployed
- No environment variable set in Vercel
- Defaults to localhost which only works locally

**The solution is NOT code changes**, just:
1. Tell Vercel where your backend is (VITE_API_URL)
2. Configure backend environment
3. Redeploy

---

## Quick Diagnosis (Test This Now)

Open Vercel frontend, press F12, paste in console:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

**If you see:**
- `undefined` ❌ → VITE_API_URL not set (this is your problem)
- `http://localhost:5000/api` ❌ → Still using default
- `https://your-backend-url/api` ✅ → Correctly set

---

## All Files You Need

### Created for You:
1. **NETWORK_ERROR_FIX.md** - Quick reference
2. **DEPLOYMENT_ISSUE_ANALYSIS.md** - Detailed technical analysis
3. **DEPLOYMENT_FIX_CHECKLIST.md** - Step-by-step guide
4. **VISUAL_DIAGNOSIS.md** - Visual flowcharts & diagrams
5. **frontend/.env.development** - Local dev config
6. **frontend/.env.production** - Production config template
7. **backend/.env.production** - Backend config template

### What to Do:
1. Read: **NETWORK_ERROR_FIX.md** (2 min) - Quick overview
2. Read: **DEPLOYMENT_FIX_CHECKLIST.md** (5 min) - Step-by-step
3. Execute: The 3 steps above (5 min)
4. Test: Verify login works (2 min)

**Total time: ~15 minutes**

---

## Environment Variables Needed

### In Vercel (Frontend deployment):
```
VITE_API_URL = https://your-backend-url.com/api
```

### In Render/Railway (Backend deployment):
```
NODE_ENV = production
APP_URL = https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
CORS_ORIGIN = https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
DATABASE_URL = postgresql://...
JWT_ACCESS_SECRET = <strong-random-secret>
JWT_REFRESH_SECRET = <strong-random-secret>
CLOUDINARY_CLOUD_NAME = your-value
CLOUDINARY_API_KEY = your-value
CLOUDINARY_API_SECRET = your-value
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-password
GROQ_API_KEY = your-groq-key
```

---

## Verification Commands

After fixing, run these:

```bash
# Test backend is accessible
curl https://your-backend-url.com/api/health
# Should return: {"status":"ok","service":"SkillBridge AI API"}

# Test CORS is configured
curl -i -X OPTIONS https://your-backend-url.com/api/auth/login \
  -H "Origin: https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Should show: access-control-allow-origin header
```

In browser (F12 → Console):
```javascript
// Should print your actual backend URL, not undefined
console.log(import.meta.env.VITE_API_URL)
```

In browser (F12 → Network tab):
- Click Login button
- Find `/auth/login` request
- URL should be: `https://your-backend-url.com/api/auth/login` (not localhost)
- Status should be 4xx (validation error) or 2xx (success), NOT Network Error

---

## Success Indicators ✅

After implementing the fix, you should see:

- ✅ Frontend loads on Vercel without errors
- ✅ `VITE_API_URL` shows actual backend URL in console
- ✅ Network requests go to backend domain (not localhost)
- ✅ Login/Signup buttons work without "Network Error"
- ✅ After successful login, redirected to dashboard
- ✅ Dashboard loads user data from backend

---

## Most Common Mistakes

| ❌ Mistake | ✅ Correct |
|-----------|-----------|
| Forget to set VITE_API_URL in Vercel | Set it in Vercel → Settings → Environment |
| Use `http://` instead of `https://` | Always use `https://` in production |
| Include trailing slash in URL | `CORS_ORIGIN=https://site.com` not `.../` |
| Forget to redeploy backend | Trigger redeploy after env var changes |
| Forget to redeploy frontend | Vercel auto-deploys on git push |
| Set `NODE_ENV=development` in production | Must be `NODE_ENV=production` |

---

## Timeline

| Time | Action | Why |
|------|--------|-----|
| 1 min | Find backend URL | Need to configure frontend |
| 1 min | Add VITE_API_URL to Vercel | Tell frontend where backend is |
| 1 min | Create .env.production | Configure frontend for production |
| 1 min | Push to git | Vercel auto-deploys |
| 2 min | Update backend env vars | Backend needs proper config |
| 2 min | Redeploy backend | Backend applies new configuration |
| 2 min | Test login | Verify everything works |
| **~10 min** | **TOTAL** | **Everything should work** |

---

## If You're Stuck

**Most likely issue:** Vercel not deployed yet with new env vars

**Solution:**
1. Check Vercel → Deployments → see if latest includes env var
2. If not, wait 2-3 minutes for auto-redeploy
3. If still not deployed, go to latest deployment → click "Redeploy"
4. Clear browser cache (Ctrl+Shift+Delete)
5. Open in incognito window
6. Test again

**For other issues:** See **DEPLOYMENT_FIX_CHECKLIST.md** → Troubleshooting section

---

## Bottom Line

**This is not a code bug. It's a deployment configuration issue.**

The frontend code correctly checks for an environment variable. You just need to:
1. Tell it where the backend is (one environment variable in Vercel)
2. Make sure backend is running with proper configuration
3. Redeploy

Then login will work. Estimated time: 10-15 minutes.

No code changes needed. Just configuration.

---

## Questions?

- **"Why doesn't it work locally?"** - Because `.env.development` provides `localhost:5000` for dev
- **"Why doesn't it work in production?"** - Because `VITE_API_URL` not set in Vercel
- **"Why use environment variables?"** - Same code works for any backend URL
- **"Do I need to change the code?"** - No, just set environment variables
- **"Will this break anything?"** - No, just fixes the Network Error

Get to fixing it! You've got this. 🚀
