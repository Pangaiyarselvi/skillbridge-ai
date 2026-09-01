# SkillBridge AI — System Architecture & Implementation Plan
### SIH26044 — Portal for Academia–Industry Collaboration for Skill Mapping, Internships & Placement

---

## 1. Analysis of the Reference ZIP ("Online Placement Portal")

What it is: a TanStack Start (React + Vite + file-based routing) app wired to **Supabase** (Postgres + Auth), with Radix/shadcn UI components. It already models Admin / Student / Company roles with routes like `student.jobs.tsx`, `company.jobs.$id.applicants.tsx`, `admin.reports.tsx`, and has 13 SQL migrations defining a placement schema.

**Reused as inspiration:**
- The route-per-role folder convention (`_authenticated/student.*`, `company.*`, `admin.*`) — carried into this plan's page list.
- The applicant/job/drive concepts in its SQL migrations map to `Opportunity` / `Application` here.

**Gaps vs. the SIH problem statement (why a rebuild, not a reuse):**
1. **No College role at all** — the reference only has Student/Company/Admin. SIH26044 explicitly requires colleges for skill-mapping and placement analytics.
2. **No AI layer** — no resume parsing, matching, or chat; the reference is a static CRUD portal (post job → apply → track).
3. **No skill-graph / matching data model** — "applicants" aren't scored against structured skill requirements, so real candidate ranking is impossible.
4. **Supabase-coupled** — auth and DB logic live inside Supabase RLS/policies rather than a portable Express/Prisma API, making the "backend" hard to reason about or extend with a custom AI service layer.
5. **No industry-expectations / skill-gap reporting** — a core SIH ask (colleges need to see *what skills industry wants* vs *what students have*).

SkillBridge AI keeps the proven role-based routing pattern but replaces the data/AI backbone entirely: a dedicated Express + TypeScript + Prisma API, a real skill-taxonomy schema, and a Groq/Llama-powered AI layer (resume analysis, matching, chat, roadmaps) — turning it from a "post-and-apply" portal into a talent-intelligence platform.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            CLIENT (React + Vite)                     │
│  Student UI | Company UI | College UI | Admin UI                     │
│  React Router · Zustand · Axios · Recharts · Framer Motion           │
└───────────────────────────────┬────────────────────────────────────--┘
                                 │ HTTPS (JWT bearer + httpOnly refresh cookie)
┌───────────────────────────────▼──────────────────────────────────────┐
│                     API GATEWAY — Express + TypeScript                │
│  helmet · cors · rate-limit · authenticate() · authorize(role)        │
├─────────────┬─────────────┬─────────────┬─────────────┬───────────────┤
│  Auth        │ Student     │ Company     │ College     │ Admin         │
│  module      │ module      │ module      │ module      │ module        │
├─────────────┴─────────────┴─────────────┴─────────────┴───────────────┤
│                          AI SERVICE LAYER                              │
│  matching.service   resume.service   chatbot.service                   │
│  vectorStore.service (LangChain + pgvector)                            │
│                     ↓ calls                                            │
│              Groq API — Llama 3.3 70B (JSON-mode structured output)    │
└───────────────────────────────┬────────────────────────────────────--─┘
                                 │ Prisma ORM
┌───────────────────────────────▼──────────────────────────────────────┐
│                    PostgreSQL  (+ pgvector extension)                 │
│  Users · Students · Companies · Colleges · Skills · Opportunities ·   │
│  Applications · Assessments · Recommendations · Notifications ...     │
└─────────────────────────────────────────────────────────────────────-┘

External services: Cloudinary (resumes/avatars/certs), SMTP (email verify /
reset), Groq (inference), HuggingFace Inference API (embeddings for
vector search — swappable).

