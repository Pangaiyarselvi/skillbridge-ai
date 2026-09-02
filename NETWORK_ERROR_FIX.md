# SkillBridge AI Network Error — Complete Fix Summary

## 🔴 Root Cause

**Frontend in Vercel defaults to `http://localhost:5000/api` because `VITE_API_URL` environment variable is not configured.**

---

## Files & Issues

### 1. Frontend API Configuration
**File:** `frontend/src/lib/api.ts` (Lines 4-5)

```typescript
// CURRENT (BROKEN)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",  // ← Uses localhost!
  withCredentials: true,
});

// This is CORRECT, just needs environment variable set
```

**Status:** ✅ Code is correct, just needs `VITE_API_URL` env var

---

### 2. Backend CORS Configuration
**File:** `backend/src/app.ts` (Line 18)

```typescript
// CURRENT
app.use(cors({ 
  origin: process.env.CORS_ORIGIN?.split(",") ?? "*", 
  credentials: true 
}));

// This is CORRECT, just needs env var set properly
```

**Status:** ✅ Code is correct, needs `CORS_ORIGIN` env var (without trailing slash)

---

### 3. Backend Refresh Token Cookie
**File:** `backend/src/modules/auth/auth.controller.ts` (Lines 20-26)

```typescript
// CURRENT
res
  .cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",  // ← Checks if production
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
  .json({ success: true, data: { accessToken: result.accessToken, user: result.user } });

// This is CORRECT, needs NODE_ENV=production set in backend
```

**Status:** ✅ Code is correct, needs `NODE_ENV=production` env var

---

## ✅ What You Need to Do

### A. Update Backend Environment Variables

Set these in your backend deployment platform (Render/Railway/etc.):

```env
NODE_ENV=production
PORT=5000
APP_URL=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<strong-random-32-char-secret>
JWT_REFRESH_SECRET=<strong-random-32-char-secret>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
GROQ_API_KEY=...
```

**Critical Points:**
- `NODE_ENV=production` (NOT development)
- `CORS_ORIGIN` has NO trailing slash
- All secrets filled in

### B. Create Frontend Environment Files

**File:** `frontend/.env.development`
```env
VITE_API_URL=http://localhost:5000/api
```

**File:** `frontend/.env.production`
```env
VITE_API_URL=https://YOUR_BACKEND_URL/api
```

Replace `YOUR_BACKEND_URL` with actual backend URL:
- Render: `https://skillbridge-ai-backend.onrender.com`
- Railway: `https://skillbridge-ai-backend.railway.app`
- Other: Your actual domain

### C. Set Vercel Environment Variable

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add:
```
Name:  VITE_API_URL
Value: https://YOUR_BACKEND_URL/api
```

### D. Redeploy

1. **Backend:** Trigger redeploy in deployment platform
2. **Frontend:** 
   ```bash
   git add frontend/.env.production
   git commit -m "Configure backend API URL for production"
   git push origin main
   ```
   Vercel auto-deploys

---

## 🧪 Test Commands

### Verify Backend Health
```bash
curl https://YOUR_BACKEND_URL/api/health
```

Should return:
```json
{"status":"ok","service":"SkillBridge AI API"}
```

### Verify CORS
```bash
curl -i -X OPTIONS https://YOUR_BACKEND_URL/api/auth/login \
  -H "Origin: https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Should include:
```
access-control-allow-origin: https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
```

### Verify Frontend Env Var
1. Open deployed frontend
2. Press `F12` → Console
3. Paste: `console.log(import.meta.env.VITE_API_URL)`
4. Should print: `https://YOUR_BACKEND_URL/api` (NOT undefined)

### Test Login Request
Open frontend, press F12 → Network tab, click Login:
- Request URL should be: `https://YOUR_BACKEND_URL/api/auth/login`
- NOT: `http://localhost:5000/api/auth/login`
- Status should be 400/401/200 (not Network Error)

---

## 🎯 Timeline

| Step | Time | Action |
|------|------|--------|
| 1 | 1 min | Find your backend URL |
| 2 | 2 min | Update backend env vars |
| 3 | 1 min | Create `.env.production` |
| 4 | 1 min | Set Vercel env var |
| 5 | 2 min | Redeploy backend |
| 6 | 3 min | Redeploy frontend |
| 7 | 1 min | Test login |

**Total: ~11 minutes**

---

## 📊 Before & After

### BEFORE (Current - Broken)
```
Frontend on Vercel
├─ VITE_API_URL not set
├─ Defaults to: http://localhost:5000/api
├─ Tries to reach: localhost from browser
└─ ❌ Network Error
```

### AFTER (After Fix)
```
Frontend on Vercel
├─ VITE_API_URL = https://backend-url.com/api
├─ Requests go to: backend-url.com/api
├─ Backend responds with proper CORS headers
└─ ✅ Login/Signup work
```

---

## 🔗 Files Created for You

1. `frontend/.env.development` — Local dev env vars
2. `frontend/.env.production` — Production env vars (update URL)
3. `backend/.env.production` — Production backend template (fill in values)
4. `DEPLOYMENT_ISSUE_ANALYSIS.md` — Detailed analysis
5. `DEPLOYMENT_FIX_CHECKLIST.md` — Step-by-step checklist

---

## ❓ FAQ

**Q: Why does localhost work locally but not in production?**
A: Localhost means "this computer". In production, the frontend runs in the user's browser, which can't reach the backend developer's machine.

**Q: Do I need to change code?**
A: No! The code is correct. Just set environment variables.

**Q: What if backend is on localhost?**
A: You need to deploy the backend to a public URL first (Render, Railway, AWS, etc.)

**Q: Why VITE_API_URL and not API_URL?**
A: Vite only exposes variables starting with `VITE_`. This is by design.

**Q: Will cookies work across domains?**
A: Yes, because we set `credentials: true` in CORS and `withCredentials: true` in axios, and the cookie has `sameSite: "lax"`.

---

## ✨ Success Checklist

- [ ] Backend deployed and running
- [ ] Backend URL known (e.g., `https://skillbridge-ai-backend.onrender.com`)
- [ ] Backend env vars set (especially `NODE_ENV=production`, `CORS_ORIGIN`, `DATABASE_URL`)
- [ ] `.env.production` created with correct backend URL
- [ ] `.env.production` committed to git
- [ ] Vercel env variable `VITE_API_URL` set
- [ ] Frontend redeployed
- [ ] Backend health check works: `curl https://backend-url/api/health`
- [ ] Frontend console shows correct `VITE_API_URL` 
- [ ] Network tab shows requests to backend URL
- [ ] Login/Signup no longer shows "Network Error"
- [ ] Can successfully log in
- [ ] Redirected to appropriate dashboard
