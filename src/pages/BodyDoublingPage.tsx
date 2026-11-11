import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Volume2, VolumeX } from 'lucide-react'
import Sidebar from '../components/ui/Sidebar'
import TopoField from '../components/ui/TopoField'
import {
    askAI, readTasks, addXpToStorage, markActiveToday,
    completeTaskInStorage, sendBrowserNotification,
} from '../lib/robofocus'

// Body Doubling: ROBOFOCUS "works next to you" and checks in now and then.
// It only talks. It does not use the camera, the Focus Mode timer or any Focus Mode code.

type Phase = 'setup' | 'working' | 'break' | 'done'

interface FeedItem {
    id: number
    from: 'robo' | 'you'
    text: string
}

interface Summary {
    minutes: number
    xp: number
    checkIns: number
    stuck: number
    task: string
    linkedTaskId: number | null
}

const INTERVALS = [5, 10, 15, 25]

const CHECKIN_LINES = [
    'Still on it?',
    'Quick pulse check. Still going?',
    "How's it going? Still with me?",
    'Checking in. Still working on it?',
]

const GOING_LINES = [
    'Nice. Keep going.',
    "Good. I'm right here.",
    'Love that. Stay in it.',
    'Steady. Keep that momentum.',
]

const fmtClock = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// dark card with a soft purple gradient border
const glass = {
    background: 'linear-gradient(#07020f, #07020f) padding-box, linear-gradient(135deg, rgba(192,132,252,0.45), rgba(168,85,247,0.06) 50%, rgba(192,132,252,0.28)) border-box',
    border: '1px solid transparent',
}

