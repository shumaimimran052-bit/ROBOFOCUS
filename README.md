# 🤖 ROBOFOCUS 2.0 — AI Executive Function Assistant

> Built for the Decoding Data Science Community Challenge, 12th Edition
> LLM/API Integration Path

**Live demo:** https://robofocus.vercel.app

---

## What is ROBOFOCUS?

ROBOFOCUS is an AI-powered productivity assistant designed specifically for people with ADHD and focus challenges. Unlike generic todo apps, ROBOFOCUS understands *why* you don't get things done and actively helps you overcome it.

**"An AI that understands why you don't get things done and helps you overcome it."**

---

## The Problem

People with ADHD don't fail because they lack tools. They already have:
- Todo apps
- Calendars
- Reminders

They fail because of:
- **Starting** — tasks feel too big to begin
- **Switching** — moving between tasks destroys momentum
- **Time blindness** — losing track of where the day went
- **Overwhelm** — too many tasks causing paralysis
- **Avoidance** — repeatedly postponing the same tasks
- **Loneliness while working** — it's easier to stay on task when someone is there with you

ROBOFOCUS directly attacks each of these problems.

---

## ✨ What's new in 2.0

| Feature | What it does |
|---|---|
| 🔔 **Smart Nudges** | Gentle pop-up reminders for tasks postponed 3+ times, tasks still due today, a streak about to end, and "you haven't started anything yet". They respect your Settings, your quiet hours, and can be snoozed for an hour. Optional browser notifications work while the tab is open in the background. |
| 🔥 **Streaks + Daily Quests** | A real day streak (it used to be a fixed number) and 3 daily quests: complete 2 missions (+20 XP), do a mood check-in (+10 XP), finish a focus session (+30 XP). Claim each one for bonus XP. |
| 📊 **Weekly Review** | A new tab on Insights: 7-day stats compared with last week, a daily focus chart, and an AI-written summary with your wins, a pattern, and one suggestion for next week. Falls back to an offline summary if the AI is unavailable. |
| 🤝 **Body Doubling** | A new page where ROBOFOCUS works alongside you. It stays quiet, checks in every 5 to 25 minutes, gives you one tiny next step when you say you're stuck, and rewards finished sessions. No camera needed. |
| ⚙️ **Settings that stick** | Toggles, wake time and do-not-disturb time are now remembered and actually control the nudges. |
| 🎨 **New look for Body Double** | An animated purple topographic WebGL background and a refreshed layout. |

Focus Mode (camera attention monitor), Focus History and the AI Assistant are unchanged from 1.0.

### 1.0 → 2.0

| 1.0 | 2.0 |
|---|---|
| Fixed streak number | Real streak counted from your daily activity |
| Reminders only on the dashboard | Nudges across the app, with snooze and quiet hours |
| Insights showed raw numbers | Weekly Review explains what the numbers mean |
| Settings reset on refresh | Settings are saved |
| Focus help needed a camera | Body Doubling gives company without one |

---

## Features

### 🧠 AI Brain Dump + Brain Map
Speak or type your chaotic thoughts. AI organizes them into categorized tasks. Switch to Brain Map view to see your thoughts as an interactive node network — drag nodes, explore connections.

### 🤖 AI Voice Assistant
Conversational AI powered by Groq (Llama 3.3 70B). Speak to it, it speaks back. Keeps the conversation history and answers in short, direct coaching replies.

### ⏱️ Focus Mode with Camera Attention Monitor
Pomodoro-style timer with AI-powered webcam monitoring using face-api.js. Tracks distractions such as:
- Phone detected
- Leaving the camera view
- Looking away
- Talking
- Being inactive / too still

The timer pauses automatically when a distraction is detected, and a focus score is calculated for each session. Completion photo upload to prove work done.

### 🚨 Procrastination Detector
Tracks how many times each task gets postponed. At 3+ postponements, AI flags it, analyses why you're avoiding it, and suggests one micro-action to start immediately.

### ⚡ Overwhelm Detector
When 8+ tasks are pending, AI automatically picks your top 3 priorities and offers a focus mode showing only those three.

### 🎯 AI Task Decomposer
Paste any scary task. AI breaks it into 4-7 micro-steps with time estimates and ADHD-friendly tips. Each step has a direct "START" button linking to Focus Mode.

### 🚀 AI Mission Planner
Give the AI a goal and a timeframe. It generates a complete day-by-day study/work plan with daily focus sessions that build progressively toward completion.

### 💜 Mood + Energy Adjuster
Daily mood check-in with voice detection. AI reads your emotional state and adjusts session recommendations — tired = 15 min sessions, great = 45 min sessions. Briefing and nudges adapt to your mood.

### 🏆 RPG / XP System
Every completed task, focus session, mood check-in, quest and body double session earns XP. Level up from ROOKIE → FOCUSED → LOCKED IN → EXECUTOR → ELITE → MACHINE → LEGEND.

### 📊 Insights + Time Blindness Map + Weekly Review
Real data from your sessions: focus hours, completion rate, distraction count. The Time Blindness Map shows an hour-by-hour view of your day — see exactly where time went and how many hours are unaccounted for. The Weekly Review turns the week into a short, actionable summary.