Deployment: Vercel (frontend static+SPA) → Render/Railway (Express API,
Docker or native Node buildpack) → managed Postgres (Render/Railway/
Neon/Supabase, with pgvector enabled).
```

### Why this stack combination works for the AI layer
- **Groq + Llama 3.3** gives near-instant inference (critical for a judge live-demo: resume analysis / chat responses in ~1s instead of 10s+).
- **JSON mode** (`response_format: json_object`) is used everywhere the AI layer talks to the backend, so every AI feature returns typed, parseable data — no fragile regex-scraping of prose.
- **LangChain + pgvector** is isolated to one file (`vectorStore.service.ts`) so it can be swapped for a different embedding provider without touching matching/resume logic.
- **The matching engine itself is NOT an LLM call** — it's a deterministic weighted-score algorithm (see below) with an LLM used only to *explain* the result in natural language. This makes scores auditable/reproducible, which matters a lot for a placement system and for judges who will ask "how is this score computed?".

---

## 3. AI Matching Algorithm (the core differentiator)

```
MatchScore = 0.45 × SkillOverlap
           + 0.20 × AssessmentStrength
           + 0.15 × ResumeQuality(ATS)
           + 0.20 × EligibilityFit
```

- **SkillOverlap**: for each required skill on an `Opportunity` (with a per-skill `weight`), check if the student has it; if yes, multiply by a proficiency factor (Beginner 0.5 → Expert 1.0). Sum matched weight / total weight.
- **AssessmentStrength**: average of the student's `Assessment` scores in skill areas relevant to the role (falls back to overall average, then a neutral 50 for students with no assessments yet — avoids unfairly zeroing out new users).
- **ResumeQuality**: the student's latest `atsScore` from `ResumeAnalysis` (LLM-graded).
- **EligibilityFit**: hard-ish gate on CGPA threshold and eligible branches (soft-penalized, not a binary reject, so borderline students still see the opportunity with an honest lower score).

This exact function is implemented in `backend/src/modules/ai/matching.service.ts` (`computeMatchScore`), and reused by:
- `rankCandidatesForOpportunity()` → Company's **Candidate Ranking** screen.
- `generateRecommendationsForStudent()` → Student's **Internship/Job Recommendations**, with the top 5 explained in one sentence by Llama 3.3 via `explainMatch()`.

---

## 4. Database Design — entity summary

See `backend/prisma/schema.prisma` for the full, runnable schema. Highlights:

| Domain | Models |
|---|---|
| Identity & Auth | `User`, `RefreshToken` |
| Student | `Student`, `Skill`, `StudentSkill`, `Project`, `Certificate`, `Assessment`, `SavedOpportunity` |
| Company | `Company`, `Opportunity`, `OpportunitySkill`, `Application`, `ApplicationStatusLog`, `IndustryExpectation`, `IndustrySkillDemand` |
| College | `College`, `IndustryPartnership` |
| Admin | `Admin` |
| AI outputs (persisted for audit/history) | `ResumeAnalysis`, `SkillGapReport`, `CareerRoadmap`, `Recommendation`, `ChatSession`, `ChatMessage` |
| Comms | `Message`, `Notification` |

Design notes:
- `StudentSkill` and `OpportunitySkill` are **join tables with metadata** (`proficiency`/`weight`) rather than plain many-to-many — this is what makes weighted matching possible.
- `ApplicationStatusLog` gives a full audit trail per application (needed for "Track Status" + college placement analytics).
- AI outputs are persisted, not ephemeral — so a student's skill-gap history, roadmap evolution, and match-score trail are all queryable later (important for College analytics: "how did average readiness change this semester?").
- `pgvector` extension + an `embedding` column on `Opportunity` (added via a manual migration, noted in `vectorStore.service.ts`) powers semantic search for the chatbot's retrieval step.

---

## 5. Backend — folder structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # (add: seed skills taxonomy + demo users)
├── src/
│   ├── app.ts                      # express app + route mounting
│   ├── server.ts                   # entrypoint
│   ├── config/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── groq.ts                 # Groq client + JSON-mode helper
│   │   └── cloudinary.ts           # upload helper
│   ├── middlewares/
│   │   ├── auth.ts                 # authenticate() + authorize(...roles)
│   │   ├── errorHandler.ts
│   │   └── notFound.ts
│   ├── utils/
│   │   ├── jwt.ts                  # sign/verify access+refresh
│   │   └── mailer.ts               # nodemailer wrapper
│   └── modules/
│       ├── auth/        (routes, controller, service, validation)
│       ├── student/      (routes, controller)
│       ├── company/      (routes, controller)
│       ├── college/       (routes, controller)
│       ├── admin/        (routes, controller)
│       └── ai/
│           ├── ai.routes.ts / ai.controller.ts
│           ├── matching.service.ts     # weighted match algorithm
│           ├── resume.service.ts       # ATS/resume/skill-gap/roadmap/readiness
│           ├── chatbot.service.ts      # mentor chat + mock interview
│           └── vectorStore.service.ts  # LangChain + pgvector semantic search
├── package.json
├── tsconfig.json
└── .env.example
```

