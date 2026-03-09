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