### 💾 Memory Vault
AI-generated mood images for each memory using Pollinations.ai. Three-panel layout with list, gallery, and detail views.

---

## Screenshots

| Dashboard + Daily Quests | Weekly Review | Body Double |
|---|---|---|
| ![Dashboard](docs/dashboard.png) | ![Weekly Review](docs/weekly-review.png) | ![Body Double](docs/body-double.png) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router DOM |
| Animations | Framer Motion |
| AI/LLM | Groq API (Llama 3.3 70B) for the Assistant and 2.0 features, OpenRouter (Llama 3.1 8B Free) for Dashboard and Insights |
| Face Detection | face-api.js + TensorFlow.js |
| 3D Robot | Spline |
| Charts | Recharts |
| Backgrounds | WebGL shaders (including the 2.0 topographic field), Three.js, OGL, Paper Design |
| Voice | Web Speech API (browser built-in) |
| Storage | localStorage |
| Hosting | Vercel |

**Total cost to run: $0** — all free APIs and free models.

---

## Pages

| Route | Page | Background |
|---|---|---|
| `/` | Landing | NeuralVortex WebGL |
| `/login` | Login/Signup | NeuralVortex |
| `/onboarding` | Onboarding | Static gradient |
| `/dashboard` | Mission Control + Daily Quests | ProceduralGround WebGL |
| `/braindump` | Brain Dump + Map | LiquidShader Three.js |
| `/assistant` | AI Assistant | Dark gradient |
| `/bodydouble` | Body Double (new in 2.0) | Purple topographic WebGL |
| `/focus` | Focus Mode | ShaderBackground WebGL |
| `/focus/history` | Focus History | ShaderBackground |
| `/mission` | Mission Planner | FlowField particles |
| `/memory` | Memory Vault | Aurora + stars |
| `/insights` | Insights + Weekly Review | GridGlow |
| `/settings` | Settings | ShaderBackground |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/shumaimimran052-bit/ROBOFOCUS.git
cd ROBOFOCUS
npm install
```

### Environment Setup

Create a `.env` file in the root directory (never commit it):

```env
VITE_GROQ_KEY=your_groq_key_here
VITE_OPENROUTER_KEY=your_openrouter_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Both AI keys are free: get a Groq key at [console.groq.com](https://console.groq.com) and an OpenRouter key at [openrouter.ai](https://openrouter.ai). No credit card needed. The Supabase names must match the ones used in `src/lib/supabase.ts`.

Without a key the app still works: AI features fall back to built-in offline suggestions.

### Face Detection Models

The model files are included in `public/models/`. If they are ever missing, download them (on Windows PowerShell use `curl.exe`):

```bash
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json" -o "public/models/tiny_face_detector_model-weights_manifest.json"

curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1" -o "public/models/tiny_face_detector_model-shard1"

curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json" -o "public/models/face_landmark_68_model-weights_manifest.json"

curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1" -o "public/models/face_landmark_68_model-shard1"
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Deploy

Push to GitHub and import the repo in Vercel. Add the same environment variables in Vercel → Project → Settings → Environment Variables, then redeploy.

---

## Project Structure

```
ROBOFOCUS/
├── public/
│   └── models/                  # face-api.js model files
├── src/
│   ├── components/
│   │   └── ui/                  # Backgrounds, Sidebar, VoiceOrb, and the 2.0 components:
│   │                            #   NudgeBanner, QuestsCard, WeeklyReview,
│   │                            #   WhatsNewModal, TopoField
│   ├── pages/                   # All 13 page components (BodyDoublingPage is new)
│   ├── lib/                     # Utilities, types, storage, and robofocus.ts
│   │                            #   (settings, streaks, quests, nudges, AI helper)
│   └── App.tsx                  # Routes
├── .env                         # API keys (never commit this)
└── package.json
```

---

## Key Design Decisions

**Why no custom backend?** Everything runs in the browser using localStorage. This keeps it fully free to run, zero setup for judges, and demonstrates what's possible with purely frontend AI integration.

**Why Groq and OpenRouter?** Both offer free Llama models with no billing and no CORS issues. The Assistant and the 2.0 features use Groq (Llama 3.3 70B) for faster, better replies, and the AI helper falls back to OpenRouter and then to offline text, so features never break when a key is missing or a request fails.

**Why is Focus Mode untouched in 2.0?** Its camera detection took the most work to get right. All 2.0 features connect from the outside by reading the same saved data, so there was no risk of breaking it.

**Why Body Doubling without a camera?** Body doubling works because someone is present with you. A quiet companion with check-ins gives that effect to people who can't or don't want to use a webcam.

**Why face-api.js over MediaPipe?** face-api.js loads models directly from the public folder with no external dependencies, making it fully offline-capable after initial load.

---

## Hackathon Context

- **Challenge:** Decoding Data Science Community, 12th Edition
- **Path:** LLM/API Integration Path
- **Theme:** AI that solves real ADHD executive function challenges
- **Inspiration:** Real ADHD community posts describing failure patterns — not wanting more task lists, but needing help with *starting*, *switching*, and *overwhelm*

---

## License

MIT — built for the Decoding Data Science Hackathon