Everything under `modules/*` follows **routes → controller → (service) → prisma**, with `authenticate` + `authorize(role)` mounted per-router so RBAC is enforced at the module boundary, not scattered per-endpoint.

---

## 6. Frontend — folder structure

```
frontend/
├── src/
│   ├── App.tsx                     # React Router route table, role-gated
│   ├── main.tsx
│   ├── lib/
│   │   └── api.ts                  # axios instance + silent refresh-token interceptor
│   ├── store/
│   │   └── authStore.ts            # zustand: accessToken + user, persisted
│   ├── components/
│   │   ├── ProtectedRoute.tsx      # role allow-list guard
│   │   ├── ui/                     # buttons, cards, inputs (Tailwind primitives)
│   │   └── charts/                 # Recharts wrappers (readiness gauge, bar, line)
│   ├── features/ai/                # AI-specific hooks (useChat, useRecommendations…)
│   └── pages/
│       ├── Landing.tsx
│       ├── auth/        Login, Signup, ForgotPassword, ResetPassword
│       ├── student/     Dashboard, Profile, Opportunities, Applications,
│       │                AIHub (★ reference impl included), MentorChat, MockInterview
│       ├── company/     Dashboard, JobPost, Applicants, IndustryExpectations
│       ├── college/     Dashboard, Analytics, IndustryCollaboration
│       └── admin/       Dashboard, Users, Verification
├── package.json
└── tailwind.config.js  (add per Tailwind docs — omitted here for brevity)
```

`pages/student/AIHub.tsx` is fully implemented as the reference page: it calls `/ai/readiness-score` and `/ai/recommendations`, renders a Recharts radial gauge + bar chart with Framer Motion entrance animations, and has a live Skill-Gap-Engine form. Every other page file is scaffolded (correct name, route, and export) and follows the same pattern: `useEffect` → `api.get/post` → Recharts/cards, styled with Tailwind.

---

## 7. Authentication Flow

1. **Signup** (`POST /auth/signup`) — creates `User` + role-specific profile row in one transaction, emails a verification link (token stored on `User.emailVerifyToken`).
2. **Login** (`POST /auth/login`) — verifies bcrypt hash, issues a short-lived **access token** (15 min, returned in JSON) and a long-lived **refresh token** (30 days, set as an `httpOnly` cookie + stored server-side in `RefreshToken` so it can be revoked).
3. **Silent refresh** — the Axios interceptor (`lib/api.ts`) catches any `401`, calls `/auth/refresh` once (queuing concurrent requests to avoid a refresh storm), swaps in the new access token, and retries.
4. **RBAC** — `authorize("STUDENT")` etc. middleware checks the JWT payload's `role` claim against an allow-list per router; the frontend mirrors this with `<ProtectedRoute allow={[...]}>`.
5. **Logout** revokes the stored refresh token row (not just clearing the cookie), so a stolen refresh token can't be replayed after logout.
6. **Forgot/Reset password** — time-boxed (1 hour) single-use `resetToken`, no user-enumeration leak (always returns a generic success message).

---

## 8. Complete REST API Surface

**Auth** — `/api/auth`: `signup`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `verify-email`

**Student** — `/api/students` *(role: STUDENT)*:
`GET/PUT /me`, `POST /me/resume`, `POST /me/avatar`,
`GET/POST/DELETE /me/skills[/:id]`, `GET/POST/PUT/DELETE /me/projects[/:id]`,
`GET/POST/DELETE /me/certificates[/:id]`, `GET/POST /me/assessments`,
`GET /opportunities`, `GET /opportunities/:id`, `POST /opportunities/:id/save`,
`POST /opportunities/:id/apply`, `GET /applications`, `DELETE /applications/:id`,
`GET /industry-expectations`, `GET /notifications`, `PATCH /notifications/:id/read`