// words slide up out of a mask, one after another
function RevealWords({ text, delay = 0, gradient = false }: { text: string; delay?: number; gradient?: boolean }) {
    return (
        <>
            {text.split(' ').map((word, i) => (
                <span key={i} style={{ overflow: 'hidden', display: 'inline-block', verticalAlign: 'bottom', paddingBottom: '0.12em', marginRight: '0.28em' }}>
                    <motion.span
                        style={{
                            display: 'inline-block',
                            ...(gradient ? {
                                background: 'linear-gradient(90deg, #f5f3ff, #a855f7)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                            } : {}),
                        }}
                        initial={{ y: '120%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{ duration: 0.9, delay: delay + i * 0.07, ease: 'easeOut' }}
                    >
                        {word}
                    </motion.span>
                </span>
            ))}
        </>
    )
}

export default function BodyDoublingPage() {
    const navigate = useNavigate()
    const [phase, setPhase] = useState<Phase>('setup')
    const [taskText, setTaskText] = useState('')
    const [linkedTaskId, setLinkedTaskId] = useState<number | null>(null)
    const [intervalMin, setIntervalMin] = useState(10)
    const [sound, setSound] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [lastCheck, setLastCheck] = useState(0)
    const [awaiting, setAwaiting] = useState(false)
    const [checkIns, setCheckIns] = useState(0)
    const [stuckCount, setStuckCount] = useState(0)
    const [thinking, setThinking] = useState(false)
    const [breakSec, setBreakSec] = useState(0)
    const [feed, setFeed] = useState<FeedItem[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [taskDone, setTaskDone] = useState(false)
    const [tasks] = useState(() => readTasks().filter(t => !t.done).slice(0, 6))

    const idRef = useRef(0)
    const accRef = useRef(0)
    const lastTickRef = useRef(0)
    const breakStartRef = useRef(0)
    const soundRef = useRef(false)
    const finishedRef = useRef(false)
    const secondNudgeRef = useRef(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => { soundRef.current = sound }, [sound])
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [feed, thinking])
    useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

    const speak = (text: string) => {
        if (!soundRef.current || !('speechSynthesis' in window)) return
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.rate = 1.0
        u.pitch = 1.05
        window.speechSynthesis.speak(u)
    }

    const say = (text: string, from: 'robo' | 'you' = 'robo') => {
        const id = idRef.current++
        setFeed(prev => [...prev, { id, from, text }].slice(-30))
        if (from === 'robo') speak(text)
    }

    // work timer: counts real time, so a background tab does not lose minutes
    useEffect(() => {
        if (phase !== 'working') return
        lastTickRef.current = Date.now()
        const timer = window.setInterval(() => {
            const now = Date.now()
            accRef.current += now - lastTickRef.current
            lastTickRef.current = now
            setElapsed(Math.floor(accRef.current / 1000))
        }, 1000)
        return () => window.clearInterval(timer)
    }, [phase])

    // break timer
    useEffect(() => {
        if (phase !== 'break') return
        breakStartRef.current = Date.now()
        setBreakSec(0)
        const timer = window.setInterval(() => {
            setBreakSec(Math.floor((Date.now() - breakStartRef.current) / 1000))
        }, 1000)
        return () => window.clearInterval(timer)
    }, [phase])

    // scheduled check-in
    useEffect(() => {
        if (phase !== 'working' || awaiting || elapsed === 0) return
        if (elapsed - lastCheck >= intervalMin * 60) {
            const line = CHECKIN_LINES[checkIns % CHECKIN_LINES.length]
            setAwaiting(true)
            setLastCheck(elapsed)
            setCheckIns(c => c + 1)
            secondNudgeRef.current = false
            say(line)
            sendBrowserNotification(line)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elapsed, phase, awaiting, lastCheck, intervalMin])

    // one gentle follow-up if a check-in is ignored for 2 minutes
    useEffect(() => {
        if (phase !== 'working' || !awaiting || secondNudgeRef.current) return
        if (elapsed - lastCheck >= 120) {
            secondNudgeRef.current = true
            say("Still here. Tap whenever you're ready. No pressure.")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elapsed, phase, awaiting, lastCheck])

    const resetSession = () => {
        accRef.current = 0
        finishedRef.current = false
        secondNudgeRef.current = false
        setElapsed(0)
        setLastCheck(0)
        setAwaiting(false)
        setCheckIns(0)
        setStuckCount(0)
        setThinking(false)
        setFeed([])
        setSummary(null)
        setTaskDone(false)
    }

    const startSession = () => {
        if (!taskText.trim()) return
        resetSession()
        setPhase('working')
        say(`I'm here. You're working on "${taskText.trim()}". I'll stay quiet and check in every ${intervalMin} minutes. Go.`)
    }

    const finish = () => {
        if (finishedRef.current) return
        finishedRef.current = true
        const minutes = Math.max(1, Math.round(elapsed / 60))
        const xp = minutes >= 10 ? 20 : minutes >= 3 ? 10 : 0
        if (xp > 0) addXpToStorage(xp)
        if (minutes >= 3) markActiveToday()
        window.speechSynthesis?.cancel()
        setSummary({ minutes, xp, checkIns, stuck: stuckCount, task: taskText.trim(), linkedTaskId })
        setPhase('done')
    }

    const respond = async (kind: 'going' | 'stuck' | 'break') => {
        if (thinking) return
        setAwaiting(false)
        setLastCheck(elapsed)
        if (kind === 'going') {
            say('Still going.', 'you')
            say(GOING_LINES[Math.floor(Math.random() * GOING_LINES.length)])
            return
        }
        if (kind === 'break') {
            say('Need a break.', 'you')
            say('Take five. Water, stretch, no phone scroll. Tap I\'M BACK when you are ready.')
            setPhase('break')
            return
        }
        say("I'm stuck.", 'you')
        setStuckCount(c => c + 1)
        setThinking(true)
        let reply = 'Shrink it. Write down just the very next physical action, then do only that for 2 minutes.'
        try {
            const ai = await askAI(
                `You are ROBOFOCUS, a calm body-double coach for someone with ADHD. They are working on "${taskText.trim()}" and say they are stuck. Give ONE tiny concrete next step they can do in under 2 minutes. Max 30 words. No lists.`,
                90
            )
            if (ai) reply = ai
        } catch { /* keep the offline fallback */ }
        setThinking(false)
        say(reply)
    }

    const backFromBreak = () => {
        setLastCheck(elapsed)
        setAwaiting(false)
        setPhase('working')
        say("Welcome back. Let's go.")
    }

    const markTaskDone = () => {
        if (!summary || summary.linkedTaskId === null) return
        if (completeTaskInStorage(summary.linkedTaskId)) setTaskDone(true)
    }

    const newSession = () => {
        resetSession()
        setTaskText('')
        setLinkedTaskId(null)
        setPhase('setup')
    }

    const onTaskTextChange = (v: string) => {
        setTaskText(v)
        const linked = tasks.find(t => t.id === linkedTaskId)
        if (linked && linked.name !== v) setLinkedTaskId(null)
    }

    const orbState = phase === 'break' ? 'break' : awaiting ? 'awaiting' : 'working'
    const orbLook = {
        working: { border: '2px solid rgba(130, 60, 220, 0.8)', glow: '0 0 60px rgba(110, 40, 210, 0.45), 0 0 100px rgba(80, 20, 180, 0.2)', color: '#9060d8' },
        awaiting: { border: '2px solid rgba(160, 80, 255, 0.95)', glow: '0 0 70px rgba(140, 60, 240, 0.6), 0 0 130px rgba(100, 30, 200, 0.3)', color: '#c080ff' },
        break: { border: '2px solid rgba(100, 50, 180, 0.4)', glow: 'none', color: 'rgba(140, 80, 220, 0.5)' },
    }[orbState]
    const statusText = {
        working: 'WORKING TOGETHER',
        awaiting: 'CHECK-IN: STILL ON IT?',
        break: 'ON A BREAK',
    }[orbState]
    const remaining = Math.max(0, intervalMin * 60 - (elapsed - lastCheck))

    const actionBtn = (primary: boolean) => ({
        background: primary ? 'rgba(120,50,230,0.3)' : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
        border: primary ? '1px solid rgba(160,80,255,0.6)' : '1px solid rgba(255,255,255,0.12)',
        color: primary ? '#c8a8ff' : 'rgba(200,170,255,0.65)',
        fontSize: '11px',
    })

    return (
        <div className="min-h-screen relative" style={{ background: '#050008' }}>
            {/* animated purple topographic background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <TopoField className="absolute inset-0" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,0,8,0.5), transparent, #050008)' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, transparent 0%, #050008 100%)', opacity: 0.85 }} />
            </div>
            <div className="relative z-10 flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen" style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '0 24px' }}>
                    {/* Header */}
                    <div className="py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(120,60,200,0.2)' }}>
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">BODY DOUBLE</h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(160,110,240,0.5)', fontSize: '11px' }}>
                                Quiet company while you work · gentle check-ins
                            </p>
                        </div>
                        <button
                            onClick={() => { setSound(!sound); if (sound) window.speechSynthesis?.cancel() }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                            style={{
                                background: sound ? 'rgba(120,50,220,0.2)' : 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(12px)',
                                border: sound ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                color: sound ? '#c8a8ff' : 'rgba(200,170,255,0.5)',
                            }}
                        >
                            {sound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                            {sound ? 'VOICE ON' : 'VOICE OFF'}
                        </button>
                    </div>

                    {/* SETUP */}
                    {phase === 'setup' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-10 space-y-6">
                            {/* hero */}
                            <div className="flex flex-col items-center text-center pt-4 pb-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
                                    style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', backdropFilter: 'blur(12px)' }}>
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#c084fc' }} />
                                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#c084fc' }} />
                                    </span>
                                    <span className="font-mono tracking-widest" style={{ color: 'rgba(216,180,254,0.8)', fontSize: '10px' }}>
                                        ROBOFOCUS 2.0 · BODY DOUBLE
                                    </span>
                                </div>
                                <h2 className="font-orbitron text-3xl md:text-4xl tracking-tight text-white leading-tight">
                                    <RevealWords text="You focus." />
                                    <br />
                                    <RevealWords text="I'll keep you company." delay={0.25} gradient />
                                </h2>
                                <p className="font-mono mt-5 max-w-md leading-relaxed" style={{ color: 'rgba(200,185,255,0.55)', fontSize: '13px' }}>
                                    Tell me what you're working on. I'll stay quiet, check in now and then, and help when you get stuck.
                                </p>
                            </div>
                            <div className="rounded-2xl p-6" style={glass}>
                                <label className="font-orbitron tracking-widest block mb-3" style={{ color: 'rgba(160,110,240,0.6)', fontSize: '9px' }}>
                                    WHAT ARE YOU WORKING ON?
                                </label>
                                <input
                                    className="w-full font-mono text-sm px-4 py-3 rounded-xl focus:outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(220,200,255,0.9)' }}
                                    placeholder="e.g. Chemistry lab report"
                                    value={taskText}
                                    onChange={e => onTaskTextChange(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && startSession()}
                                    onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160,90,255,0.5)' }}
                                    onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                                />
                                {tasks.length > 0 && (
                                    <div className="mt-4">
                                        <div className="font-mono mb-2" style={{ color: 'rgba(140,100,220,0.45)', fontSize: '10px' }}>OR PICK A MISSION</div>
                                        <div className="flex flex-wrap gap-2">
                                            {tasks.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => { setTaskText(t.name); setLinkedTaskId(t.id) }}
                                                    className="px-3 py-1.5 rounded-full font-mono transition-all"
                                                    style={{
                                                        ...actionBtn(linkedTaskId === t.id),
                                                        fontSize: '11px',
                                                    }}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl p-6" style={glass}>
                                <label className="font-orbitron tracking-widest block mb-3" style={{ color: 'rgba(160,110,240,0.6)', fontSize: '9px' }}>
                                    CHECK IN EVERY
                                </label>
                                <div className="flex gap-2">
                                    {INTERVALS.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setIntervalMin(m)}
                                            className="flex-1 py-2.5 rounded-xl font-orbitron tracking-widest transition-all"
                                            style={{ ...actionBtn(intervalMin === m), fontSize: '10px' }}
                                        >
                                            {m} MIN
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={startSession}
                                disabled={!taskText.trim()}
                                className="w-full py-4 font-orbitron text-sm tracking-widest rounded-full transition-all duration-300"
                                style={{
                                    background: taskText.trim() ? '#f3e8ff' : 'rgba(255,255,255,0.06)',
                                    border: '1px solid transparent',
                                    color: taskText.trim() ? '#2e1065' : 'rgba(200,170,255,0.3)',
                                    cursor: taskText.trim() ? 'pointer' : 'not-allowed',
                                    boxShadow: taskText.trim() ? '0 0 30px rgba(168,85,247,0.35)' : 'none',
                                }}
                            >
                                START WORKING TOGETHER
                            </button>
                        </motion.div>
                    )}

                    {/* WORKING + BREAK */}
                    {(phase === 'working' || phase === 'break') && (
                        <div className="flex flex-col flex-1">
                            <div className="flex flex-col items-center py-8 gap-3">
                                <motion.div
                                    className="relative rounded-full flex items-center justify-center"
                                    style={{
                                        width: '180px', height: '180px',
                                        background: 'rgba(10, 4, 30, 0.6)',
                                        border: orbLook.border,
                                        boxShadow: orbLook.glow,
                                        backdropFilter: 'blur(8px)',
                                        transition: 'border 0.5s ease, box-shadow 0.5s ease',
                                    }}
                                    animate={orbState === 'break' ? { scale: 1 } : { scale: [1, awaiting ? 1.06 : 1.025, 1] }}
                                    transition={{ duration: awaiting ? 1.2 : 4, repeat: orbState === 'break' ? 0 : Infinity }}
                                >
                                    <div className="text-center">
                                        <div className="font-orbitron font-black" style={{ color: orbLook.color, fontSize: '28px' }}>
                                            {phase === 'break' ? fmtClock(breakSec) : fmtClock(elapsed)}
                                        </div>
                                        <div className="font-mono" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>
                                            {phase === 'break' ? 'BREAK' : 'WORKED'}
                                        </div>
                                    </div>
                                </motion.div>
                                <p className="font-orbitron tracking-widest" style={{ color: orbLook.color, fontSize: '9px' }}>{statusText}</p>
                                <p className="font-mono text-center" style={{ color: 'rgba(220,200,255,0.7)', fontSize: '13px', maxWidth: '420px' }}>
                                    {taskText.trim()}
                                </p>
                                {phase === 'working' && !awaiting && (
                                    <p className="font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
                                        NEXT CHECK-IN IN {fmtClock(remaining)}
                                    </p>
                                )}
                            </div>

                            {/* Feed */}
                            <div className="flex-1 rounded-2xl p-5 overflow-y-auto mb-4 space-y-3"
                                style={{ ...glass, minHeight: '160px', maxHeight: '260px' }}>
                                <AnimatePresence>
                                    {feed.map(item => (
                                        <motion.div key={item.id}
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                                            className={`flex ${item.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[80%] px-4 py-3 rounded-xl font-mono leading-relaxed"
                                                style={{
                                                    fontSize: '13px',
                                                    backdropFilter: 'blur(12px)',
                                                    ...(item.from === 'robo' ? {
                                                        background: 'rgba(120,50,220,0.15)',
                                                        border: '1px solid rgba(140,70,240,0.25)',
                                                        color: 'rgba(220,200,255,0.9)',
                                                    } : {
                                                        background: 'rgba(255,255,255,0.07)',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        color: 'rgba(200,180,255,0.8)',
                                                    }),
                                                }}>
                                                {item.from === 'robo' && (
                                                    <div className="font-orbitron mb-1.5" style={{ color: 'rgba(160,90,255,0.9)', fontSize: '8px', letterSpacing: '2px' }}>ROBOFOCUS</div>
                                                )}
                                                {item.text}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {thinking && (
                                    <div className="flex justify-start">
                                        <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(120,50,220,0.15)', border: '1px solid rgba(140,70,240,0.25)' }}>
                                            <div className="flex gap-1.5 items-center">
                                                {[0, 1, 2].map(i => (
                                                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                                                        style={{ background: 'rgba(160,90,255,0.8)' }}
                                                        animate={{ y: [0, -4, 0] }}
                                                        transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Actions */}
                            <div className="pb-6">
                                {phase === 'working' ? (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <button onClick={() => respond('going')} disabled={thinking}
                                            className="px-5 py-2.5 rounded-full font-mono transition-all" style={actionBtn(awaiting)}>
                                            YES, GOING
                                        </button>
                                        <button onClick={() => respond('stuck')} disabled={thinking}
                                            className="px-5 py-2.5 rounded-full font-mono transition-all" style={actionBtn(false)}>
                                            I'M STUCK
                                        </button>
                                        <button onClick={() => respond('break')} disabled={thinking}
                                            className="px-5 py-2.5 rounded-full font-mono transition-all" style={actionBtn(false)}>
                                            NEED A BREAK
                                        </button>
                                        <button onClick={finish}
                                            className="px-5 py-2.5 rounded-full font-mono transition-all"
                                            style={{ ...actionBtn(false), color: '#00cc60', border: '1px solid rgba(0,204,96,0.35)' }}>
                                            I'M DONE ✓
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={backFromBreak}
                                            className="px-6 py-2.5 rounded-full font-orbitron tracking-widest transition-all"
                                            style={{ ...actionBtn(true), fontSize: '10px' }}>
                                            I'M BACK
                                        </button>
                                        <button onClick={finish}
                                            className="px-6 py-2.5 rounded-full font-mono transition-all" style={actionBtn(false)}>
                                            END SESSION
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* DONE */}
                    {phase === 'done' && summary && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-10 space-y-5">
                            <div className="rounded-2xl p-8 text-center" style={{ ...glass, borderTop: '2px solid rgba(0,204,96,0.4)' }}>
                                <div className="font-orbitron font-black text-white mb-1" style={{ fontSize: '16px' }}>SESSION COMPLETE</div>
                                <p className="font-mono mb-6" style={{ color: 'rgba(200,185,255,0.6)', fontSize: '12px' }}>{summary.task}</p>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: 'MINUTES WORKED', value: String(summary.minutes), color: '#c084fc' },
                                        { label: 'CHECK-INS', value: String(summary.checkIns), color: '#00c8ff' },
                                        { label: 'XP EARNED', value: `+${summary.xp}`, color: '#f59e0b' },
                                    ].map(s => (
                                        <div key={s.label}>
                                            <div className="font-orbitron font-black" style={{ color: s.color, fontSize: '24px', textShadow: `0 0 15px ${s.color}60` }}>{s.value}</div>
                                            <div className="font-mono" style={{ color: 'rgba(140,100,220,0.5)', fontSize: '8px' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                {summary.stuck > 0 && (
                                    <p className="font-mono mb-4" style={{ color: 'rgba(200,185,255,0.5)', fontSize: '11px' }}>
                                        You got stuck {summary.stuck} time{summary.stuck === 1 ? '' : 's'} and kept going. That counts.
                                    </p>
                                )}
                                {summary.xp === 0 && (
                                    <p className="font-mono mb-4" style={{ color: 'rgba(200,185,255,0.4)', fontSize: '11px' }}>
                                        Sessions under 3 minutes don't earn XP. Try a full one next time.
                                    </p>
                                )}
                                {summary.linkedTaskId !== null && (
                                    taskDone ? (
                                        <p className="font-orbitron" style={{ color: '#00cc60', fontSize: '10px' }}>MISSION COMPLETED +25 XP</p>
                                    ) : (
                                        <button onClick={markTaskDone}
                                            className="px-6 py-2.5 rounded-full font-mono transition-all"
                                            style={{ ...actionBtn(true), color: '#00cc60', border: '1px solid rgba(0,204,96,0.45)', background: 'rgba(0,204,96,0.08)' }}>
                                            MARK MISSION DONE (+25 XP)
                                        </button>
                                    )
                                )}
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button onClick={newSession} className="px-6 py-3 rounded-xl font-orbitron tracking-widest transition-all"
                                    style={{ ...actionBtn(true), fontSize: '10px' }}>
                                    NEW SESSION
                                </button>
                                <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl font-orbitron tracking-widest transition-all"
                                    style={{ ...actionBtn(false), fontSize: '10px' }}>
                                    DASHBOARD
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}