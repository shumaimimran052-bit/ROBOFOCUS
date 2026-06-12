# 🤖 ROBOFOCUS — AI Executive Function Assistant

> Built for the Decoding Data Science Community Challenge, 12th Edition
> LLM/API Integration Path

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

ROBOFOCUS directly attacks each of these problems.

---

## Features

### 🧠 AI Brain Dump + Brain Map
Speak or type your chaotic thoughts. AI organizes them into categorized tasks. Switch to Brain Map view to see your thoughts as an interactive node network — drag nodes, explore connections.

### 🤖 AI Voice Assistant
Full conversational AI powered by OpenRouter (Llama 3.1). Speak to it, it speaks back. Maintains conversation history. Adjusts advice based on your current mood and tasks.

### ⏱️ Focus Mode with Camera Attention Monitor
Pomodoro-style timer with AI-powered webcam monitoring using face-api.js. Detects:
- Looking left/right
- Head tilted down (phone use)
- Leaving camera view
Timer pauses automatically when distraction detected. Completion photo upload to prove work done.

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
Every completed task, focus session, and mood check-in earns XP. Level up from ROOKIE → FOCUSED → LOCKED IN → EXECUTOR → ELITE → MACHINE → LEGEND.

### 📊 Insights + Time Blindness Map
Real data from your sessions: focus hours, completion rate, distraction count. Time Blindness Map shows a visual hour-by-hour map of your day — see exactly where time went and how many hours are unaccounted for.

### 💾 Memory Vault
AI-generated mood images for each memory using Pollinations.ai. Three-panel layout with list, gallery, and detail views.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router DOM |
| Animations | Framer Motion |
| AI/LLM | OpenRouter API (Llama 3.1 8B Free) |
| Face Detection | face-api.js |
| 3D Robot | Spline |
| Charts | Recharts |
| Backgrounds | WebGL shaders, Three.js, OGL, Paper Design |
| Voice | Web Speech API (browser built-in) |
| Storage | localStorage |

**Total cost to run: $0** — all free APIs and free models.

---

## Pages

| Route | Page | Background |
|---|---|---|
| `/` | Landing | NeuralVortex WebGL |
| `/login` | Login/Signup | NeuralVortex |
| `/onboarding` | Onboarding | Static gradient |
| `/dashboard` | Mission Control | ProceduralGround WebGL |
| `/braindump` | Brain Dump + Map | LiquidShader Three.js |
| `/assistant` | AI Assistant | Dark gradient |
| `/focus` | Focus Mode | ShaderBackground WebGL |
| `/focus/history` | Focus History | ShaderBackground |
| `/mission` | Mission Planner | FlowField particles |
| `/memory` | Memory Vault | Aurora + stars |
| `/insights` | Insights | GridGlow |
| `/settings` | Settings | GridGlow |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/yourusername/ROBOFOCUS.git
cd ROBOFOCUS
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_OPENROUTER_KEY=your_api_key_here
```

You will need a free API key for the AI features. Sign up at [openrouter.ai](https://openrouter.ai) — no credit card required. The app uses free models only so there is no cost.

### Face Detection Models

Download the face detection model files into `public/models/`:

```bash
# Run these in your terminal
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

---

## Project Structure

ROBOFOCUS/
├── public/
│   └── models/          # face-api.js model files
├── src/
│   ├── components/
│   │   └── ui/          # Background components, Sidebar, VoiceOrb
│   ├── pages/           # All 12 page components
│   ├── lib/             # Utilities, types, storage
│   └── App.tsx          # Routes
├── .env                 # API keys (never commit this)
└── package.json

---

## Key Design Decisions

**Why no backend?** Everything runs in the browser using localStorage. This keeps it fully free to run, zero setup for judges, and demonstrates what's possible with purely frontend AI integration.

**Why OpenRouter instead of direct APIs?** OpenRouter provides free access to Llama 3.1 8B with no CORS issues, no billing required, and no rate limits for demos.

**Why face-api.js over MediaPipe?** face-api.js loads models directly from the public folder with no external dependencies, making it fully offline-capable after initial load.

---

## Hackathon Context

- **Challenge:** Decoding Data Science Community, 12th Edition
- **Path:** LLM/API Integration Path
- **Theme:** AI that solves real ADHD executive function challenges
- **Inspiration:** Real ADHD community posts describing failure patterns — not wanting more task lists, but needing help with *starting*, *switching*, and *overwhelm*

---

## Screenshots

Landing → Dashboard → Brain Map → Focus Mode → Mission Planner → Insights

---

## License

MIT — built for the Decoding Data Science Hackathon 2025