**Company** — `/api/companies` *(role: COMPANY)*:
`GET/PUT /me`, `GET/POST/PUT/DELETE /opportunities[/:id]`,
`GET /opportunities/:id/applicants` (AI-ranked), `PATCH /applications/:id/status`,
`GET/POST/PUT/DELETE /industry-expectations[/:id]`

**College** — `/api/colleges` *(role: COLLEGE)*:
`GET/PUT /me`, `GET /students`,
`GET /analytics/placements`, `GET /analytics/internships`,
`GET /analytics/skill-gaps`, `GET /analytics/departments`,
`GET/POST/PUT/DELETE /partnerships[/:id]`

**Admin** — `/api/admin` *(role: ADMIN)*:
`GET /users`, `PATCH /users/:id/status`,
`GET /companies`, `PATCH /companies/:id/verify`,
`GET /colleges`, `PATCH /colleges/:id/verify`,
`GET /analytics/platform`, `GET /monitoring/recent-activity`

**AI** — `/api/ai` *(authenticated)*:
`POST /resume/analyze`, `POST /skill-gap`, `POST /career-roadmap`,
`GET /readiness-score`, `GET /recommendations`,
`POST /chat`, `POST /mock-interview/questions`, `POST /mock-interview/evaluate`,
`GET /opportunities/:id/rank-candidates` *(COMPANY/ADMIN)*

All list endpoints included above are implemented against the schema; every handler in this repo is real (Prisma calls, not mocked).

---

## 9. What's scaffolded vs. what's stubbed (be transparent in your demo)

**Fully implemented, runnable logic** (given `.env` values + `npx prisma migrate dev`):
- Entire auth flow (JWT + refresh + RBAC + forgot/reset/verify)
- Full Prisma schema
- Student, Company, College, Admin CRUD + analytics controllers
- All 4 AI engines: matching, resume/ATS, skill-gap, roadmap, readiness score, mentor chatbot, mock interview
- Axios client with silent token refresh
- One fully built frontend page (`AIHub.tsx`) as the pattern to replicate

**Scaffolded (route + filename correct, UI body is a placeholder)** — fastest path to a demo-ready build:
- Remaining ~20 frontend pages. Each should follow `AIHub.tsx`'s pattern: fetch from the already-working API, render with Tailwind + Recharts + Framer Motion.
- `prisma/seed.ts` — not written; add a seed script that creates a skills taxonomy (e.g. 100 common tech/soft skills) + demo Student/Company/College/Admin accounts so the matching engine has data to score against on first run.

**Suggested build order for the next 48 hours (typical SIH prep runway):**
1. `npx prisma migrate dev` + write `seed.ts` (skills + demo users) — unblocks everything else.
2. Wire `Login`/`Signup` pages to `/auth/*` — unblocks all role dashboards.
3. Build `student/Opportunities.tsx` + `Applications.tsx` (apply flow) — this is your live-demo backbone.
4. Build `company/JobPost.tsx` + `Applicants.tsx` (calls `/rank-candidates`) — shows the AI ranking visually, this is your strongest judge "wow" moment alongside AIHub.
5. Build `college/Analytics.tsx` with Recharts (placement rate, skill-gap bar chart) — shows the "academia" half of the problem statement, which most competing teams skip.
6. Polish `MentorChat.tsx` (simple chat UI hitting `/ai/chat`) — cheap to build, very demoable.

---

## 10. Deployment Notes

- **Frontend → Vercel**: `vite build`, set `VITE_API_URL` to the Render/Railway API URL.
- **Backend → Render/Railway**: build command `npm run build && npm run prisma:deploy`, start command `npm start`. Set all vars from `.env.example`.
- **Database**: any managed Postgres works; enable `CREATE EXTENSION vector;` if using the semantic-search chatbot feature — otherwise `vectorStore.service.ts` can be omitted and the chatbot still works without retrieval grounding.
- **Cloudinary/Groq/HF**: free tiers are sufficient for a hackathon demo; Groq's free tier is generous and fast enough for live judging.
