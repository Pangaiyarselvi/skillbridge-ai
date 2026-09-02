# SkillBridge AI Network Error — Visual Diagnosis

## 🔴 CURRENT STATE (Broken)

```
┌─────────────────────────────────────────────────────────────┐
│  User's Browser                                             │
│  https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app  │
│                                                             │
│  Frontend loaded OK ✓                                       │
│  User clicks "Login"                                        │
│  Code calls: api.post("/auth/login", ...)                  │
│                                                             │
│  ❌ WHERE IS api.baseURL?                                   │
│  └─ Looks for VITE_API_URL environment variable            │
│     └─ NOT FOUND! ❌                                        │
│        └─ Defaults to: http://localhost:5000/api           │
│           └─ Tries to reach: http://localhost:5000/...     │
│              └─ Browser says: "I don't know this computer!"│
│                 └─ ❌ NETWORK ERROR ❌                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
              ✘ Connection Fails
                         ↓
                 NETWORK ERROR SHOWN TO USER
```

---

## ✅ WHAT SHOULD HAPPEN (After Fix)

```
┌─────────────────────────────────────────────────────────────┐
│  User's Browser                                             │
│  https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app  │
│                                                             │
│  Frontend loaded OK ✓                                       │
│  VITE_API_URL = https://skillbridge-backend.onrender.com   │
│  User clicks "Login"                                        │
│  Code calls: api.post("/auth/login", ...)                  │
│                                                             │
│  ✅ WHERE IS api.baseURL?                                   │
│  └─ Looks for VITE_API_URL environment variable            │
│     └─ FOUND! ✓                                            │
│        └─ Value: https://skillbridge-backend.onrender.com  │
│           └─ Makes request to: api/auth/login              │
│              └─ Full URL: https://skillbridge-backend...   │
│                 └─ ✓ Backend receives request!             │
│                    └─ Validates credentials                │
│                       └─ Returns: accessToken + user       │
│                          └─ ✓ LOGIN SUCCESS! ✓             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
              ✓ Connection Works
                         ↓
      Frontend redirects to dashboard (student/company/college/admin)
```

---

## 📋 Deployment Architecture

### Current (Broken) ❌

```
FRONTEND                           BACKEND
┌────────────────────────┐        ┌────────────────────────┐
│ Vercel                 │        │ Render/Railway         │
│ skillbridge-ai-git..   │        │ skillbridge-ai...      │
│ vercel.app             │        │ onrender.com           │
│                        │        │                        │
│ VITE_API_URL=undefined │   ✗    │ Running & accessible   │
│ (NOT SET!) ❌          │        │ But frontend doesn't   │
│                        │        │ know about it!         │
│ Defaults to:           │        │                        │
│ localhost:5000         │        │                        │
│                        │        │                        │
│ Tries to call:         │        │                        │
│ http://localhost:5000  │   ✗    │ (unreachable)          │
│ ❌ Network Error       │        │                        │
└────────────────────────┘        └────────────────────────┘
```

### After Fix (Working) ✅

```
FRONTEND                              BACKEND
┌─────────────────────────────────┐  ┌──────────────────────────────┐
│ Vercel                          │  │ Render/Railway               │
│ skillbridge-ai-git...vercel.app │  │ skillbridge-ai...onrender.com│
│                                 │  │                              │
│ VITE_API_URL=                   │  │ Environment Variables:       │
│ https://skillbridge-ai...       ├─→│ - NODE_ENV=production ✓      │
│ onrender.com/api ✓              │  │ - CORS_ORIGIN=https://...✓   │
│                                 │  │ - DATABASE_URL=... ✓         │
│ Requests go to:                 │  │ - JWT_*_SECRET ✓             │
│ https://skillbridge-ai...       │  │ - All other vars ✓           │
│ onrender.com/api/auth/login ✓   │  │                              │
│                                 │  │ Handles requests ✓           │
│ ✓ Login works!                  │  │ Returns data ✓               │
│ ✓ User redirected to dashboard  │  │                              │
└─────────────────────────────────┘  └──────────────────────────────┘
```

---

## 🎯 The Exact Problem & Solution

### Problem Location: Frontend

**File:** `frontend/src/lib/api.ts`

```
Line 4-5:
┌──────────────────────────────────────────────────────────────┐
│ export const api = axios.create({                            │
│   baseURL: import.meta.env.VITE_API_URL ??                  │
│            "http://localhost:5000/api",  ← USES LOCALHOST   │
│   withCredentials: true,                                     │
│ });                                                           │
└──────────────────────────────────────────────────────────────┘
            ↓
       When VITE_API_URL is undefined:
            ↓
  Defaults to http://localhost:5000/api
            ↓
  Browser can't reach localhost from production
            ↓
  ❌ NETWORK ERROR
```

