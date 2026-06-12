import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/ui/Sidebar'
import FlowFieldBackground from '../components/ui/FlowFieldBackground'
import {
    Rocket, Sparkles, ChevronDown, ChevronUp,
    Play, CheckCircle, Clock, Zap,
    Plus, RotateCcw,
} from 'lucide-react'

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY

interface MicroStep {
    id: string
    title: string
    duration: number
    done: boolean
    tip: string
}

interface MissionDay {
    day: number
    label: string
    theme: string
    steps: MicroStep[]
}

interface Mission {
    title: string
    overview: string
    totalDays: number
    dailyMinutes: number
    days: MissionDay[]
    generatedAt: string
}

const callAI = async (prompt: string): Promise<string> => {
    if (!OPENROUTER_KEY) throw new Error('No API key')
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
            max_tokens: 2000,
            temperature: 0.7,
        })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

const quickDecompose = (task: string): MicroStep[] => {
    const lower = task.toLowerCase()
    const steps: { title: string; duration: number; tip: string }[] = []
    if (lower.includes('essay') || lower.includes('report') || lower.includes('write')) {
        steps.push(
            { title: 'Research and gather sources', duration: 20, tip: 'Use 3 reliable sources minimum' },
            { title: 'Create an outline', duration: 10, tip: 'Just bullet points, no full sentences yet' },
            { title: 'Write the introduction', duration: 15, tip: 'Hook + thesis, 2-3 sentences' },
            { title: 'Write the main body', duration: 30, tip: 'One paragraph per main point' },
            { title: 'Write the conclusion', duration: 10, tip: 'Restate thesis + key takeaways' },
            { title: 'Review and edit', duration: 15, tip: 'Read aloud to catch errors' },
        )
    } else if (lower.includes('study') || lower.includes('exam') || lower.includes('test')) {
        steps.push(
            { title: 'Review notes and identify gaps', duration: 15, tip: 'Mark anything confusing' },
            { title: 'Summarize key concepts', duration: 20, tip: 'Use your own words' },
            { title: 'Create practice questions', duration: 15, tip: 'At least 5 questions per topic' },
            { title: 'Active recall session', duration: 25, tip: 'Cover notes and test yourself' },
            { title: 'Review mistakes', duration: 10, tip: 'Focus only on wrong answers' },
        )
    } else if (lower.includes('present') || lower.includes('slide')) {
        steps.push(
            { title: 'Define your main message', duration: 10, tip: 'One sentence: what should audience remember?' },
            { title: 'Create slide outline', duration: 15, tip: 'Max 7 slides for a 5-min presentation' },
            { title: 'Build slides content', duration: 30, tip: 'One idea per slide, minimal text' },
            { title: 'Add visuals and design', duration: 20, tip: 'Consistent colors, readable fonts' },
            { title: 'Practice out loud', duration: 15, tip: 'Time yourself, aim for natural flow' },
        )
    } else {
        steps.push(
            { title: `Clarify the goal for: ${task}`, duration: 5, tip: 'Write exactly what done looks like' },
            { title: 'Gather what you need', duration: 10, tip: 'Materials, info, tools' },
            { title: 'Do the first 25% of the work', duration: 20, tip: 'Just start, worry about quality later' },
            { title: 'Complete the main work', duration: 25, tip: 'Stay in the flow' },
            { title: 'Review and wrap up', duration: 10, tip: 'Is it actually done?' },
        )
    }
    return steps.map((s, i) => ({ id: `step-${i}`, ...s, done: false }))
}

