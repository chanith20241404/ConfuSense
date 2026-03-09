# ConfuSense v7.0

Real-time student engagement monitoring for Google Meet, powered by Gemini.

## How It Works

```
Student joins Google Meet
  └── Chrome extension captures webcam at 1fps (320×240 JPEG)
       └── Frame POSTed to backend → NATS JetStream queue
            └── Consumer scores frame with Gemini 2.5 Flash Lite (0.0–1.0)
                 └── Score < 0.5 → notification inserted for student + all hosts
                      ├── Student: popup "Are you engaged?" [Yes] [No]
                      └── Host: toast warning with student ID + score
```

The **dashboard** at `http://localhost:4000` shows per-meeting engagement history with auto-refresh.

---

## Quick Start

### 1. Prerequisites
- Docker + Docker Compose
- Chrome browser
- Gemini API key

### 2. Start the backend stack

```bash
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY

docker compose up --build -d
```

Services started:

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:3000 | Express + Drizzle + NATS consumer |
| Dashboard | http://localhost:4000 | Engagement history UI |
| Landing page | http://localhost:5000 | Marketing site |
| NATS | localhost:4222 | Message queue (JetStream) |
| LibSQL (sqld) | localhost:8080 | Persistent database |

### 3. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder in this repo

### 4. Use it

- Open a Google Meet call
- The extension auto-detects the meeting and your role (host/student)
- **Students** have their webcam frames scored every second
- **Hosts** receive toast notifications when students disengage
- Dashboard at http://localhost:4000 shows live engagement

---

## Architecture

```
confusense/
├── extension/              Chrome MV3 (vanilla JS, load unpacked)
│   ├── manifest.json
│   ├── background.js       UUID generation on install
│   ├── content-script.js   All logic: capture, polling, popups, toasts
│   └── styles.css
│
├── backend/                Node.js + TypeScript
│   └── src/
│       ├── api/routes/     REST endpoints
│       ├── db/             Drizzle ORM (schema, client, queries)
│       ├── gemini/         Gemini client with retry
│       ├── queue/          NATS JetStream publisher + consumer
│       ├── config.ts       Zod env validation
│       └── index.ts        Express app entry
│
├── dashboard/              React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/          Home (meeting list), Meeting (per-student scores)
│       ├── components/     MeetingCard, StudentRow, EngagementBadge
│       └── lib/api.ts      Typed fetch wrappers
│
├── landing page/           React 18 + Vite (marketing site)
├── docker-compose.yml
└── .env.example
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions/join` | Register joining a meeting `{uuid, role, meetingId}` |
| POST | `/api/frames` | Submit a webcam frame for scoring `{uuid, meetingId, frame}` |
| GET | `/api/notifications/:uuid` | Poll for notifications (marks as read) |
| POST | `/api/responses/:uuid` | Student engagement response `{meetingId, engaged}` |
| GET | `/api/dashboard` | List active meetings (last 2 hours) |
| GET | `/api/dashboard/:meetingId` | Per-student engagement for a meeting |

## Development

**Package manager: bun**

```bash
# Backend
cd backend
bun install
bun run dev          # tsx watch (hot reload)
bun run tsc --noEmit # type check

# Dashboard
cd dashboard
bun install
bun run dev          # Vite dev server on :4000

# After backend code changes (Docker)
docker compose up --build -d backend

# Watch backend logs
docker compose logs -f backend
```

## Engagement Score Colors

| Score | Color | Meaning |
|-------|-------|---------|
| ≥ 0.7 | 🟢 Green | Engaged |
| 0.5–0.7 | 🟡 Yellow | Partially engaged |
| < 0.5 | 🔴 Red | Disengaged — notification sent |

---

## Team — SE Group 06 Subgroup 11

| Member | Role |
|--------|------|
| Chanith Thewnaka | Team Lead, ML Pipeline |
| Faraz Ahamed | Extension Development |
| Rashmi Pathiraja | Dashboard & Analytics |
| Manojkumar Tejeas | Backend & API |
| Nethya Fernando | Federated Learning & Privacy |
| Nisanda Gunasinha | Testing & Logging |

**SDGP 2025/26 — Informatics Institute of Technology / University of Westminster**
