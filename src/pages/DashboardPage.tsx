import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Mic, Bell, CheckCircle2, Circle, Zap, Brain,
    TrendingUp, Clock, AlertTriangle, Trophy,
    Sparkles, Target, X, Plus, Heart,
    Battery, BatteryLow, Smile, Meh, Frown, MicOff
} from 'lucide-react'
import ProceduralGround from '../components/ui/ProceduralGround'
import Sidebar from '../components/ui/Sidebar'

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY

interface Task {
    id: number
    name: string
    meta: string
    priority: 'high' | 'med' | 'low'
    done: boolean
    postponeCount: number
    category: string
}

interface XPEvent {
    id: string
    label: string
    xp: number
    time: string
}

interface MoodState {
    mood: 'great' | 'good' | 'tired' | 'stressed' | 'awful' | null
    energy: 'high' | 'medium' | 'low' | null
    note: string
    timestamp: string
}

const LEVELS = [
    { level: 1, name: 'ROOKIE', xpRequired: 0, color: '#a855f7' },
    { level: 2, name: 'FOCUSED', xpRequired: 100, color: '#8b5cf6' },
    { level: 3, name: 'LOCKED IN', xpRequired: 250, color: '#7c3aed' },
    { level: 4, name: 'EXECUTOR', xpRequired: 500, color: '#6d28d9' },
    { level: 5, name: 'ELITE', xpRequired: 1000, color: '#5b21b6' },
    { level: 6, name: 'MACHINE', xpRequired: 2000, color: '#4c1d95' },
    { level: 7, name: 'LEGEND', xpRequired: 5000, color: '#ff3cac' },
]

const XP_REWARDS = { taskComplete: 25, focusSession: 50, brainDump: 15, moodCheckIn: 10 }

const MOOD_CONFIG = {
    great: { icon: '🚀', label: 'GREAT', color: '#00cc60', desc: 'Ready to crush it' },
    good: { icon: '😊', label: 'GOOD', color: '#00c8ff', desc: 'Feeling solid' },
    tired: { icon: '😴', label: 'TIRED', color: '#f59e0b', desc: 'Low on energy' },
    stressed: { icon: '😰', label: 'STRESSED', color: '#ff3cac', desc: 'Overwhelmed' },
    awful: { icon: '💀', label: 'AWFUL', color: '#ef4444', desc: 'Rough day' },
}

const ENERGY_CONFIG = {
    high: { icon: '⚡', label: 'HIGH ENERGY', color: '#00cc60' },
    medium: { icon: '🔋', label: 'MEDIUM', color: '#f59e0b' },
    low: { icon: '🪫', label: 'LOW ENERGY', color: '#ef4444' },
}

const priorityColor: Record<string, string> = {
    high: '#ff3cac', med: '#7c3aed', low: '#4f46e5',
}

const callAI = async (prompt: string): Promise<string> => {
    if (!OPENROUTER_KEY) throw new Error('No key')
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'ROBOFOCUS',
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 120,
            temperature: 0.75,
        })
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

