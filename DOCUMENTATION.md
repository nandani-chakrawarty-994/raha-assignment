# Step-by-Step Documentation — Raha Field Tracker

This document walks you through **every step**: understanding the product, setting up tools, configuring MongoDB, running the app, using each role, deploying to Vercel, and how the code is organised.

---

## Table of contents

1. [What you are building](#1-what-you-are-building)
2. [Prerequisites](#2-prerequisites)
3. [Project already created in this folder](#3-project-already-created-in-this-folder)
4. [Create a free MongoDB Atlas database](#4-create-a-free-mongodb-atlas-database)
5. [Configure environment variables](#5-configure-environment-variables)
6. [Install dependencies](#6-install-dependencies)
7. [Seed demo data](#7-seed-demo-data)
8. [Run locally](#8-run-locally)
9. [How to use — Sales Associate](#9-how-to-use--sales-associate)
10. [How to use — Branch Head](#10-how-to-use--branch-head)
11. [API reference](#11-api-reference)
12. [Folder structure](#12-folder-structure)
13. [Data model explained](#13-data-model-explained)
14. [Auth & security](#14-auth--security)
15. [Distance engine](#15-distance-engine)
16. [Edge cases](#16-edge-cases)
17. [Tests](#17-tests)
18. [Deploy to Vercel](#18-deploy-to-vercel)
19. [GitHub submission checklist](#19-github-submission-checklist)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. What you are building

A web app where:

1. **Sales Associates** start their day, visit leads, log in-person meetings (with GPS), and end the day. The app calculates **total kilometres** travelled.
2. **Branch Heads** review the team’s activities, see distances, search associates, and **export a monthly CSV** for fuel reimbursement.

Roles are enforced on the **API**, not only hidden in the UI.

---

## 2. Prerequisites

Install these on your Windows PC:

| Tool | Why | How to check |
|------|-----|--------------|
| **Node.js 18+** (20 or 22 recommended) | Runs Next.js | `node -v` |
| **npm** | Installs packages | `npm -v` |
| **Git** (optional but needed for GitHub) | Version control | `git --version` |
| **MongoDB Atlas account** (free) | Cloud database | https://www.mongodb.com/cloud/atlas |
| Modern browser (Chrome / Edge) | Geolocation for field logging | — |

Optional:

| Tool | Why |
|------|-----|
| OpenRouteService free API key | Real **road** distances instead of straight-line |
| Vercel account | Free deployment |

---

## 3. Project already created in this folder

Your workspace:

`C:\Users\DELL\Desktop\RAHA assessment`

Already contains:

- Next.js 15 + React 19 + TypeScript + Tailwind
- MongoDB models & API routes
- Associate + Branch Head screens
- Seed script
- README + this documentation

You do **not** need to run `create-next-app` again.

---

## 4. Create a free MongoDB Atlas database

### Step 4.1 — Sign up

1. Go to https://www.mongodb.com/cloud/atlas  
2. Create a free account  
3. Create a **Free (M0)** cluster (any region close to you, e.g. Mumbai / Singapore)

### Step 4.2 — Database user

1. **Database Access** → **Add New Database User**  
2. Authentication: Password  
3. Username e.g. `raha_app`  
4. Password: generate a strong one (save it)  
5. Role: **Atlas admin** or **Read and write to any database**  
6. Create user

### Step 4.3 — Network access

1. **Network Access** → **Add IP Address**  
2. For local development you can choose **Allow Access from Anywhere** (`0.0.0.0/0`)  
   - Fine for a take-home demo; tighten later for production  

### Step 4.4 — Connection string

1. **Database** → **Connect** → **Drivers**  
2. Copy the URI. It looks like:

```text
mongodb+srv://raha_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

3. Replace `<password>` with your real password (URL-encode special characters if needed)  
4. Add a database name before `?`, e.g.:

```text
mongodb+srv://raha_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raha-field-tracker?retryWrites=true&w=majority
```

---

## 5. Configure environment variables

### Step 5.1 — Create `.env.local`

In the project folder, copy the example file:

**PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

### Step 5.2 — Edit `.env.local`

Open `.env.local` and set:

```env
MONGODB_URI=mongodb+srv://raha_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raha-field-tracker?retryWrites=true&w=majority

JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars

# Optional — road distance
OPENROUTESERVICE_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Tips**

- Never commit `.env.local` (it is in `.gitignore`)
- `JWT_SECRET` can be any long random text
- Leave `OPENROUTESERVICE_API_KEY` empty to use Haversine (allowed by the brief)

### Step 5.3 — Optional OpenRouteService key

1. Sign up at https://openrouteservice.org/dev/#/signup  
2. Create a free key  
3. Paste into `OPENROUTESERVICE_API_KEY`  
4. Restart `npm run dev`

---

## 6. Install dependencies

Open PowerShell in the project folder:

```powershell
cd "C:\Users\DELL\Desktop\RAHA assessment"
npm install
```

Wait until packages finish installing.

---

## 7. Seed demo data

```powershell
npm run seed
```

This will:

1. Connect to MongoDB  
2. Clear users / leads / days / activities  
3. Create **1 branch head** + **3 associates**  
4. Create **5 leads** (Hyderabad locations)  
5. Create several **historical closed days** so the monthly export has data  

You should see credentials printed in the terminal.

---

## 8. Run locally

```powershell
npm run dev
```

Open: **http://localhost:3000**

You will be redirected to `/login`.

---

## 9. How to use — Sales Associate

1. Login as `arjun.sales@raha.example` / `Password123!`  
2. Allow **location** when the browser asks  
3. Tap **Start Day** → GPS + timestamp stored  
4. Choose a **Lead**, write **notes**, tap **Add Activity** (can repeat)  
5. Tap **End Day** → total km calculated  
6. Scroll to see **timeline**, accuracy, and history  

### Notes for field testing

- Use a phone on the same Wi‑Fi / URL (`http://YOUR_PC_LAN_IP:3000`) for real GPS  
- On desktop, Chrome may use approximate IP location — fine for demos  
- If permission is denied, the UI shows a clear error and does not fake coordinates  

---

## 10. How to use — Branch Head

1. Log out, then login as `priya.head@raha.example` / `Password123!`  
2. **Filters** — pick a date and/or associate  
3. **Distance by associate** — totals for the filter  
4. **Team activity feed** — meetings with associate names  
5. **Search** — type a name → View history  
6. **Monthly fuel export** — choose year/month → **Download CSV**  

Open the CSV in Excel / Google Sheets for HR.

---

## 11. API reference

All authenticated routes require the `raha_session` httpOnly cookie (set on login).

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | public | Login |
| POST | `/api/auth/logout` | any | Logout |
| GET | `/api/auth/me` | any logged in | Current user |
| GET | `/api/leads` | any logged in | List leads |
| GET | `/api/day` | associate | Current / date day |
| POST | `/api/day` | associate | Start day |
| POST | `/api/day/end` | associate | End day |
| GET | `/api/day/history` | associate | Own history |
| POST | `/api/activities` | associate | Log meeting |
| GET | `/api/team` | branch head | Team days / feed / distances |
| GET | `/api/team/search` | branch head | Search or history by id |
| GET | `/api/team/export` | branch head | Monthly CSV (`year`, `month`) |

### Example login (PowerShell)

```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"arjun.sales@raha.example","password":"Password123!"}' `
  -SessionVariable s
```

### Role isolation check

As an associate, calling `/api/team` returns **403 Forbidden**.  
As a branch head, calling `POST /api/day` returns **403 Forbidden**.

---

## 12. Folder structure

```text
RAHA assessment/
├── DOCUMENTATION.md          ← this file
├── README.md                 ← summary + assumptions
├── .env.example
├── package.json
├── scripts/
│   └── seed.ts               ← demo data
├── src/
│   ├── middleware.ts         ← route + role redirects
│   ├── app/
│   │   ├── login/page.tsx
│   │   ├── associate/page.tsx
│   │   ├── branch-head/page.tsx
│   │   └── api/…             ← backend routes
│   ├── components/           ← UI pieces
│   ├── hooks/useGeolocation.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── distance/         ← swappable providers + tests
│   │   ├── day-payload.ts
│   │   ├── validations.ts    ← Zod schemas
│   │   └── utils.ts
│   └── models/               ← Mongoose schemas
```

---

## 13. Data model explained

### User
- `role`: `sales_associate` | `branch_head`
- `reportsTo`: ObjectId of branch head (null for heads)
- `passwordHash`: bcrypt hash (never store plain passwords)

### Lead
- Business to visit: `name`, `contact`, geo `location`

### DaySession
- One working day for one associate  
- `status`: `open` until End Day, then `closed`  
- Stores start/end GPS + `totalDistanceKm`  
- `localDate` (`YYYY-MM-DD`) uses the client timezone offset so “today” matches the field user’s calendar  

### Activity
- Belongs to a `DaySession` and a `Lead`  
- Type fixed to `in_person_meeting` for this assessment  
- `segmentDistanceKm` = distance from previous route point  

**Relations**

```text
BranchHead 1──* SalesAssociate
SalesAssociate 1──* DaySession 1──* Activity *──1 Lead
```

---

## 14. Auth & security

1. Login verifies bcrypt password  
2. JWT signed with `JWT_SECRET` (HS256, 8h expiry)  
3. Token stored in **httpOnly** cookie (`raha_session`) — not readable by JS  
4. `secure` flag on in production  
5. Middleware guards page routes by role  
6. Each API handler calls `getSessionUser()` + `requireRole()`  
7. Branch head queries always filter `reportsTo = currentUser.id`  

---

## 15. Distance engine

File: `src/lib/distance/index.ts`

```text
calculateRouteDistance(points)
  → sort by capturedAt
  → for each consecutive pair: provider.segmentKm(a, b)
  → sum & round to 2 decimals
```

Providers:

- `createOpenRouteServiceProvider(apiKey)` — driving-car directions  
- `createHaversineProvider()` — great-circle fallback  

`getDistanceProvider()` picks based on env. Call sites never hard-code Haversine vs ORS.

---

## 16. Edge cases

Documented in README; implemented as:

| Situation | Code behaviour |
|-----------|----------------|
| Double Start Day | `409` with existing `dayId` |
| End without start | `409` |
| Activity without open day | `409` |
| GPS denied | UI error from `useGeolocation` |
| Near-identical points | 0 km segment |
| Open day overnight | Remains `open`; timeline shows “Day still open” |
| Timezones | `timezoneOffsetMinutes` + `localDate` |

---

## 17. Tests

```powershell
npm test
```

Covers Haversine sanity, duplicate points, and **timestamp ordering** (not insertion order).

---

## 18. Deploy to Vercel

### Step 18.1 — Push to GitHub

```powershell
cd "C:\Users\DELL\Desktop\RAHA assessment"
git init
git add .
git commit -m "Initial Raha Field Tracker assessment submission"
```

Create a GitHub repo and push (`git remote add` + `git push -u origin main`).

### Step 18.2 — Import on Vercel

1. https://vercel.com → **Add New Project**  
2. Import your GitHub repo  
3. Framework: Next.js (auto-detected)  

### Step 18.3 — Environment variables on Vercel

Add the same keys as `.env.local`:

- `MONGODB_URI`  
- `JWT_SECRET`  
- `OPENROUTESERVICE_API_KEY` (optional)  
- `NEXT_PUBLIC_APP_URL` = your Vercel URL  

### Step 18.4 — Atlas network

Ensure Atlas allows Vercel IPs (or `0.0.0.0/0` for the demo).

### Step 18.5 — Seed against production DB

Locally, point `.env.local` at the same Atlas URI (or temporarily) and run:

```powershell
npm run seed
```

Then deploy / open the Vercel URL and login with seed users.

---

## 19. GitHub submission checklist

From the assessment brief:

- [ ] Public GitHub/Bitbucket repo with clear commits  
- [ ] Deployed Vercel link  
- [ ] Test credentials (associate + branch head) in README  
- [ ] README: setup, seed, data model, assumptions, improvements  
- [ ] Mention Haversine if no routing API key  

---

## 20. Troubleshooting

### `Please define the MONGODB_URI`
→ Create `.env.local` and restart the dev server / re-run seed.

### Seed fails with authentication error
→ Wrong password in URI, or Atlas user / IP allowlist not set.

### `JWT_SECRET must be set`
→ Add `JWT_SECRET` to `.env.local` (16+ characters).

### Location always fails on HTTP from another device
→ Some browsers require **HTTPS** for geolocation (except `localhost`). Use Vercel HTTPS for phone demos, or Chrome flags for local LAN testing.

### Associate can open `/branch-head` in the URL bar
→ Middleware should redirect them back to `/associate`. If cookie is missing/invalid, they go to login. Direct API calls still return 403.

### Build errors about fonts
→ Needs network on first `next build` to fetch Google fonts (`Geist`). Offline builds may fail until cached.

### Port 3000 in use
```powershell
npx next dev -p 3001
```

---

## Build order (how this app was assembled)

If you want to understand the engineering sequence:

1. Scaffold Next.js + Tailwind + TypeScript  
2. Define TypeScript types + Mongoose models  
3. Wire `connectDB` + JWT auth helpers  
4. Implement swappable distance module + tests  
5. Add associate APIs (day start/end, activities, history)  
6. Add branch head APIs (team, search, export)  
7. Build login + associate + branch head UI  
8. Add middleware for page-level role gates  
9. Write seed script  
10. Write README + this documentation  

---

**Questions about the product brief?** Reply to the Raha assessment email.  
**Questions about this codebase?** Start with `README.md`, then the files under `src/lib/` and `src/app/api/`.