export default function MissionPlannerPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'decompose' | 'mission'>('decompose')

    // Decomposer
    const [taskInput, setTaskInput] = useState('')
    const [decomposing, setDecomposing] = useState(false)
    const [steps, setSteps] = useState<MicroStep[]>([])
    const [expandedStep, setExpandedStep] = useState<string | null>(null)

    // Mission Planner
    const [missionInput, setMissionInput] = useState('')
    const [timeframe, setTimeframe] = useState('2 weeks')
    const [dailyTime, setDailyTime] = useState('45')
    const [planning, setPlanning] = useState(false)
    const [mission, setMission] = useState<Mission | null>(null)
    const [expandedDay, setExpandedDay] = useState<number | null>(0)

    const decompose = async () => {
        if (!taskInput.trim()) return
        setDecomposing(true)
        setSteps([])
        try {
            const raw = await callAI(
                `You are ROBOFOCUS, an AI for ADHD focus. Break this task into micro-steps: "${taskInput}"
Return ONLY a valid JSON array. No markdown, no explanation. Each object:
{"id":"step-N","title":"specific action","duration":5-30,"tip":"one short ADHD-friendly tip","done":false}
Rules: 4-7 steps max, each under 30 minutes, start with easiest first, be very specific.`
            )
            const clean = raw.replace(/```json|```/g, '').trim()
            setSteps(JSON.parse(clean))
        } catch {
            setSteps(quickDecompose(taskInput))
        }
        setDecomposing(false)
    }

    const planMission = async () => {
        if (!missionInput.trim()) return
        setPlanning(true)
        setMission(null)
        try {
            const raw = await callAI(
                `You are ROBOFOCUS, an AI mission planner for ADHD. Create a study/work plan.
Goal: "${missionInput}"
Timeframe: ${timeframe}
Daily available time: ${dailyTime} minutes
Return ONLY valid JSON, no markdown:
{"title":"Mission name (max 6 words)","overview":"2-sentence motivating description","totalDays":number,"dailyMinutes":number,"days":[{"day":1,"label":"Day 1","theme":"Today's focus theme","steps":[{"id":"d1s1","title":"Specific task","duration":20,"tip":"ADHD tip","done":false}]}]}
Rules: max 14 days, each day 2-4 steps fitting dailyMinutes, progress logically, last day is review.`
            )
            const clean = raw.replace(/```json|```/g, '').trim()
            const parsed = JSON.parse(clean)
            setMission({ ...parsed, generatedAt: new Date().toISOString() })
            setExpandedDay(0)
        } catch {
            const days = timeframe.includes('week') ? (parseInt(timeframe) || 2) * 7 : parseInt(timeframe) || 14
            setMission({
                title: missionInput.slice(0, 40),
                overview: `A structured plan to tackle "${missionInput}" with daily focus sessions.`,
                totalDays: Math.min(days, 14),
                dailyMinutes: parseInt(dailyTime),
                generatedAt: new Date().toISOString(),
                days: Array.from({ length: Math.min(days, 14) }, (_, i) => ({
                    day: i + 1, label: `Day ${i + 1}`,
                    theme: i === 0 ? 'Foundation' : i === Math.min(days, 14) - 1 ? 'Final Review' : `Progress Phase ${Math.ceil(i / 3)}`,
                    steps: [
                        { id: `d${i}s1`, title: i === 0 ? 'Set up your workspace and review goal' : `Continue work on ${missionInput}`, duration: Math.floor(parseInt(dailyTime) * 0.5), tip: 'Start with the easiest part', done: false },
                        { id: `d${i}s2`, title: i === Math.min(days, 14) - 1 ? 'Final review and celebrate' : 'Deep work session', duration: Math.floor(parseInt(dailyTime) * 0.4), tip: 'Use Pomodoro if you lose focus', done: false },
                    ]
                }))
            })
            setExpandedDay(0)
        }
        setPlanning(false)
    }

    const toggleStepDone = (id: string) => setSteps(steps.map(s => s.id === id ? { ...s, done: !s.done } : s))

    const toggleMissionStepDone = (dayIdx: number, stepId: string) => {
        if (!mission) return
        const updated = { ...mission }
        updated.days[dayIdx].steps = updated.days[dayIdx].steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s)
        setMission(updated)
    }

    const completedSteps = steps.filter(s => s.done).length
    const totalTime = steps.reduce((acc, s) => acc + s.duration, 0)

    const card = {
        background: 'rgba(4, 2, 16, 0.82)',
        border: '1px solid rgba(120, 60, 220, 0.22)',
        backdropFilter: 'blur(24px)',
    }

    const tabStyle = (active: boolean) => ({
        background: active ? 'rgba(120,50,240,0.2)' : 'rgba(255,255,255,0.03)',
        border: active ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#c084fc' : 'rgba(255,255,255,0.3)',
    })

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: '#030010' }}>

            {/* Flow field background */}
            <div className="fixed inset-0" style={{ zIndex: 0 }}>
                <FlowFieldBackground
                    color="#7c3aed"
                    trailOpacity={0.12}
                    particleCount={500}
                    speed={0.8}
                />
            </div>

            {/* Dark overlay */}
            <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(2,0,10,0.55)', zIndex: 1 }} />

            <div className="relative flex min-h-screen" style={{ zIndex: 2 }}>
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen">

                    {/* TOPBAR */}
                    <div className="px-8 py-5 flex items-center justify-between"
                        style={{ borderBottom: '1px solid rgba(100,40,200,0.15)' }}>
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">MISSION PLANNER</h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(160,120,255,0.35)', fontSize: '11px' }}>
                                AI breaks down your goals into steps you can actually start
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('decompose')}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-200"
                                style={tabStyle(activeTab === 'decompose')}>
                                <Sparkles className="w-3.5 h-3.5" />
                                TASK DECOMPOSER
                            </button>
                            <button onClick={() => setActiveTab('mission')}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-200"
                                style={tabStyle(activeTab === 'mission')}>
                                <Rocket className="w-3.5 h-3.5" />
                                MISSION PLANNER
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 px-8 py-6">
                        <AnimatePresence mode="wait">

                            {/* ── TASK DECOMPOSER ── */}
                            {activeTab === 'decompose' && (
                                <motion.div key="decompose"
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                                    className="max-w-3xl mx-auto space-y-5"
                                >
                                    {/* Header card */}
                                    <div className="rounded-2xl p-5" style={card}>
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'rgba(120,50,240,0.18)', border: '1px solid rgba(160,80,255,0.3)' }}>
                                                <Sparkles className="w-5 h-5" style={{ color: '#c084fc' }} />
                                            </div>
                                            <div>
                                                <div className="font-orbitron text-sm font-black text-white mb-1">AI TASK DECOMPOSER</div>
                                                <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180,155,255,0.55)' }}>
                                                    Got a big scary task you keep avoiding? Paste it here. The AI breaks it into micro-steps you can start in the next 5 minutes.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Input */}
                                    <div className="rounded-2xl p-6 space-y-4" style={card}>
                                        <label className="font-mono text-xs tracking-widest block"
                                            style={{ color: 'rgba(140,100,220,0.5)' }}>WHAT TASK ARE YOU AVOIDING?</label>
                                        <textarea
                                            className="w-full font-mono text-sm px-4 py-3 rounded-xl focus:outline-none transition-all resize-none leading-relaxed"
                                            style={{ background: 'rgba(60,20,120,0.12)', border: '1px solid rgba(100,50,200,0.22)', color: 'rgba(210,195,255,0.82)', minHeight: '80px' }}
                                            placeholder='"Write my chemistry lab report" or "Prepare for biology exam next week"'
                                            value={taskInput}
                                            onChange={e => setTaskInput(e.target.value)}
                                            onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(160,80,255,0.5)' }}
                                            onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(100,50,200,0.22)' }}
                                        />
                                        <div className="flex gap-3">
                                            <button onClick={decompose}
                                                disabled={decomposing || !taskInput.trim()}
                                                className="flex-1 py-3 font-orbitron text-xs tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                                                style={{
                                                    background: !taskInput.trim() ? 'rgba(60,20,120,0.06)' : 'rgba(100,40,200,0.2)',
                                                    border: '1px solid rgba(140,70,240,0.45)',
                                                    color: !taskInput.trim() ? 'rgba(160,120,255,0.2)' : '#c084fc',
                                                    cursor: !taskInput.trim() ? 'not-allowed' : 'pointer',
                                                }}
                                                onMouseEnter={e => { if (taskInput.trim()) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                <Sparkles className="w-4 h-4" />
                                                {decomposing ? 'BREAKING IT DOWN...' : 'DECOMPOSE WITH AI →'}
                                            </button>
                                            {steps.length > 0 && (
                                                <button onClick={() => { setSteps([]); setTaskInput('') }}
                                                    className="px-4 py-3 rounded-xl transition-all"
                                                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}>
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Loading */}
                                    {decomposing && (
                                        <div className="flex flex-col items-center gap-3 py-8">
                                            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                                                style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                                            <p className="font-mono tracking-widest" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '11px' }}>
                                                ANALYSING YOUR TASK...
                                            </p>
                                        </div>
                                    )}

                                    {/* Steps */}
                                    {steps.length > 0 && !decomposing && (
                                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

                                            {/* Summary */}
                                            <div className="flex items-center p-4 rounded-2xl gap-6"
                                                style={{ background: 'rgba(120,50,240,0.1)', border: '1px solid rgba(160,80,255,0.2)' }}>
                                                {[
                                                    { label: 'STEPS', value: steps.length },
                                                    { label: 'MINUTES', value: totalTime },
                                                    { label: 'DONE', value: `${completedSteps}/${steps.length}`, color: completedSteps === steps.length ? '#00cc60' : '#c084fc' },
                                                ].map(s => (
                                                    <div key={s.label} className="text-center">
                                                        <div className="font-orbitron text-xl font-black" style={{ color: (s as any).color || '#c084fc' }}>
                                                            {s.value}
                                                        </div>
                                                        <div className="font-mono" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '9px' }}>{s.label}</div>
                                                    </div>
                                                ))}
                                                <div className="flex-1 mx-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(80,40,160,0.2)' }}>
                                                    <motion.div className="h-full rounded-full"
                                                        style={{ background: 'linear-gradient(90deg, #7c3aed, #c084fc)' }}
                                                        animate={{ width: `${(completedSteps / steps.length) * 100}%` }}
                                                        transition={{ duration: 0.5 }} />
                                                </div>
                                                {completedSteps === steps.length && (
                                                    <div className="font-orbitron text-xs tracking-widest" style={{ color: '#00cc60' }}>✓ ALL DONE!</div>
                                                )}
                                            </div>

                                            {/* Step cards */}
                                            <AnimatePresence>
                                                {steps.map((step, i) => (
                                                    <motion.div key={step.id}
                                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.25, delay: i * 0.07 }}
                                                        className="rounded-2xl overflow-hidden"
                                                        style={{
                                                            ...card,
                                                            borderLeft: `3px solid ${step.done ? '#00cc60' : i === completedSteps ? '#c084fc' : 'rgba(100,50,200,0.3)'}`,
                                                            opacity: step.done ? 0.65 : 1,
                                                        }}>
                                                        <div className="flex items-center gap-4 p-4 cursor-pointer"
                                                            onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); toggleStepDone(step.id) }}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                                                                style={{
                                                                    background: step.done ? 'rgba(0,200,80,0.15)' : i === completedSteps ? 'rgba(120,50,240,0.2)' : 'rgba(60,20,120,0.2)',
                                                                    border: step.done ? '2px solid rgba(0,200,80,0.5)' : i === completedSteps ? '2px solid rgba(160,80,255,0.6)' : '2px solid rgba(80,40,160,0.25)',
                                                                }}>
                                                                {step.done
                                                                    ? <CheckCircle className="w-4 h-4" style={{ color: '#00cc60' }} />
                                                                    : <span className="font-orbitron" style={{ color: i === completedSteps ? '#c084fc' : 'rgba(140,100,220,0.4)', fontSize: '11px' }}>{i + 1}</span>
                                                                }
                                                            </button>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-mono text-sm"
                                                                    style={{ color: step.done ? 'rgba(160,140,220,0.4)' : 'rgba(210,195,255,0.85)', textDecoration: step.done ? 'line-through' : 'none' }}>
                                                                    {step.title}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                                                                    style={{ background: 'rgba(60,20,120,0.2)', border: '1px solid rgba(80,40,160,0.2)' }}>
                                                                    <Clock className="w-3 h-3" style={{ color: 'rgba(140,100,220,0.5)' }} />
                                                                    <span className="font-mono" style={{ color: 'rgba(160,120,255,0.6)', fontSize: '10px' }}>{step.duration}m</span>
                                                                </div>

                                                                {!step.done && i === completedSteps && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); navigate('/focus') }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                                                                        style={{ background: 'rgba(120,50,240,0.15)', border: '1px solid rgba(160,80,255,0.4)', color: '#c084fc' }}
                                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                                        <Play className="w-3 h-3" /> START
                                                                    </button>
                                                                )}

                                                                <div style={{ color: 'rgba(140,100,220,0.3)' }}>
                                                                    {expandedStep === step.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {expandedStep === step.id && (
                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                                                    <div className="px-6 pb-4 flex items-start gap-3"
                                                                        style={{ borderTop: '1px solid rgba(80,40,160,0.12)' }}>
                                                                        <Zap className="w-3.5 h-3.5 mt-3 flex-shrink-0" style={{ color: 'rgba(200,160,255,0.4)' }} />
                                                                        <p className="font-mono text-xs leading-relaxed pt-3" style={{ color: 'rgba(180,155,255,0.5)' }}>
                                                                            <span style={{ color: 'rgba(160,120,255,0.6)' }}>TIP: </span>{step.tip}
                                                                        </p>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── MISSION PLANNER ── */}
                            {activeTab === 'mission' && (
                                <motion.div key="mission"
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                                    className="max-w-4xl mx-auto space-y-5"
                                >
                                    {!mission ? (
                                        <>
                                            {/* Header card */}
                                            <div className="rounded-2xl p-5" style={card}>
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                        style={{ background: 'rgba(120,50,240,0.18)', border: '1px solid rgba(160,80,255,0.3)' }}>
                                                        <Rocket className="w-5 h-5" style={{ color: '#c084fc' }} />
                                                    </div>
                                                    <div>
                                                        <div className="font-orbitron text-sm font-black text-white mb-1">AI MISSION PLANNER</div>
                                                        <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180,155,255,0.55)' }}>
                                                            Tell the AI your goal and timeframe. It creates a complete day-by-day action plan with daily focus sessions.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mission input */}
                                            <div className="rounded-2xl p-6 space-y-5" style={card}>
                                                <div>
                                                    <label className="font-mono text-xs tracking-widest block mb-2"
                                                        style={{ color: 'rgba(140,100,220,0.5)' }}>WHAT IS YOUR GOAL OR MISSION?</label>
                                                    <textarea
                                                        className="w-full font-mono text-sm px-4 py-3 rounded-xl focus:outline-none transition-all resize-none leading-relaxed"
                                                        style={{ background: 'rgba(60,20,120,0.12)', border: '1px solid rgba(100,50,200,0.22)', color: 'rgba(210,195,255,0.82)', minHeight: '80px' }}
                                                        placeholder='"Prepare for my biology exam in 2 weeks" or "Build a habit of exercising daily"'
                                                        value={missionInput}
                                                        onChange={e => setMissionInput(e.target.value)}
                                                        onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(160,80,255,0.5)' }}
                                                        onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(100,50,200,0.22)' }}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="font-mono text-xs tracking-widest block mb-2"
                                                            style={{ color: 'rgba(140,100,220,0.5)' }}>TIMEFRAME</label>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {['1 week', '2 weeks', '1 month', '3 months'].map(t => (
                                                                <button key={t} onClick={() => setTimeframe(t)}
                                                                    className="px-3 py-2 rounded-xl font-mono text-xs tracking-widest transition-all"
                                                                    style={{
                                                                        background: timeframe === t ? 'rgba(120,50,240,0.2)' : 'rgba(40,15,80,0.2)',
                                                                        border: timeframe === t ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(60,25,130,0.2)',
                                                                        color: timeframe === t ? '#c084fc' : 'rgba(140,100,220,0.4)',
                                                                    }}>
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="font-mono text-xs tracking-widest block mb-2"
                                                            style={{ color: 'rgba(140,100,220,0.5)' }}>DAILY TIME AVAILABLE</label>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {['15', '30', '45', '60', '90'].map(t => (
                                                                <button key={t} onClick={() => setDailyTime(t)}
                                                                    className="px-3 py-2 rounded-xl font-mono text-xs tracking-widest transition-all"
                                                                    style={{
                                                                        background: dailyTime === t ? 'rgba(120,50,240,0.2)' : 'rgba(40,15,80,0.2)',
                                                                        border: dailyTime === t ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(60,25,130,0.2)',
                                                                        color: dailyTime === t ? '#c084fc' : 'rgba(140,100,220,0.4)',
                                                                    }}>
                                                                    {t}m
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button onClick={planMission}
                                                    disabled={planning || !missionInput.trim()}
                                                    className="w-full py-4 font-orbitron text-sm tracking-widest rounded-xl flex items-center justify-center gap-3 transition-all duration-300"
                                                    style={{
                                                        background: !missionInput.trim() ? 'rgba(60,20,120,0.06)' : 'rgba(100,40,200,0.2)',
                                                        border: '1px solid rgba(140,70,240,0.45)',
                                                        color: !missionInput.trim() ? 'rgba(160,120,255,0.2)' : '#c084fc',
                                                        cursor: !missionInput.trim() ? 'not-allowed' : 'pointer',
                                                    }}
                                                    onMouseEnter={e => { if (missionInput.trim()) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                    <Rocket className="w-5 h-5" />
                                                    {planning ? 'BUILDING YOUR MISSION...' : 'GENERATE MISSION PLAN →'}
                                                </button>
                                            </div>

                                            {planning && (
                                                <div className="flex flex-col items-center gap-3 py-8">
                                                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                                                        style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                                                    <p className="font-mono tracking-widest" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '11px' }}>
                                                        AI IS BUILDING YOUR MISSION PLAN...
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* MISSION DISPLAY */
                                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                                            {/* Mission header */}
                                            <div className="rounded-2xl p-6" style={{ ...card, borderLeft: '3px solid #c084fc' }}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="font-orbitron text-xs tracking-widest mb-2"
                                                            style={{ color: 'rgba(160,120,255,0.5)', fontSize: '9px' }}>MISSION BRIEFING</div>
                                                        <h2 className="font-orbitron text-xl font-black text-white mb-2">{mission.title}</h2>
                                                        <p className="font-mono text-sm leading-relaxed" style={{ color: 'rgba(180,155,255,0.6)' }}>
                                                            {mission.overview}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                                        {[
                                                            { value: mission.totalDays, label: 'DAYS' },
                                                            { value: `${mission.dailyMinutes}m`, label: 'PER DAY' },
                                                        ].map(s => (
                                                            <div key={s.label} className="text-center px-4 py-2 rounded-xl"
                                                                style={{ background: 'rgba(60,20,120,0.2)', border: '1px solid rgba(100,50,200,0.22)' }}>
                                                                <div className="font-orbitron text-lg font-black" style={{ color: '#c084fc' }}>{s.value}</div>
                                                                <div className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>{s.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button onClick={() => setMission(null)}
                                                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs tracking-widest transition-all"
                                                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}>
                                                    <RotateCcw className="w-3.5 h-3.5" /> NEW MISSION
                                                </button>
                                            </div>

                                            {/* Day cards */}
                                            <div className="space-y-3">
                                                {mission.days.map((day, dayIdx) => {
                                                    const dayDone = day.steps.every(s => s.done)
                                                    const dayProgress = day.steps.filter(s => s.done).length / day.steps.length
                                                    const isExpanded = expandedDay === dayIdx
                                                    return (
                                                        <motion.div key={day.day}
                                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: dayIdx * 0.04 }}
                                                            className="rounded-2xl overflow-hidden"
                                                            style={{ ...card, borderLeft: `3px solid ${dayDone ? '#00cc60' : dayIdx === 0 ? '#c084fc' : 'rgba(100,50,200,0.3)'}` }}>

                                                            <div className="flex items-center gap-4 p-4 cursor-pointer"
                                                                onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}>
                                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                                                    style={{
                                                                        background: dayDone ? 'rgba(0,200,80,0.15)' : 'rgba(100,40,200,0.18)',
                                                                        border: dayDone ? '1px solid rgba(0,200,80,0.4)' : '1px solid rgba(140,70,240,0.35)',
                                                                    }}>
                                                                    {dayDone
                                                                        ? <CheckCircle className="w-4 h-4" style={{ color: '#00cc60' }} />
                                                                        : <span className="font-orbitron" style={{ color: '#c084fc', fontSize: '10px' }}>{day.day}</span>
                                                                    }
                                                                </div>

                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="font-orbitron text-xs text-white tracking-wider">{day.label}</span>
                                                                        <span className="font-mono text-xs" style={{ color: 'rgba(160,130,220,0.45)' }}>
                                                                            — {day.theme}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1.5 w-32 h-1 rounded-full overflow-hidden"
                                                                        style={{ background: 'rgba(80,40,160,0.2)' }}>
                                                                        <div className="h-full rounded-full transition-all duration-500"
                                                                            style={{ width: `${dayProgress * 100}%`, background: dayDone ? '#00cc60' : 'linear-gradient(90deg, #7c3aed, #c084fc)' }} />
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                                    <span className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '10px' }}>
                                                                        {day.steps.filter(s => s.done).length}/{day.steps.length}
                                                                    </span>
                                                                    <span style={{ color: 'rgba(120,80,200,0.4)' }}>
                                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                                                                        <div className="px-4 pb-4 space-y-2"
                                                                            style={{ borderTop: '1px solid rgba(80,40,160,0.12)' }}>
                                                                            <div className="h-2" />
                                                                            {day.steps.map((step, stepIdx) => (
                                                                                <div key={step.id}
                                                                                    className="flex items-start gap-3 p-3 rounded-xl transition-all"
                                                                                    style={{
                                                                                        background: step.done ? 'rgba(0,200,80,0.04)' : 'rgba(60,20,120,0.1)',
                                                                                        border: step.done ? '1px solid rgba(0,200,80,0.15)' : '1px solid rgba(80,40,160,0.15)',
                                                                                        opacity: step.done ? 0.6 : 1,
                                                                                    }}>
                                                                                    <button onClick={() => toggleMissionStepDone(dayIdx, step.id)}
                                                                                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                                                                                        style={{
                                                                                            background: step.done ? 'rgba(0,200,80,0.15)' : 'rgba(80,40,160,0.2)',
                                                                                            border: step.done ? '1.5px solid rgba(0,200,80,0.4)' : '1.5px solid rgba(120,60,220,0.35)',
                                                                                        }}>
                                                                                        {step.done
                                                                                            ? <CheckCircle className="w-3 h-3" style={{ color: '#00cc60' }} />
                                                                                            : <span className="font-orbitron" style={{ color: 'rgba(160,120,255,0.5)', fontSize: '8px' }}>{stepIdx + 1}</span>
                                                                                        }
                                                                                    </button>
                                                                                    <div className="flex-1">
                                                                                        <div className="font-mono text-xs mb-0.5"
                                                                                            style={{ color: step.done ? 'rgba(160,140,220,0.35)' : 'rgba(200,185,255,0.78)', textDecoration: step.done ? 'line-through' : 'none' }}>
                                                                                            {step.title}
                                                                                        </div>
                                                                                        <div className="font-mono" style={{ color: 'rgba(140,110,200,0.35)', fontSize: '9px' }}>
                                                                                            💡 {step.tip}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                                                                            style={{ background: 'rgba(60,20,120,0.2)', border: '1px solid rgba(80,40,160,0.18)' }}>
                                                                                            <Clock className="w-3 h-3" style={{ color: 'rgba(140,100,220,0.4)' }} />
                                                                                            <span className="font-mono" style={{ color: 'rgba(160,120,255,0.5)', fontSize: '9px' }}>{step.duration}m</span>
                                                                                        </div>
                                                                                        {!step.done && (
                                                                                            <button onClick={() => navigate('/focus')}
                                                                                                className="px-2.5 py-1 rounded-lg font-mono text-xs transition-all"
                                                                                                style={{ background: 'rgba(100,40,200,0.12)', border: '1px solid rgba(140,70,240,0.3)', color: 'rgba(192,132,252,0.6)' }}
                                                                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(192,132,252,0.6)' }}>
                                                                                                <Play className="w-3 h-3" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}