export default function DashboardPage() {
    const navigate = useNavigate()

    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const saved = localStorage.getItem('rf_tasks')
            if (saved) return JSON.parse(saved)
        } catch { }
        return [
            { id: 1, name: 'Chemistry lab report', meta: 'DUE TOMORROW', priority: 'high', done: false, postponeCount: 3, category: 'SCHOOL' },
            { id: 2, name: 'Email Mr. Ahmed about test', meta: 'TODAY', priority: 'med', done: false, postponeCount: 0, category: 'SCHOOL' },
            { id: 3, name: 'Buy notebooks after school', meta: 'TODAY', priority: 'low', done: false, postponeCount: 1, category: 'PERSONAL' },
            { id: 4, name: 'Read chapter 4 biology', meta: 'THIS WEEK', priority: 'med', done: true, postponeCount: 2, category: 'SCHOOL' },
            { id: 5, name: 'Reply to group chat project', meta: 'TODAY', priority: 'high', done: false, postponeCount: 4, category: 'WORK' },
            { id: 6, name: 'Submit math homework', meta: 'TOMORROW', priority: 'high', done: false, postponeCount: 0, category: 'SCHOOL' },
            { id: 7, name: 'Clean desk workspace', meta: 'THIS WEEK', priority: 'low', done: false, postponeCount: 2, category: 'PERSONAL' },
            { id: 8, name: 'Practice coding problems', meta: 'THIS WEEK', priority: 'med', done: false, postponeCount: 1, category: 'WORK' },
            { id: 9, name: 'Call mom', meta: 'TODAY', priority: 'med', done: false, postponeCount: 3, category: 'PERSONAL' },
        ]
    })

    const [xp, setXp] = useState<number>(() => parseInt(localStorage.getItem('rf_xp') || '180'))
    const [xpEvents, setXpEvents] = useState<XPEvent[]>([])
    const [showXpPop, setShowXpPop] = useState(false)
    const [lastXpGain, setLastXpGain] = useState(0)
    const [streak] = useState(5)
    const [time, setTime] = useState(new Date())
    const [listening, setListening] = useState(false)
    const [newTaskInput, setNewTaskInput] = useState('')
    const [showAddTask, setShowAddTask] = useState(false)

    // Mood state
    const [moodState, setMoodState] = useState<MoodState>(() => {
        try {
            const saved = localStorage.getItem('rf_mood')
            if (saved) {
                const parsed = JSON.parse(saved)
                // Only use if checked in today
                const today = new Date().toDateString()
                if (new Date(parsed.timestamp).toDateString() === today) return parsed
            }
        } catch { }
        return { mood: null, energy: null, note: '', timestamp: '' }
    })
    const [showMoodCheckIn, setShowMoodCheckIn] = useState(false)
    const [moodNote, setMoodNote] = useState('')
    const [selectedMood, setSelectedMood] = useState<MoodState['mood']>(null)
    const [selectedEnergy, setSelectedEnergy] = useState<MoodState['energy']>(null)
    const [moodAdvice, setMoodAdvice] = useState('')
    const [loadingMoodAdvice, setLoadingMoodAdvice] = useState(false)
    const [moodListening, setMoodListening] = useState(false)
    const moodRecognitionRef = useRef<any>(null)

    // Procrastination
    const [procrastTasks, setProcrastTasks] = useState<Task[]>([])
    const [procrastSuggestion, setProcrastSuggestion] = useState('')
    const [loadingProcrast, setLoadingProcrast] = useState(false)
    const [showProcrastBanner, setShowProcrastBanner] = useState(false)
    const [procrastDismissed, setProcrastDismissed] = useState<number[]>([])

    // Overwhelm
    const [showOverwhelmMode, setShowOverwhelmMode] = useState(false)
    const [top3Tasks, setTop3Tasks] = useState<Task[]>([])
    const [overwhelmDismissed, setOverwhelmDismissed] = useState(false)

    const [greeting, setGreeting] = useState('')

    // Mood-adjusted focus suggestion
    const getMoodAdjustedSuggestion = () => {
        if (!moodState.mood) return { duration: '25 MIN', seconds: 1500, label: 'Standard session' }
        const map = {
            great: { duration: '45 MIN', seconds: 2700, label: 'You\'re fired up — go for a long session' },
            good: { duration: '25 MIN', seconds: 1500, label: 'Good energy — standard Pomodoro' },
            tired: { duration: '15 MIN', seconds: 900, label: 'Low energy — short burst only' },
            stressed: { duration: '15 MIN', seconds: 900, label: 'Stressed — one small win first' },
            awful: { duration: '10 MIN', seconds: 600, label: 'Rough day — just 10 minutes, that\'s all' },
        }
        return map[moodState.mood]
    }

    const focusSuggestion = getMoodAdjustedSuggestion()

    // Level
    const getCurrentLevel = (totalXp: number) => {
        let current = LEVELS[0]
        for (const lvl of LEVELS) { if (totalXp >= lvl.xpRequired) current = lvl }
        return current
    }
    const getNextLevel = (totalXp: number) => {
        const idx = LEVELS.findIndex(l => l === getCurrentLevel(totalXp))
        return LEVELS[idx + 1] || null
    }
    const currentLevel = getCurrentLevel(xp)
    const nextLevel = getNextLevel(xp)
    const xpProgress = nextLevel
        ? ((xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
        : 100

    useEffect(() => { localStorage.setItem('rf_tasks', JSON.stringify(tasks)) }, [tasks])
    useEffect(() => { localStorage.setItem('rf_xp', String(xp)) }, [xp])
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        const pending = tasks.filter(t => !t.done)
        const hour = new Date().getHours()
        const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
        const high = pending.filter(t => t.priority === 'high')
        const moodPrefix = moodState.mood === 'tired' ? 'Energy is low today. ' :
            moodState.mood === 'stressed' ? 'Take a breath. ' :
                moodState.mood === 'great' ? 'Great energy today! ' : ''
        setGreeting(`${moodPrefix}Good ${tod}. You have ${pending.length} missions pending${high.length > 0 ? ` — ${high.length} high priority` : ''}. ${high[0] ? `Start with: ${high[0].name}.` : 'No urgent tasks right now.'}`)
    }, [moodState.mood])

    // Procrastination detector
    useEffect(() => {
        const flagged = tasks.filter(t => !t.done && t.postponeCount >= 3 && !procrastDismissed.includes(t.id))
        setProcrastTasks(flagged)
        if (flagged.length > 0) setShowProcrastBanner(true)
    }, [tasks, procrastDismissed])

    // Overwhelm detector
    useEffect(() => {
        const pending = tasks.filter(t => !t.done)
        if (pending.length >= 8 && !overwhelmDismissed) {
            const sorted = [...pending].sort((a, b) => {
                const order = { high: 0, med: 1, low: 2 }
                return order[a.priority] - order[b.priority]
            })
            setTop3Tasks(sorted.slice(0, 3))
        }
    }, [tasks, overwhelmDismissed])

    const pendingTasks = tasks.filter(t => !t.done)
    const showOverwhelmAlert = pendingTasks.length >= 8 && !overwhelmDismissed

    // XP
    const gainXP = (amount: number, label: string) => {
        setXp(prev => prev + amount)
        setLastXpGain(amount)
        setShowXpPop(true)
        setTimeout(() => setShowXpPop(false), 2000)
        setXpEvents(prev => [{ id: Date.now().toString(), label, xp: amount, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 5))
    }

    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => {
            if (t.id === id) {
                if (!t.done) gainXP(XP_REWARDS.taskComplete, `Task: +${XP_REWARDS.taskComplete} XP`)
                return { ...t, done: !t.done }
            }
            return t
        }))
    }

    const postponeTask = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, postponeCount: t.postponeCount + 1 } : t))
    }

    const addTask = () => {
        if (!newTaskInput.trim()) return
        setTasks([...tasks, { id: Date.now(), name: newTaskInput.trim(), meta: 'TODAY', priority: 'med', done: false, postponeCount: 0, category: 'PERSONAL' }])
        setNewTaskInput('')
        setShowAddTask(false)
    }

    const getProcrastSuggestion = async (task: Task) => {
        setLoadingProcrast(true)
        try {
            const reply = await callAI(`ROBOFOCUS for ADHD. Task "${task.name}" postponed ${task.postponeCount} times. User mood: ${moodState.mood || 'unknown'}. In 2 sentences, give ONE micro-action to start NOW. Be direct.`)
            setProcrastSuggestion(reply)
        } catch {
            setProcrastSuggestion(`You've postponed "${task.name}" ${task.postponeCount} times. Open it right now — just open it, nothing else.`)
        }
        setLoadingProcrast(false)
    }

    // ── MOOD CHECK-IN ────────────────────────────────────────
    const submitMoodCheckIn = async () => {
        if (!selectedMood || !selectedEnergy) return
        const newMood: MoodState = {
            mood: selectedMood,
            energy: selectedEnergy,
            note: moodNote,
            timestamp: new Date().toISOString(),
        }
        setMoodState(newMood)
        localStorage.setItem('rf_mood', JSON.stringify(newMood))
        gainXP(XP_REWARDS.moodCheckIn, `Mood check-in: +${XP_REWARDS.moodCheckIn} XP`)

        setLoadingMoodAdvice(true)
        try {
            const advice = await callAI(
                `You are ROBOFOCUS for ADHD. User mood: ${selectedMood}, energy: ${selectedEnergy}${moodNote ? `, they said: "${moodNote}"` : ''}. 
In 2-3 sentences, give specific actionable advice for their productivity session today. 
If tired/stressed: suggest shorter sessions, easier tasks first, self-compassion. 
If great/good: encourage ambitious work. Be warm and direct.`
            )
            setMoodAdvice(advice)
        } catch {
            const fallbacks = {
                great: "You're in peak state today. Tackle your hardest task first while the energy lasts. This is your window.",
                good: "Solid energy. Start with your top priority and build momentum from there. You've got this.",
                tired: "Low energy is real. Do one 15-minute task and give yourself permission to stop. Small wins still count.",
                stressed: "When stressed, start small. Pick the easiest task on your list. Completing it will calm the anxiety.",
                awful: "Rough days are valid. Set the bar low today — even 10 minutes of work counts as a win. Be kind to yourself.",
            }
            setMoodAdvice(fallbacks[selectedMood] || "Take it one step at a time today.")
        }
        setLoadingMoodAdvice(false)
        setShowMoodCheckIn(false)
    }

    // Voice mood detection
    const startMoodListening = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) return
        const r = new SR()
        r.continuous = false; r.interimResults = false; r.lang = 'en-US'
        r.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript.toLowerCase()
            setMoodNote(transcript)
            // Auto-detect mood from speech
            if (transcript.includes('tired') || transcript.includes('exhausted') || transcript.includes('sleepy')) setSelectedMood('tired')
            else if (transcript.includes('stress') || transcript.includes('anxious') || transcript.includes('worried')) setSelectedMood('stressed')
            else if (transcript.includes('great') || transcript.includes('amazing') || transcript.includes('awesome')) setSelectedMood('great')
            else if (transcript.includes('good') || transcript.includes('fine') || transcript.includes('okay')) setSelectedMood('good')
            else if (transcript.includes('bad') || transcript.includes('awful') || transcript.includes('terrible')) setSelectedMood('awful')
            // Auto-detect energy
            if (transcript.includes('no energy') || transcript.includes('low energy') || transcript.includes('drained')) setSelectedEnergy('low')
            else if (transcript.includes('lots of energy') || transcript.includes('energized') || transcript.includes('pumped')) setSelectedEnergy('high')
            else if (!selectedEnergy) setSelectedEnergy('medium')
        }
        r.onend = () => setMoodListening(false)
        r.start()
        moodRecognitionRef.current = r
        setMoodListening(true)
    }

    const focusSessions = JSON.parse(localStorage.getItem('robofocus_sessions') || '[]')
    const successSessions = focusSessions.filter((s: any) => s.status === 'SUCCESS').length

    const card = {
        background: 'rgba(4, 2, 16, 0.82)',
        border: '1px solid rgba(100, 50, 200, 0.2)',
        backdropFilter: 'blur(20px)',
    }

    const stats = [
        { label: 'PENDING', value: pendingTasks.length, color: '#c084fc' },
        { label: 'COMPLETED', value: tasks.filter(t => t.done).length, color: '#00cc60' },
        { label: 'FOCUS ✓', value: successSessions, color: '#00c8ff' },
        { label: 'STREAK', value: streak, color: '#ff3cac' },
    ]

    const displayTasks = showOverwhelmMode ? top3Tasks : tasks.filter(t => !t.done).slice(0, 6)

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: '#06020f' }}>
            <ProceduralGround />
            <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(4,1,12,0.65)', zIndex: 1 }} />

            {/* XP POP */}
            <AnimatePresence>
                {showXpPop && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed bottom-24 left-1/2 z-50 px-6 py-3 rounded-full font-orbitron text-sm tracking-widest"
                        style={{ background: 'rgba(120,50,240,0.25)', border: '1px solid rgba(160,80,255,0.6)', color: '#c084fc', boxShadow: '0 0 30px rgba(160,80,255,0.3)' }}>
                        ⚡ +{lastXpGain} XP
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MOOD CHECK-IN MODAL */}
            <AnimatePresence>
                {showMoodCheckIn && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center z-50"
                        style={{ background: 'rgba(2,0,10,0.85)', backdropFilter: 'blur(8px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="rounded-2xl p-8 w-full max-w-lg mx-4 relative"
                            style={{ background: 'rgba(6,2,20,0.97)', border: '1px solid rgba(140,60,240,0.3)', boxShadow: '0 0 60px rgba(120,50,220,0.2)' }}
                        >
                            <button onClick={() => setShowMoodCheckIn(false)}
                                className="absolute top-4 right-4 transition-colors"
                                style={{ color: 'rgba(160,130,220,0.4)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,180,255,0.7)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,130,220,0.4)' }}>
                                <X className="w-5 h-5" />
                            </button>

                            <div className="font-orbitron text-base font-black text-white mb-1">MOOD CHECK-IN</div>
                            <p className="font-mono text-xs mb-6" style={{ color: 'rgba(160,130,220,0.5)' }}>
                                Tell ROBOFOCUS how you feel — it adjusts your session plan
                            </p>

                            {/* Mood selection */}
                            <div className="mb-5">
                                <label className="font-mono text-xs tracking-widest block mb-3"
                                    style={{ color: 'rgba(140,100,220,0.5)' }}>HOW ARE YOU FEELING?</label>
                                <div className="flex gap-2 flex-wrap">
                                    {(Object.entries(MOOD_CONFIG) as [MoodState['mood'], typeof MOOD_CONFIG[keyof typeof MOOD_CONFIG]][]).map(([key, cfg]) => (
                                        <button key={key!} onClick={() => setSelectedMood(key)}
                                            className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all duration-200"
                                            style={{
                                                background: selectedMood === key ? `${cfg.color}18` : 'rgba(40,15,80,0.2)',
                                                border: selectedMood === key ? `1px solid ${cfg.color}55` : '1px solid rgba(60,25,130,0.2)',
                                                minWidth: '72px',
                                            }}>
                                            <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
                                            <span className="font-orbitron" style={{ color: selectedMood === key ? cfg.color : 'rgba(160,130,220,0.4)', fontSize: '8px' }}>
                                                {cfg.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Energy selection */}
                            <div className="mb-5">
                                <label className="font-mono text-xs tracking-widest block mb-3"
                                    style={{ color: 'rgba(140,100,220,0.5)' }}>ENERGY LEVEL?</label>
                                <div className="flex gap-2">
                                    {(Object.entries(ENERGY_CONFIG) as [MoodState['energy'], typeof ENERGY_CONFIG[keyof typeof ENERGY_CONFIG]][]).map(([key, cfg]) => (
                                        <button key={key!} onClick={() => setSelectedEnergy(key)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200"
                                            style={{
                                                background: selectedEnergy === key ? `${cfg.color}15` : 'rgba(40,15,80,0.2)',
                                                border: selectedEnergy === key ? `1px solid ${cfg.color}50` : '1px solid rgba(60,25,130,0.2)',
                                            }}>
                                            <span>{cfg.icon}</span>
                                            <span className="font-orbitron" style={{ color: selectedEnergy === key ? cfg.color : 'rgba(160,130,220,0.4)', fontSize: '8px' }}>
                                                {cfg.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Voice / text note */}
                            <div className="mb-6">
                                <label className="font-mono text-xs tracking-widest block mb-2"
                                    style={{ color: 'rgba(140,100,220,0.5)' }}>ANYTHING ELSE? (OPTIONAL)</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 font-mono text-sm px-4 py-2.5 rounded-xl focus:outline-none transition-all"
                                        style={{ background: 'rgba(40,15,80,0.2)', border: '1px solid rgba(80,40,160,0.22)', color: 'rgba(210,195,255,0.82)' }}
                                        placeholder="e.g. I feel tired because I slept late..."
                                        value={moodNote}
                                        onChange={e => setMoodNote(e.target.value)}
                                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160,80,255,0.5)' }}
                                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(80,40,160,0.22)' }}
                                    />
                                    <button
                                        onClick={moodListening ? () => { moodRecognitionRef.current?.stop(); setMoodListening(false) } : startMoodListening}
                                        className="px-3 py-2.5 rounded-xl transition-all"
                                        style={{
                                            background: moodListening ? 'rgba(120,50,240,0.25)' : 'rgba(60,20,120,0.15)',
                                            border: moodListening ? '1px solid rgba(168,85,247,0.7)' : '1px solid rgba(80,40,160,0.22)',
                                            color: moodListening ? '#c084fc' : 'rgba(120,80,200,0.5)',
                                        }}>
                                        {moodListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                    </button>
                                </div>
                                {moodListening && (
                                    <p className="font-mono text-xs mt-1.5" style={{ color: 'rgba(168,85,247,0.5)' }}>
                                        Listening... say how you feel
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={submitMoodCheckIn}
                                disabled={!selectedMood || !selectedEnergy}
                                className="w-full py-4 font-orbitron text-sm tracking-widest rounded-xl transition-all duration-300"
                                style={{
                                    background: selectedMood && selectedEnergy ? 'rgba(100,40,200,0.2)' : 'rgba(60,20,120,0.06)',
                                    border: '1px solid rgba(140,70,240,0.45)',
                                    color: selectedMood && selectedEnergy ? '#c084fc' : 'rgba(160,120,255,0.2)',
                                    cursor: selectedMood && selectedEnergy ? 'pointer' : 'not-allowed',
                                }}
                                onMouseEnter={e => { if (selectedMood && selectedEnergy) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                SUBMIT + GET AI ADVICE →
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative flex min-h-screen" style={{ zIndex: 2 }}>
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">

                    {/* TOPBAR */}
                    <div className="px-8 py-5 flex items-center justify-between sticky top-0"
                        style={{ borderBottom: '1px solid rgba(80,30,160,0.15)', background: 'rgba(4,1,12,0.85)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
                        <div>
                            <p className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '10px' }}>
                                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white mt-0.5">MISSION CONTROL</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Mood indicator in topbar */}
                            {moodState.mood && (
                                <button
                                    onClick={() => setShowMoodCheckIn(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                                    style={{
                                        background: `${MOOD_CONFIG[moodState.mood].color}10`,
                                        border: `1px solid ${MOOD_CONFIG[moodState.mood].color}30`,
                                    }}>
                                    <span style={{ fontSize: '14px' }}>{MOOD_CONFIG[moodState.mood].icon}</span>
                                    <span className="font-orbitron" style={{ color: MOOD_CONFIG[moodState.mood].color, fontSize: '8px' }}>
                                        {MOOD_CONFIG[moodState.mood].label}
                                    </span>
                                    {moodState.energy && (
                                        <span className="font-mono" style={{ color: ENERGY_CONFIG[moodState.energy].color, fontSize: '9px' }}>
                                            {ENERGY_CONFIG[moodState.energy].icon}
                                        </span>
                                    )}
                                </button>
                            )}

                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                                style={{ background: 'rgba(80,30,160,0.15)', border: '1px solid rgba(120,60,220,0.25)' }}>
                                <Trophy className="w-3.5 h-3.5" style={{ color: currentLevel.color }} />
                                <span className="font-orbitron" style={{ color: currentLevel.color, fontSize: '9px' }}>
                                    LV.{currentLevel.level} {currentLevel.name}
                                </span>
                                <span className="font-mono" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '9px' }}>{xp} XP</span>
                            </div>

                            <button className="relative p-2 rounded-lg transition-all"
                                style={{ background: 'rgba(60,20,120,0.15)', border: '1px solid rgba(100,50,200,0.2)', color: 'rgba(140,100,220,0.5)' }}>
                                <Bell className="w-4 h-4" />
                                {procrastTasks.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pink-500" />}
                            </button>

                            <button onClick={() => setListening(!listening)}
                                className="p-2 rounded-lg transition-all duration-300"
                                style={{
                                    background: listening ? 'rgba(120,50,240,0.25)' : 'rgba(60,20,120,0.12)',
                                    border: listening ? '1px solid rgba(168,85,247,0.7)' : '1px solid rgba(100,50,200,0.2)',
                                    color: listening ? '#c084fc' : 'rgba(120,80,200,0.4)',
                                }}>
                                <Mic className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="px-8 py-6 space-y-5 pb-24">

                        {/* ── MOOD CHECK-IN PROMPT (if not checked in today) ── */}
                        {!moodState.mood && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl p-5 cursor-pointer group"
                                style={{ ...card, borderLeft: '3px solid rgba(168,85,247,0.5)' }}
                                onClick={() => setShowMoodCheckIn(true)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'rgba(120,50,240,0.15)', border: '1px solid rgba(160,80,255,0.3)' }}>
                                            <Heart className="w-5 h-5" style={{ color: '#c084fc' }} />
                                        </div>
                                        <div>
                                            <div className="font-orbitron text-sm font-black text-white mb-0.5">HOW ARE YOU FEELING TODAY?</div>
                                            <p className="font-mono text-xs" style={{ color: 'rgba(160,130,220,0.5)' }}>
                                                Check in your mood — ROBOFOCUS adjusts your session plan accordingly · +{XP_REWARDS.moodCheckIn} XP
                                            </p>
                                        </div>
                                    </div>
                                    <div className="font-orbitron text-xs tracking-widest px-4 py-2 rounded-xl transition-all"
                                        style={{ background: 'rgba(100,40,200,0.12)', border: '1px solid rgba(140,70,240,0.35)', color: 'rgba(192,132,252,0.6)' }}>
                                        CHECK IN →
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── MOOD ADVICE CARD (after check-in) ── */}
                        <AnimatePresence>
                            {moodState.mood && moodAdvice && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="rounded-2xl p-5"
                                    style={{
                                        ...card,
                                        borderLeft: `3px solid ${MOOD_CONFIG[moodState.mood].color}60`,
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                            <span style={{ fontSize: '28px' }}>{MOOD_CONFIG[moodState.mood].icon}</span>
                                            <span className="font-orbitron" style={{ color: MOOD_CONFIG[moodState.mood].color, fontSize: '8px' }}>
                                                {MOOD_CONFIG[moodState.mood].label}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-orbitron tracking-widest mb-1.5"
                                                style={{ color: MOOD_CONFIG[moodState.mood].color, fontSize: '8px', opacity: 0.6 }}>
                                                ROBOFOCUS MOOD ANALYSIS
                                            </div>
                                            {loadingMoodAdvice ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
                                                        style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                                                    <span className="font-mono text-xs" style={{ color: 'rgba(160,130,220,0.5)' }}>Analysing your mood...</span>
                                                </div>
                                            ) : (
                                                <p className="font-mono text-sm leading-relaxed" style={{ color: 'rgba(200,185,255,0.72)' }}>
                                                    {moodAdvice}
                                                </p>
                                            )}
                                            {moodState.energy && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span style={{ color: ENERGY_CONFIG[moodState.energy].color, fontSize: '12px' }}>
                                                        {ENERGY_CONFIG[moodState.energy].icon}
                                                    </span>
                                                    <span className="font-mono text-xs"
                                                        style={{ color: ENERGY_CONFIG[moodState.energy].color, opacity: 0.6 }}>
                                                        {ENERGY_CONFIG[moodState.energy].label} · Suggested session: {focusSuggestion.duration}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setShowMoodCheckIn(true)}
                                            className="font-mono text-xs px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                                            style={{ border: '1px solid rgba(80,40,160,0.2)', color: 'rgba(160,130,220,0.4)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(160,80,255,0.35)' }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,130,220,0.4)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,40,160,0.2)' }}>
                                            UPDATE
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── OVERWHELM DETECTOR ── */}
                        <AnimatePresence>
                            {showOverwhelmAlert && (
                                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                    className="rounded-2xl p-5 relative"
                                    style={{ background: 'rgba(255,120,0,0.06)', border: '1px solid rgba(255,140,0,0.3)', backdropFilter: 'blur(20px)' }}>
                                    <button onClick={() => setOverwhelmDismissed(true)}
                                        className="absolute top-3 right-3"
                                        style={{ color: 'rgba(255,180,80,0.4)' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,180,80,0.8)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,180,80,0.4)' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.3)' }}>
                                            <AlertTriangle className="w-4 h-4" style={{ color: 'rgba(255,160,40,0.8)' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-orbitron text-xs tracking-widest mb-1"
                                                style={{ color: 'rgba(255,160,40,0.7)', fontSize: '9px' }}>
                                                OVERWHELM DETECTED — {pendingTasks.length} TASKS PENDING
                                            </div>
                                            <p className="font-mono text-sm mb-3" style={{ color: 'rgba(255,200,120,0.75)' }}>
                                                Too many open missions. ROBOFOCUS picked your top 3 for today.
                                            </p>
                                            <div className="space-y-1.5 mb-3">
                                                {top3Tasks.map((t, i) => (
                                                    <div key={t.id} className="flex items-center gap-2">
                                                        <span className="font-orbitron w-4 text-center" style={{ color: 'rgba(255,160,40,0.6)', fontSize: '9px' }}>{i + 1}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: priorityColor[t.priority] }} />
                                                        <span className="font-mono text-xs" style={{ color: 'rgba(255,220,160,0.7)' }}>{t.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => setShowOverwhelmMode(!showOverwhelmMode)}
                                                className="px-4 py-2 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.35)', color: 'rgba(255,180,80,0.8)' }}>
                                                {showOverwhelmMode ? 'SHOW ALL TASKS' : 'FOCUS: TOP 3 ONLY'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── PROCRASTINATION DETECTOR ── */}
                        <AnimatePresence>
                            {showProcrastBanner && procrastTasks.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                    className="rounded-2xl p-5 relative"
                                    style={{ background: 'rgba(255,60,172,0.05)', border: '1px solid rgba(255,60,172,0.28)', backdropFilter: 'blur(20px)' }}>
                                    <button onClick={() => setShowProcrastBanner(false)}
                                        className="absolute top-3 right-3"
                                        style={{ color: 'rgba(255,100,200,0.4)' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,200,0.8)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,200,0.4)' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'rgba(255,60,172,0.1)', border: '1px solid rgba(255,60,172,0.3)' }}>
                                            <Brain className="w-4 h-4" style={{ color: 'rgba(255,80,180,0.8)' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-orbitron text-xs tracking-widest mb-2"
                                                style={{ color: 'rgba(255,80,180,0.6)', fontSize: '9px' }}>PROCRASTINATION DETECTED</div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {procrastTasks.map(t => (
                                                    <button key={t.id} onClick={() => getProcrastSuggestion(t)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs transition-all"
                                                        style={{ background: 'rgba(255,60,172,0.08)', border: '1px solid rgba(255,60,172,0.25)', color: 'rgba(255,120,200,0.7)' }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,172,0.18)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff3cac' }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,172,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,120,200,0.7)' }}>
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {t.name} <span style={{ color: 'rgba(255,100,180,0.5)' }}>({t.postponeCount}x)</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {loadingProcrast && (
                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
                                                        style={{ borderColor: '#ff3cac', borderTopColor: 'transparent' }} />
                                                    <span className="font-mono text-xs" style={{ color: 'rgba(255,100,180,0.5)' }}>Analysing...</span>
                                                </div>
                                            )}
                                            {procrastSuggestion && !loadingProcrast && (
                                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                                    className="p-3 rounded-xl mb-3"
                                                    style={{ background: 'rgba(255,60,172,0.06)', border: '1px solid rgba(255,60,172,0.18)' }}>
                                                    <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(255,180,220,0.7)' }}>
                                                        {procrastSuggestion}
                                                    </p>
                                                </motion.div>
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={() => navigate('/mission')}
                                                    className="flex items-center gap-1.5 px-4 py-2 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                    style={{ background: 'rgba(255,60,172,0.1)', border: '1px solid rgba(255,60,172,0.3)', color: 'rgba(255,100,200,0.7)' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,172,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff3cac' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,172,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,200,0.7)' }}>
                                                    <Sparkles className="w-3 h-3" />
                                                    DECOMPOSE TASK
                                                </button>
                                                <button onClick={() => { setProcrastDismissed([...procrastDismissed, ...procrastTasks.map(t => t.id)]); setShowProcrastBanner(false) }}
                                                    className="px-4 py-2 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}>
                                                    DISMISS
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── AI BRIEFING ── */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                            className="rounded-2xl p-5"
                            style={{ ...card, borderLeft: '3px solid rgba(120,50,220,0.6)' }}>
                            <div className="font-orbitron tracking-widest mb-2" style={{ color: 'rgba(140,90,220,0.5)', fontSize: '8px' }}>
                                ROBOFOCUS BRIEFING
                            </div>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(80,30,160,0.2)', border: '1px solid rgba(120,60,220,0.3)' }}>
                                    <Brain className="w-4 h-4" style={{ color: 'rgba(160,100,255,0.7)' }} />
                                </div>
                                <p className="font-mono text-sm leading-relaxed" style={{ color: 'rgba(200,185,255,0.65)' }}>
                                    {greeting}
                                </p>
                            </div>
                        </motion.div>

                        {/* ── STATS ── */}
                        <div className="grid grid-cols-4 gap-4">
                            {stats.map((s, i) => (
                                <motion.div key={s.label}
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
                                    className="rounded-2xl p-4 text-center" style={card}>
                                    <div className="font-orbitron text-2xl font-black mb-1"
                                        style={{ color: s.color, textShadow: `0 0 20px ${s.color}60` }}>{s.value}</div>
                                    <div className="font-mono tracking-widest" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>{s.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ── MAIN GRID ── */}
                        <div className="grid grid-cols-3 gap-5">

                            {/* TASKS */}
                            <div className="col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-orbitron tracking-widest" style={{ color: 'rgba(140,100,220,0.45)', fontSize: '9px' }}>
                                            {showOverwhelmMode ? '⚡ TOP 3 FOCUS' : `TODAY'S MISSIONS (${displayTasks.length})`}
                                        </span>
                                        {showOverwhelmMode && (
                                            <button onClick={() => setShowOverwhelmMode(false)}
                                                className="font-mono text-xs transition-colors"
                                                style={{ color: 'rgba(255,140,0,0.5)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,180,80,0.8)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,140,0,0.5)' }}>
                                                SHOW ALL
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => setShowAddTask(!showAddTask)}
                                        className="flex items-center gap-1.5 font-mono text-xs tracking-widest px-3 py-1.5 rounded-lg transition-all"
                                        style={{ border: '1px solid rgba(120,60,220,0.3)', color: 'rgba(160,100,255,0.6)' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.15)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                                        <Plus className="w-3 h-3" />
                                        ADD TASK
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showAddTask && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="flex gap-2 p-4 rounded-2xl" style={card}>
                                                <input
                                                    className="flex-1 font-mono text-sm px-3 py-2 rounded-xl focus:outline-none transition-all"
                                                    style={{ background: 'rgba(60,20,120,0.15)', border: '1px solid rgba(100,50,200,0.22)', color: 'rgba(210,195,255,0.82)' }}
                                                    placeholder="New mission..."
                                                    value={newTaskInput}
                                                    onChange={e => setNewTaskInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addTask()}
                                                    onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160,80,255,0.5)' }}
                                                    onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(100,50,200,0.22)' }}
                                                    autoFocus
                                                />
                                                <button onClick={addTask}
                                                    className="px-4 py-2 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                    style={{ background: 'rgba(100,40,200,0.2)', border: '1px solid rgba(140,70,240,0.4)', color: '#c084fc' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                    ADD →
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="rounded-2xl overflow-hidden" style={card}>
                                    <div className="divide-y" style={{ borderColor: 'rgba(60,20,120,0.15)' }}>
                                        {displayTasks.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <div className="font-mono text-sm" style={{ color: 'rgba(160,130,220,0.3)' }}>
                                                    All missions complete 🎉
                                                </div>
                                            </div>
                                        ) : displayTasks.map(task => (
                                            <motion.div key={task.id} layout
                                                className="flex items-center gap-3 p-4 transition-all group"
                                                style={{ background: task.done ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                <div className="w-1 h-10 rounded-full flex-shrink-0"
                                                    style={{ background: task.done ? 'rgba(120,80,200,0.15)' : priorityColor[task.priority] }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-mono text-sm"
                                                        style={{ color: task.done ? 'rgba(160,140,200,0.3)' : 'rgba(210,195,255,0.82)', textDecoration: task.done ? 'line-through' : 'none' }}>
                                                        {task.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono" style={{ color: 'rgba(120,90,180,0.4)', fontSize: '10px' }}>{task.meta}</span>
                                                        {task.postponeCount >= 3 && !task.done && (
                                                            <span className="flex items-center gap-1 font-mono px-1.5 py-0.5 rounded"
                                                                style={{ background: 'rgba(255,60,172,0.08)', color: 'rgba(255,80,180,0.6)', fontSize: '9px' }}>
                                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                                {task.postponeCount}x
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!task.done && (
                                                        <button onClick={() => postponeTask(task.id)}
                                                            className="font-mono text-xs px-2 py-1 rounded-lg transition-all"
                                                            style={{ color: 'rgba(160,120,255,0.3)', border: '1px solid rgba(80,40,160,0.15)' }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,140,0,0.6)' }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,120,255,0.3)' }}
                                                            title="Postpone">⏸</button>
                                                    )}
                                                    {!task.done && (
                                                        <button onClick={() => navigate('/focus')}
                                                            className="font-mono text-xs px-2 py-1 rounded-lg transition-all"
                                                            style={{ color: 'rgba(160,120,255,0.3)', border: '1px solid rgba(80,40,160,0.15)' }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,120,255,0.3)' }}
                                                            title="Focus">▶</button>
                                                    )}
                                                </div>
                                                <button onClick={() => toggleTask(task.id)} className="flex-shrink-0 transition-colors">
                                                    {task.done
                                                        ? <CheckCircle2 className="w-5 h-5" style={{ color: '#00cc60' }} />
                                                        : <Circle className="w-5 h-5" style={{ color: 'rgba(120,80,200,0.25)' }} />
                                                    }
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-4">

                                {/* XP CARD */}
                                <div className="rounded-2xl p-5" style={{ ...card, borderTop: `2px solid ${currentLevel.color}40` }}>
                                    <div className="font-orbitron tracking-widest mb-3"
                                        style={{ color: 'rgba(140,100,220,0.45)', fontSize: '9px' }}>ROBOFOCUS LEVEL</div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="font-orbitron text-2xl font-black"
                                                style={{ color: currentLevel.color, textShadow: `0 0 20px ${currentLevel.color}60` }}>
                                                LV.{currentLevel.level}
                                            </div>
                                            <div className="font-orbitron tracking-widest"
                                                style={{ color: 'rgba(160,120,255,0.5)', fontSize: '9px' }}>{currentLevel.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-orbitron text-lg font-black" style={{ color: '#c084fc' }}>{xp}</div>
                                            <div className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>TOTAL XP</div>
                                        </div>
                                    </div>
                                    {nextLevel && (
                                        <div className="mb-3">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>
                                                    {xp - currentLevel.xpRequired} / {nextLevel.xpRequired - currentLevel.xpRequired} XP
                                                </span>
                                                <span className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>
                                                    → LV.{nextLevel.level}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(80,40,160,0.2)' }}>
                                                <motion.div className="h-full rounded-full"
                                                    style={{ background: `linear-gradient(90deg, ${currentLevel.color}, #c084fc)` }}
                                                    animate={{ width: `${xpProgress}%` }}
                                                    transition={{ duration: 0.8 }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1 pt-2" style={{ borderTop: '1px solid rgba(80,40,160,0.15)' }}>
                                        {[
                                            { action: 'Complete task', xp: XP_REWARDS.taskComplete },
                                            { action: 'Focus session', xp: XP_REWARDS.focusSession },
                                            { action: 'Mood check-in', xp: XP_REWARDS.moodCheckIn },
                                        ].map(r => (
                                            <div key={r.action} className="flex justify-between">
                                                <span className="font-mono" style={{ color: 'rgba(160,130,220,0.35)', fontSize: '9px' }}>{r.action}</span>
                                                <span className="font-orbitron" style={{ color: 'rgba(160,120,255,0.5)', fontSize: '9px' }}>+{r.xp} XP</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* MOOD-ADJUSTED FOCUS CTA */}
                                <div className="rounded-2xl p-5" style={card}>
                                    <span className="font-orbitron tracking-widest block mb-1"
                                        style={{ color: 'rgba(120,80,200,0.4)', fontSize: '9px' }}>
                                        {moodState.mood ? 'MOOD-ADJUSTED SESSION' : 'NEXT FOCUS SESSION'}
                                    </span>
                                    {moodState.mood && (
                                        <div className="font-mono text-xs mb-2" style={{ color: 'rgba(160,130,220,0.5)' }}>
                                            {focusSuggestion.label}
                                        </div>
                                    )}
                                    <div className="font-mono text-sm mb-1" style={{ color: 'rgba(200,185,255,0.7)' }}>
                                        {pendingTasks[0]?.name || 'All done!'}
                                    </div>
                                    <div className="font-orbitron text-xl font-black mb-3"
                                        style={{ color: '#c084fc', textShadow: '0 0 20px rgba(192,132,252,0.4)' }}>
                                        {focusSuggestion.duration}
                                    </div>
                                    <button
                                        onClick={() => { gainXP(XP_REWARDS.focusSession, `Focus: +${XP_REWARDS.focusSession} XP`); navigate('/focus') }}
                                        className="w-full py-3 font-orbitron text-xs tracking-widest rounded-xl transition-all duration-300"
                                        style={{ background: 'rgba(100,40,200,0.15)', border: '1px solid rgba(130,60,240,0.4)', color: '#c084fc' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                        START → +{XP_REWARDS.focusSession} XP
                                    </button>
                                </div>

                                {/* NUDGE */}
                                <div className="rounded-2xl p-5" style={{ ...card, borderLeft: '2px solid rgba(255,60,172,0.4)' }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-3 h-3" style={{ color: 'rgba(255,60,172,0.6)' }} />
                                        <span className="font-orbitron tracking-widest" style={{ color: 'rgba(255,60,172,0.5)', fontSize: '8px' }}>
                                            ROBOFOCUS NUDGE
                                        </span>
                                    </div>
                                    <p className="font-mono text-xs leading-relaxed mb-3" style={{ color: 'rgba(200,180,255,0.5)' }}>
                                        {procrastTasks.length > 0
                                            ? `"${procrastTasks[0].name}" postponed ${procrastTasks[0].postponeCount} times. Break it into pieces?`
                                            : moodState.mood === 'tired' ? "Low energy? Do the easiest task first for a quick win."
                                                : moodState.mood === 'stressed' ? "Feeling overwhelmed? One task at a time. Just one."
                                                    : pendingTasks[0] ? `"${pendingTasks[0].name}" is your highest priority.`
                                                        : 'All caught up! Keep the streak alive.'}
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => navigate(procrastTasks.length > 0 ? '/mission' : '/focus')}
                                            className="flex-1 py-2 font-mono text-xs tracking-widest rounded-xl transition-all"
                                            style={{ background: 'rgba(200,30,100,0.1)', border: '1px solid rgba(255,60,172,0.25)', color: 'rgba(255,100,180,0.7)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,30,100,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff3cac' }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,30,100,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,180,0.7)' }}>
                                            {procrastTasks.length > 0 ? 'DECOMPOSE →' : 'START NOW'}
                                        </button>
                                        <button className="flex-1 py-2 font-mono text-xs tracking-widest rounded-xl transition-all"
                                            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(180,160,220,0.3)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,160,220,0.6)' }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,160,220,0.3)' }}>
                                            SNOOZE
                                        </button>
                                    </div>
                                </div>

                                {/* Quick nav */}
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'BRAIN DUMP', path: '/braindump', icon: '🧠' },
                                        { label: 'MISSION', path: '/mission', icon: '🚀' },
                                        { label: 'MEMORY', path: '/memory', icon: '💾' },
                                        { label: 'INSIGHTS', path: '/insights', icon: '📊' },
                                    ].map(item => (
                                        <button key={item.path} onClick={() => navigate(item.path)}
                                            className="py-2.5 rounded-xl font-mono text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                                            style={{ background: 'rgba(40,15,80,0.15)', border: '1px solid rgba(80,40,160,0.15)', color: 'rgba(140,100,220,0.4)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80,40,160,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(140,70,240,0.3)' }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(40,15,80,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(140,100,220,0.4)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,40,160,0.15)' }}>
                                            <span>{item.icon}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FLOATING MIC */}
                <button onClick={() => setListening(!listening)}
                    className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                        zIndex: 50,
                        background: listening ? 'rgba(120,50,240,0.35)' : 'rgba(60,20,120,0.2)',
                        border: listening ? '1px solid rgba(168,85,247,0.7)' : '1px solid rgba(100,50,200,0.3)',
                        boxShadow: listening ? '0 0 30px rgba(168,85,247,0.4)' : '0 0 15px rgba(100,50,200,0.1)',
                    }}>
                    <Mic className="w-5 h-5" style={{ color: listening ? '#c084fc' : 'rgba(140,90,220,0.5)' }} />
                </button>
            </div>
        </div>
    )
}