### Solution: Set Environment Variable

**In Vercel Dashboard:**
```
Environment Variables Section:
┌─────────────────────────────────────────────────┐
│ Name:  VITE_API_URL                             │
│ Value: https://skillbridge-ai-backend...       │
│        .onrender.com/api                        │
│                                                 │
│ [SAVE]                                          │
└─────────────────────────────────────────────────┘
            ↓
     Frontend Redeploy
            ↓
  Vite injects variable into build
            ↓
  import.meta.env.VITE_API_URL = "https://..."
            ↓
  Now baseURL points to actual backend!
            ↓
  ✅ NETWORK REQUESTS WORK
```

---

## 🔍 Verification Flowchart

```
START
  ↓
Does frontend load without errors?
  ├─ NO → Check browser console for build errors
  │
  └─ YES ↓
        ↓
      Open F12 → Console
      Paste: console.log(import.meta.env.VITE_API_URL)
      
      Does it print a URL (not undefined)?
        ├─ NO → VITE_API_URL not set in Vercel
        │       └─ Add it to Vercel environment variables
        │          └─ Go to: Vercel → Project → Settings → Environment Variables
        │             └─ Add: VITE_API_URL = https://backend-url/api
        │                └─ Redeploy
        │
        └─ YES ↓
             ↓
           Click Login button
           Open F12 → Network tab
           
           Does request go to backend URL?
             ├─ NO → URL still shows localhost
             │       └─ Frontend not using new VITE_API_URL
             │          └─ Clear cache + refresh
             │             └─ Check Vercel deployment completed
             │
             └─ YES ↓
                  ↓
                Does backend respond? (HTTP 200/400, not Network Error)
                  ├─ NO → Backend not running/accessible
                  │       └─ Check backend deployment status
                  │          └─ Run: curl https://backend-url/api/health
                  │
                  └─ YES ↓
                       ↓
                     ✅ PROBLEM SOLVED!
                     Login flow works
```

---

## 📊 Comparison Table

| Aspect | Current (Broken) | After Fix |
|--------|-----------------|-----------|
| **Frontend URL** | Vercel ✓ | Vercel ✓ |
| **Backend URL** | `http://localhost:5000` ❌ | `https://backend-url.com` ✓ |
| **VITE_API_URL** | Not set / undefined ❌ | Set in Vercel ✓ |
| **Login request destination** | localhost ❌ | backend-url.com ✓ |
| **Network result** | Network Error ❌ | Success 200/400 ✓ |
| **User experience** | Error message ❌ | Dashboard loads ✓ |

---

## 🚀 Exact Steps (Copy-Paste Ready)

### 1. Find Your Backend URL
```
Option A - Render: https://your-project-name.onrender.com
Option B - Railway: https://your-project-name.railway.app
Option C - Other: your-actual-domain.com
```

### 2. Update Backend (Render/Railway Dashboard)

Go to your backend service settings, add:
```
NODE_ENV=production
CORS_ORIGIN=https://skillbridge-ai-git-main-pangaiyarselvi.vercel.app
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
```

Trigger redeploy.

### 3. Update Frontend Environment File

**File:** `frontend/.env.production`
```env
VITE_API_URL=https://YOUR_BACKEND_URL/api
```

Commit and push:
```bash
git add frontend/.env.production
git commit -m "Add backend API URL"
git push origin main
```

### 4. Set Vercel Environment Variable

Vercel Dashboard → Settings → Environment Variables:
```
Name:  VITE_API_URL
Value: https://YOUR_BACKEND_URL/api
```

Click Save. Frontend auto-redeploys.

### 5. Test

```bash
# Terminal
curl https://YOUR_BACKEND_URL/api/health

# Browser Console (F12)
console.log(import.meta.env.VITE_API_URL)

# Browser Network Tab (F12 → Network)
Click Login → Check /auth/login request URL
```

---

## ✨ After Everything Works

```
USER'S JOURNEY (After Fix)
│
├─ Opens Vercel URL
│  └─ Frontend loads ✓
│
├─ Sees Login page ✓
│  └─ VITE_API_URL = "https://backend-url/api"
│
├─ Enters email & password
│  └─ Clicks Login button
│
├─ Frontend calls API
│  └─ POST https://backend-url/api/auth/login
│
├─ Backend processes request
│  └─ Validates credentials ✓
│
├─ Backend returns response
│  └─ {"success": true, "data": {"accessToken": "...", "user": {...}}}
│
├─ Frontend receives data ✓
│  └─ Stores in Zustand store
│
└─ Frontend redirects to dashboard ✓
   └─ User sees: Student/Company/College/Admin Dashboard
      └─ ✅ SUCCESS!
```
