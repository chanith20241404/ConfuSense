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
