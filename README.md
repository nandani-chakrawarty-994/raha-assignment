# Raha Field Tracker

Field activity tracking and distance-based fuel reimbursement for sales associates and branch heads.

Built for the **Raha Fintech Full Stack Developer Take-Home Assessment**.

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS |
| API | Next.js Route Handlers |
| Database | MongoDB (Mongoose) |
| Auth | JWT in httpOnly cookie (`jose` + `bcryptjs`) |
| Distance | OpenRouteService (road) with Haversine fallback |
| Deploy | Vercel |

## Test credentials (after seeding)

| Role | Email | Password |
|------|--------|----------|
| Branch Head | `priya.head@raha.example` | `Password123!` |
| Sales Associate | `arjun.sales@raha.example` | `Password123!` |
| Sales Associate | `sneha.sales@raha.example` | `Password123!` |
| Sales Associate | `vikram.sales@raha.example` | `Password123!` |

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# Edit .env.local → set MONGODB_URI and JWT_SECRET

# 3. Seed demo data
npm run seed

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full step-by-step guide: see **[DOCUMENTATION.md](./DOCUMENTATION.md)**.

## Features

### Sales Associate
- Start Day / End Day with automatic geolocation
- Log In-Person Meeting activities against seeded leads
- View today's timeline + total distance
- View own history

### Branch Head
- Team activity feed with associate names
- Distance totals per associate (filter by date / associate)
- Search associates and view history
- Monthly CSV export for fuel reimbursement

### Access control
- Role checks on **every API route** (not only UI)
- Middleware blocks `/associate` vs `/branch-head` by role
- Associates cannot read other associates' data
- Branch heads only see associates who `reportsTo` them

## Distance calculation

Route order:

`Start → Activity 1 → Activity 2 → … → End`

Points are sorted by **timestamp**, then consecutive segment distances are summed (km, 2 decimals).

1. If `OPENROUTESERVICE_API_KEY` is set → road distance via OpenRouteService  
2. Otherwise → **Haversine** (straight-line)

> **Note:** Without an ORS key, distance under-reports real driving distance. The provider is swappable in `src/lib/distance/index.ts` without changing callers.

Near-duplicate points (&lt; 15 m apart) count as **0 km** for that segment.

## Data model

```
User (role: sales_associate | branch_head, reportsTo?)
Lead (name, contact, lat/lng)
DaySession (userId, status open|closed, start/end location, totalDistanceKm, localDate)
Activity (daySessionId, userId, leadId, notes, location, segmentDistanceKm)
```

## Edge cases handled

| Case | Behaviour |
|------|-----------|
| Location permission denied / no fix | Clear error; action blocked |
| Start Day twice | `409` — must end open day first |
| End Day with no start | `409` |
| Activity after day ended / no open day | `409` |
| Day started never ended | Stays `open`; running distance shown; flagged in timeline |
| Identical / near points | Segment = 0 km |
| Midnight / timezone | Client sends `timezoneOffsetMinutes`; `localDate` stored as YYYY-MM-DD |
| Poor GPS accuracy | Stored and shown next to each capture |

## Bonus included

- Mobile-responsive layout
- Accuracy radius displayed
- Branch head date / associate filters
- Map embed + Google Maps route link
- Unit tests for distance helpers: `npm test`

## Continuous tracking (README discussion)

**How would you capture the route continuously?**

In a browser you could poll `watchPosition` / Geolocation every N seconds or metres and append breadcrumbs to the open day. Limitations: tabs sleep in background, browsers throttle GPS, battery drain, permission revocation, and unreliable tracking when the phone is locked. Better approach: a lightweight native/PWA companion (or Capacitor/React Native) that writes breadcrumbs to the same API while the OS allows background location, then snap the trail to roads server-side. For reimbursement, sampling at start / meetings / end (this app) is usually enough and more auditable than continuous noise.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run seed` | Seed MongoDB |
| `npm test` | Distance unit tests |

## Assumptions

- One open day per associate at a time
- Leads are shared org-wide (not per associate)
- Monthly export uses `localDate` prefix (associate's calendar day), not UTC-only
- Fuel report is CSV (Excel-compatible)

## What I'd improve with more time

- Draw real road polylines on an interactive map (Leaflet + ORS geometry)
- Background geolocation via a mobile app
- Soft reminders for open days left overnight
- Pagination / infinite scroll on team feeds
- Playwright e2e for role isolation
- Excel (`.xlsx`) export in addition to CSV
