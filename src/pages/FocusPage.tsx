import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Play, Pause, Square, Plus, Upload,
    CheckCircle, AlertTriangle, Trophy, X, History, Settings2
} from 'lucide-react'
import ShaderBackground from '../components/ui/ShaderBackground'
import Sidebar from '../components/ui/Sidebar'
import {
    FocusDetectionEngine,
    DISTRACTION_LABELS,
    type DistractionType,
    type EngineStatus,
} from '../lib/focus/detection-engine'

// ─── TYPES ────────────────────────────────────────────────────
const durations = [
    { label: '15 MIN', seconds: 900 },
    { label: '25 MIN', seconds: 1500 },
    { label: '45 MIN', seconds: 2700 },
    { label: '60 MIN', seconds: 3600 },
]

type DistractionBreakdown = Record<DistractionType, number>

const emptyBreakdown = (): DistractionBreakdown => ({
    phone: 0, absence: 0, looking_away: 0, talking: 0, inactive: 0,
})

interface FocusSession {
    id: string
    mission: string
    duration: number
    completedAt: string
    status: 'SUCCESS' | 'INCOMPLETE' | 'FAILED'
    distractionCount: number
    distractionLimit?: number
    completionPhoto?: string
    distractionBreakdown: DistractionBreakdown
}

const ALERT_MESSAGES: Record<DistractionType, string> = {
    absence: 'You left the screen. Return to your mission!',
    looking_away: 'Eyes on the screen! Stay focused.',
    phone: 'Put the phone down. You are in focus mode!',
    inactive: 'Are you still there? Get back to work!',
    talking: 'Stop talking and refocus!',
}

const ALERT_ICONS: Record<DistractionType, string> = {
    absence: '👻',
    looking_away: '👀',
    phone: '📱',
    inactive: '😴',
    talking: '🗣️',
}

const ALERT_TITLES: Record<DistractionType, string> = {
    absence: 'WHERE DID YOU GO?',
    looking_away: 'EYES ON SCREEN',
    phone: 'PUT THE PHONE DOWN',
    inactive: 'WAKE UP!',
    talking: 'STOP TALKING!',
}

const glassCard = {
    background: 'rgba(5, 2, 20, 0.75)',
    border: '1px solid rgba(120, 60, 220, 0.25)',
    backdropFilter: 'blur(24px)',
}

export default function FocusPage() {
    const navigate = useNavigate()

    // ── Setup ──
    const [mission, setMission] = useState('')
    const [selectedDuration, setSelectedDuration] = useState(durations[1])
    const [distractionLimit, setDistractionLimit] = useState(5)
    const [showLimitPicker, setShowLimitPicker] = useState(false)
    const [cameraEnabled, setCameraEnabled] = useState(false)

    // ── Timer ──
    const [running, setRunning] = useState(false)
    const [paused, setPaused] = useState(false)
    const [remaining, setRemaining] = useState(1500)
    const [total, setTotal] = useState(1500)
    const [done, setDone] = useState(false)

    // ── Detection state ──
    const [loading, setLoading] = useState<string | null>(null)
    const [cameraError, setCameraError] = useState('')
    const [distractionCount, setDistractionCount] = useState(0)
    const [distractionAlert, setDistractionAlert] = useState(false)
    const [distractionReason, setDistractionReason] = useState<DistractionType | null>(null)
    const [breakdown, setBreakdown] = useState<DistractionBreakdown>(emptyBreakdown())
    const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null)

    // ── Completion ──
    const [completionPhoto, setCompletionPhoto] = useState<string | null>(null)
    const [sessionSaved, setSessionSaved] = useState(false)
    const [savedStatus, setSavedStatus] = useState<'SUCCESS' | 'INCOMPLETE' | 'FAILED'>('INCOMPLETE')

    // ── History ──
    const [sessions, setSessions] = useState<FocusSession[]>(() => {
        try { return JSON.parse(localStorage.getItem('robofocus_sessions') || '[]') }
        catch { return [] }
    })

    // ─── REFS ──────────────────────────────────────────────────
    const intervalRef = useRef<any>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const engineRef = useRef<FocusDetectionEngine | null>(null)

    // mirrors for async access
    const runningRef = useRef(false)
    const pausedRef = useRef(false)
    const distractionCountRef = useRef(0)
    const breakdownRef = useRef<DistractionBreakdown>(emptyBreakdown())
    const distractionAlertRef = useRef(false)
    const distractionLimitRef = useRef(5)
    const endedRef = useRef(false)

    useEffect(() => { runningRef.current = running }, [running])
    useEffect(() => { pausedRef.current = paused }, [paused])
    useEffect(() => { distractionCountRef.current = distractionCount }, [distractionCount])
    useEffect(() => { breakdownRef.current = breakdown }, [breakdown])
    useEffect(() => { distractionAlertRef.current = distractionAlert }, [distractionAlert])
    useEffect(() => { distractionLimitRef.current = distractionLimit }, [distractionLimit])

    // cleanup on unmount
    useEffect(() => {
        return () => {
            engineRef.current?.destroy()
            streamRef.current?.getTracks().forEach(t => t.stop())
        }
    }, [])

    // ─── COMPUTED ────────────────────────────────────────────────
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    const progress = total > 0 ? (total - remaining) / total : 0
    const circumference = 2 * Math.PI * 110
    const strokeDashoffset = circumference * (1 - progress)
    const successSessions = sessions.filter(s => s.status === 'SUCCESS').length
    const limitExceeded = distractionCount > distractionLimit

    // ─── TIMER ──────────────────────────────────────────────────
    const isTimerPaused = paused || distractionAlert || !!loading

    useEffect(() => {
        if (running && !isTimerPaused) {
            intervalRef.current = setInterval(() => {
                setRemaining(r => {
                    if (r <= 1) {
                        clearInterval(intervalRef.current)
                        setRunning(false)
                        setDone(true)
                        stopCamera()
                        return 0
                    }
                    return r - 1
                })
            }, 1000)
        } else {
            clearInterval(intervalRef.current)
        }
        return () => clearInterval(intervalRef.current)
    }, [running, isTimerPaused])

    // ─── CAMERA / ENGINE ─────────────────────────────────────────
    const stopCamera = () => {
        engineRef.current?.stop()
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }

    const startCamera = async () => {
        setCameraError('')
        setLoading('Requesting camera…')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false,
            })
            streamRef.current = stream
            const video = videoRef.current
            if (!video) return
            video.srcObject = stream
            await video.play()

            const engine = new FocusDetectionEngine()
            engineRef.current = engine

            await engine.init(video, (msg) => setLoading(msg))

            engine.onDistraction = (type: DistractionType) => {
                if (endedRef.current) return
                engine.pause()

                const newCount = distractionCountRef.current + 1
                distractionCountRef.current = newCount
                setDistractionCount(newCount)

                const updated = { ...breakdownRef.current, [type]: breakdownRef.current[type] + 1 }
                breakdownRef.current = updated
                setBreakdown({ ...updated })

                setDistractionReason(type)
                setDistractionAlert(true)
                distractionAlertRef.current = true
                setPaused(true)

                if (newCount > distractionLimitRef.current) {
                    endedRef.current = true
                    engine.stop()
                    setRunning(false)
                    setDone(true)
                    stopCamera()
                }
            }

            engine.onStatus = (status: EngineStatus) => {
                setEngineStatus(status)
            }

            engine.start()
            setLoading(null)
        } catch (e) {
            const name = e instanceof Error ? e.name : ''
            setCameraError(
                name === 'NotAllowedError'
                    ? 'Camera access denied. Focus monitoring disabled.'
                    : 'Could not start camera. Check permissions and try again.'
            )
            setCameraEnabled(false)
            setLoading(null)
        }
    }

    // ─── SESSION START ────────────────────────────────────────────
    const start = async () => {
        endedRef.current = false
        const fresh = emptyBreakdown()
        setRemaining(selectedDuration.seconds)
        setTotal(selectedDuration.seconds)
        setRunning(true)
        setPaused(false)
        setDone(false)
        setDistractionCount(0)
        distractionCountRef.current = 0
        setBreakdown(fresh)
        breakdownRef.current = fresh
        setDistractionAlert(false)
        distractionAlertRef.current = false
        setDistractionReason(null)
        setCompletionPhoto(null)
        setSessionSaved(false)
        setEngineStatus(null)

        if (cameraEnabled) {
            await startCamera()
        }
    }

    const togglePause = () => {
        if (distractionAlert) return
        const next = !paused
        setPaused(next)
        if (next) engineRef.current?.pause()
        else engineRef.current?.resume()
    }

    const end = () => {
        clearInterval(intervalRef.current)
        stopCamera()
        engineRef.current?.destroy()
        setRunning(false)
        setPaused(false)
        setDone(false)
        setDistractionAlert(false)
        distractionAlertRef.current = false
        setRemaining(selectedDuration.seconds)
        setLoading(null)
    }

    const addTime = () => {
        setRemaining(r => r + 300)
        setTotal(t => t + 300)
    }

    const dismissAlert = () => {
        setDistractionAlert(false)
        distractionAlertRef.current = false
        setPaused(false)
        setDistractionReason(null)
        engineRef.current?.resume()
    }

    // ─── PHOTO ───────────────────────────────────────────────────
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setCompletionPhoto(ev.target?.result as string)
        reader.readAsDataURL(file)
    }

    // ─── SAVE SESSION ────────────────────────────────────────────
    const saveSession = (status: 'SUCCESS' | 'INCOMPLETE') => {
        const finalStatus: 'SUCCESS' | 'INCOMPLETE' | 'FAILED' =
            distractionCountRef.current > distractionLimit ? 'FAILED' : status
        setSavedStatus(finalStatus)
        const session: FocusSession = {
            id: Date.now().toString(),
            mission: mission || 'Deep Work Session',
            duration: selectedDuration.seconds,
            completedAt: new Date().toISOString(),
            status: finalStatus,
            distractionCount: distractionCountRef.current,
            distractionLimit,
            completionPhoto: completionPhoto || undefined,
            distractionBreakdown: { ...breakdownRef.current },
        }
        const updated = [session, ...sessions]
        setSessions(updated)
        localStorage.setItem('robofocus_sessions', JSON.stringify(updated))
        setSessionSaved(true)
    }

    // ─── STATUS COLOR ────────────────────────────────────────────
    const statusColor = () => {
        if (!engineStatus) return '#c084fc'
        if (!engineStatus.faceDetected) return '#ff4444'
        if (engineStatus.phoneVisible) return '#ff9900'
        if (engineStatus.talking) return '#ff9900'
        if (engineStatus.lookingAway) return '#ff6666'
        return 'rgba(0,220,100,0.85)'
    }

    const statusLabel = () => {
        if (!engineStatus) return 'LOADING'
        if (!engineStatus.faceDetected) return 'NO FACE'
        if (engineStatus.phoneVisible) return 'PHONE DETECTED'
        if (engineStatus.talking) return 'TALKING'
        if (engineStatus.lookingAway) return 'LOOKING AWAY'
        if (engineStatus.calibrating) return 'CALIBRATING'
        return 'FOCUSED'
    }

    // ─── RENDER ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: '#030010' }}>
            <ShaderBackground />
            <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(2, 0, 10, 0.55)', zIndex: 1 }} />

            {/* ── DISTRACTION ALERT ── */}
            <AnimatePresence>
                {distractionAlert && distractionReason && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center"
                        style={{ zIndex: 100, background: 'rgba(180,0,0,0.10)', backdropFilter: 'blur(5px)' }}>
                        <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
                            className="rounded-2xl p-8 text-center max-w-md mx-4"
                            style={{ background: 'rgba(5,2,20,0.96)', border: '2px solid rgba(255,60,60,0.6)', boxShadow: '0 0 60px rgba(255,40,40,0.3)' }}>
                            <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 0.4, repeat: Infinity }}
                                className="text-5xl mb-4">{ALERT_ICONS[distractionReason]}</motion.div>
                            <h2 className="font-orbitron text-xl font-black mb-2" style={{ color: '#ff4444' }}>
                                {ALERT_TITLES[distractionReason]}
                            </h2>
                            <p className="font-mono text-sm mb-4" style={{ color: 'rgba(255,200,200,0.7)' }}>
                                {ALERT_MESSAGES[distractionReason]}
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-2"
                                style={{ background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.3)' }}>
                                <AlertTriangle className="w-3 h-3" style={{ color: '#ff6666' }} />
                                <span className="font-orbitron text-xs" style={{ color: 'rgba(255,160,160,0.9)' }}>
                                    DISTRACTION #{distractionCountRef.current} / LIMIT {distractionLimit}
                                </span>
                            </div>
                            {limitExceeded && (
                                <div className="w-full px-4 py-2 rounded-lg mb-3 mt-2"
                                    style={{ background: 'rgba(255,100,0,0.15)', border: '1px solid rgba(255,100,0,0.4)' }}>
                                    <span className="font-orbitron text-xs" style={{ color: '#ff9944' }}>
                                        ⚠️ LIMIT EXCEEDED — SESSION WILL BE MARKED FAILED
                                    </span>
                                </div>
                            )}
                            <button onClick={dismissAlert}
                                className="w-full py-4 font-orbitron text-sm tracking-widest rounded-xl transition-all duration-300 mt-2"
                                style={{ background: 'rgba(255,60,60,0.18)', border: '1px solid rgba(255,60,60,0.5)', color: '#ff6666' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,60,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,60,0.18)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff6666' }}>
                                I'M BACK — RESUME MISSION
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative flex min-h-screen" style={{ zIndex: 2 }}>
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen">

                    {/* ── TOPBAR ── */}
                    <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(100,40,200,0.15)' }}>
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">FOCUS MODE</h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(160,120,255,0.35)', fontSize: '11px' }}>
                                Lock in. Execute. AI monitors your attention.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                                style={{ background: 'rgba(0,200,80,0.08)', border: '1px solid rgba(0,200,80,0.2)' }}>
                                <Trophy className="w-3 h-3" style={{ color: 'rgba(0,220,100,0.6)' }} />
                                <span className="font-orbitron" style={{ color: 'rgba(0,220,100,0.6)', fontSize: '9px' }}>{successSessions} SUCCESS</span>
                            </div>
                            <button onClick={() => navigate('/focus/history')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                                style={{ background: 'rgba(60,20,120,0.15)', border: '1px solid rgba(100,50,200,0.25)', color: 'rgba(160,120,255,0.5)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,120,255,0.5)' }}>
                                <History className="w-3 h-3" /> HISTORY
                            </button>
                            <button onClick={() => setCameraEnabled(!cameraEnabled)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                                style={{
                                    background: cameraEnabled ? 'rgba(100,40,200,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: cameraEnabled ? '1px solid rgba(160,80,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                                    color: cameraEnabled ? '#c084fc' : 'rgba(255,255,255,0.25)',
                                }}>
                                {cameraEnabled ? '🎥 MONITOR ON' : '📷 MONITOR OFF'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex">
                        <div className="flex-1 flex items-center justify-center px-8 py-6">
                            <AnimatePresence mode="wait">

                                {/* ── SETUP ── */}
                                {!running && !done && (
                                    <motion.div key="setup"
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                                        className="w-full max-w-lg">
                                        <div className="rounded-2xl p-8 space-y-6" style={glassCard}>
                                            <div className="text-center">
                                                <h2 className="font-orbitron text-lg font-black text-white tracking-wider">SET YOUR MISSION</h2>
                                                <p className="font-mono mt-1" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '11px' }}>What are you locking in on?</p>
                                            </div>

                                            <div>
                                                <label className="font-mono text-xs tracking-widest block mb-2" style={{ color: 'rgba(160,120,255,0.4)' }}>MISSION NAME</label>
                                                <input
                                                    className="w-full font-mono text-sm px-4 py-3 rounded-xl focus:outline-none transition-all text-center"
                                                    style={{ background: 'rgba(80,40,160,0.1)', border: '1px solid rgba(100,50,200,0.25)', color: 'rgba(220,200,255,0.85)' }}
                                                    placeholder="e.g. Study biology chapter 3"
                                                    value={mission}
                                                    onChange={e => setMission(e.target.value)}
                                                    onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160,80,255,0.6)' }}
                                                    onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(100,50,200,0.25)' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="font-mono text-xs tracking-widest block mb-3" style={{ color: 'rgba(160,120,255,0.4)' }}>SESSION LENGTH</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {durations.map(d => (
                                                        <button key={d.label}
                                                            onClick={() => { setSelectedDuration(d); setRemaining(d.seconds) }}
                                                            className="py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-200"
                                                            style={{
                                                                background: selectedDuration.label === d.label ? 'rgba(120,50,240,0.25)' : 'rgba(60,30,120,0.1)',
                                                                border: selectedDuration.label === d.label ? '1px solid rgba(160,80,255,0.6)' : '1px solid rgba(80,40,160,0.2)',
                                                                color: selectedDuration.label === d.label ? '#c084fc' : 'rgba(160,120,255,0.35)',
                                                            }}>{d.label}</button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* DISTRACTION LIMIT */}
                                            <div className="p-4 rounded-xl" style={{ background: 'rgba(60,20,120,0.12)', border: '1px solid rgba(100,50,200,0.18)' }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <div className="font-mono text-sm flex items-center gap-1.5" style={{ color: 'rgba(200,185,255,0.7)' }}>
                                                            <Settings2 className="w-3.5 h-3.5" /> Distraction Limit
                                                        </div>
                                                        <div className="font-mono mt-1" style={{ color: 'rgba(120,90,180,0.4)', fontSize: '10px' }}>
                                                            Exceed this → session marked FAILED
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowLimitPicker(!showLimitPicker)}
                                                        className="px-4 py-2 rounded-lg font-orbitron text-base font-black"
                                                        style={{ background: 'rgba(120,50,220,0.2)', border: '1px solid rgba(160,80,255,0.4)', color: '#c084fc' }}>
                                                        {distractionLimit}
                                                    </button>
                                                </div>
                                                {showLimitPicker && (
                                                    <div className="grid grid-cols-6 gap-2 mt-3">
                                                        {[1, 2, 3, 5, 7, 10].map(n => (
                                                            <button key={n} onClick={() => { setDistractionLimit(n); setShowLimitPicker(false) }}
                                                                className="py-2 rounded-lg font-orbitron text-xs transition-all"
                                                                style={{
                                                                    background: distractionLimit === n ? 'rgba(120,50,240,0.3)' : 'rgba(40,20,80,0.2)',
                                                                    border: distractionLimit === n ? '1px solid rgba(160,80,255,0.6)' : '1px solid rgba(80,40,140,0.2)',
                                                                    color: distractionLimit === n ? '#c084fc' : 'rgba(160,120,255,0.4)',
                                                                }}>{n}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* CAMERA TOGGLE */}
                                            <div className="flex items-center justify-between p-4 rounded-xl"
                                                style={{ background: 'rgba(60,20,120,0.12)', border: '1px solid rgba(100,50,200,0.18)' }}>
                                                <div>
                                                    <div className="font-mono text-sm" style={{ color: 'rgba(200,185,255,0.7)' }}>🎥 Attention Monitor</div>
                                                    <div className="font-mono mt-1" style={{ color: 'rgba(120,90,180,0.4)', fontSize: '10px' }}>
                                                        Detects: no face · gaze · phone · stillness · talking
                                                    </div>
                                                </div>
                                                <button onClick={() => setCameraEnabled(!cameraEnabled)}
                                                    className="relative w-10 h-5 rounded-full transition-all duration-300"
                                                    style={{
                                                        background: cameraEnabled ? 'rgba(120,50,220,0.5)' : 'rgba(255,255,255,0.08)',
                                                        border: cameraEnabled ? '1px solid rgba(160,80,255,0.6)' : '1px solid rgba(255,255,255,0.12)'
                                                    }}>
                                                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300"
                                                        style={{ left: cameraEnabled ? '20px' : '2px' }} />
                                                </button>
                                            </div>

                                            {cameraError && (
                                                <div className="text-center font-mono text-xs px-3 py-2 rounded-lg"
                                                    style={{ color: 'rgba(255,100,100,0.7)', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)' }}>
                                                    {cameraError}
                                                </div>
                                            )}

                                            <button onClick={start}
                                                className="w-full py-4 font-orbitron text-sm tracking-widest rounded-xl flex items-center justify-center gap-3 transition-all duration-300"
                                                style={{ background: 'rgba(100,40,200,0.2)', border: '1px solid rgba(140,70,240,0.5)', color: '#c084fc' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                <Play className="w-5 h-5" /> START FOCUS SESSION
                                            </button>
                                        </div>

                                        {sessions.length > 0 && (
                                            <div className="mt-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="font-orbitron tracking-widest" style={{ color: 'rgba(140,90,220,0.4)', fontSize: '9px' }}>RECENT SESSIONS</p>
                                                    <button onClick={() => navigate('/focus/history')}
                                                        className="font-mono transition-all" style={{ color: 'rgba(140,90,220,0.35)', fontSize: '9px' }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(140,90,220,0.35)' }}>
                                                        VIEW ALL →
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {sessions.slice(0, 3).map(s => (
                                                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl"
                                                            style={{ background: 'rgba(5,2,20,0.6)', border: '1px solid rgba(80,40,160,0.15)' }}>
                                                            <div>
                                                                <div className="font-mono text-xs" style={{ color: 'rgba(200,185,255,0.6)' }}>{s.mission}</div>
                                                                <div className="font-mono" style={{ color: 'rgba(120,90,180,0.35)', fontSize: '9px' }}>
                                                                    {Math.floor(s.duration / 60)}m · {s.distractionCount} distractions
                                                                </div>
                                                            </div>
                                                            <span className="font-orbitron px-2 py-1 rounded-lg" style={{
                                                                fontSize: '8px',
                                                                background: s.status === 'SUCCESS' ? 'rgba(0,200,80,0.1)' : s.status === 'FAILED' ? 'rgba(255,60,60,0.1)' : 'rgba(255,170,0,0.1)',
                                                                border: s.status === 'SUCCESS' ? '1px solid rgba(0,200,80,0.3)' : s.status === 'FAILED' ? '1px solid rgba(255,60,60,0.3)' : '1px solid rgba(255,170,0,0.3)',
                                                                color: s.status === 'SUCCESS' ? 'rgba(0,220,100,0.7)' : s.status === 'FAILED' ? 'rgba(255,80,80,0.7)' : 'rgba(255,170,0,0.7)',
                                                            }}>{s.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* ── ACTIVE SESSION ── */}
                                {running && !done && (
                                    <motion.div key="active"
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}
                                        className="flex flex-col items-center gap-6">

                                        {/* loading overlay */}
                                        {loading && (
                                            <div className="px-6 py-3 rounded-xl font-mono text-xs tracking-widest"
                                                style={{ background: 'rgba(100,40,200,0.15)', border: '1px solid rgba(160,80,255,0.3)', color: '#c084fc' }}>
                                                ⏳ {loading}
                                            </div>
                                        )}

                                        {/* Distraction limit dots */}
                                        <div className="flex items-center gap-2">
                                            {Array.from({ length: Math.min(distractionLimit, 10) }).map((_, i) => (
                                                <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                                                    style={{
                                                        background: i < distractionCount ? '#ff4444' : 'rgba(100,40,200,0.3)',
                                                        boxShadow: i < distractionCount ? '0 0 6px rgba(255,60,60,0.8)' : 'none',
                                                        transform: i < distractionCount ? 'scale(1.2)' : 'scale(1)'
                                                    }} />
                                            ))}
                                            <span className="font-mono ml-2" style={{ color: limitExceeded ? '#ff4444' : 'rgba(160,120,255,0.4)', fontSize: '9px' }}>
                                                {distractionCount}/{distractionLimit}{limitExceeded ? ' — LIMIT EXCEEDED' : ''}
                                            </span>
                                        </div>

                                        {/* Timer ring */}
                                        <div className="relative flex items-center justify-center" style={{ width: '280px', height: '280px' }}>
                                            <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                                                <circle cx="140" cy="140" r="110" fill="none" stroke="rgba(100,40,200,0.12)" strokeWidth="6" />
                                                <circle cx="140" cy="140" r="110" fill="none"
                                                    stroke={limitExceeded ? '#ff6600' : 'url(#timerGrad)'}
                                                    strokeWidth="6" strokeLinecap="round"
                                                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                                    style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 8px rgba(140,60,255,0.7))' }} />
                                                <defs>
                                                    <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#7c3aed" />
                                                        <stop offset="100%" stopColor="#c084fc" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="text-center z-10">
                                                <div className="font-orbitron font-black text-white"
                                                    style={{ fontSize: '52px', letterSpacing: '4px', textShadow: paused ? '0 0 40px rgba(255,180,60,0.6)' : '0 0 40px rgba(160,80,255,0.6)' }}>
                                                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                                                </div>
                                                <div className="font-orbitron tracking-widest mt-1"
                                                    style={{ color: paused ? 'rgba(255,180,60,0.7)' : 'rgba(160,120,255,0.5)', fontSize: '9px' }}>
                                                    {paused ? 'PAUSED' : 'FOCUSING'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-80 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(100,40,200,0.12)' }}>
                                            <motion.div className="h-full rounded-full"
                                                style={{ background: 'linear-gradient(90deg, #5b21b6, #a855f7)', boxShadow: '0 0 10px rgba(140,60,255,0.5)' }}
                                                animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} />
                                        </div>

                                        <div className="px-6 py-2 rounded-full font-mono text-xs tracking-widest"
                                            style={{ background: 'rgba(60,20,120,0.3)', border: '1px solid rgba(100,40,200,0.25)', color: 'rgba(180,140,255,0.6)' }}>
                                            {mission || 'DEEP WORK SESSION'}
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={togglePause}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-300"
                                                style={{ background: 'rgba(80,40,160,0.15)', border: '1px solid rgba(120,60,220,0.35)', color: 'rgba(180,140,255,0.7)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,50,200,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80,40,160,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,140,255,0.7)' }}>
                                                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                                {paused ? 'RESUME' : 'PAUSE'}
                                            </button>
                                            <button onClick={addTime}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-300"
                                                style={{ background: 'rgba(40,20,80,0.12)', border: '1px solid rgba(80,40,140,0.25)', color: 'rgba(140,100,220,0.5)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(120,60,220,0.45)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,40,140,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(140,100,220,0.5)' }}>
                                                <Plus className="w-4 h-4" /> +5 MIN
                                            </button>
                                            <button onClick={end}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-300"
                                                style={{ background: 'rgba(180,30,60,0.08)', border: '1px solid rgba(200,40,60,0.2)', color: 'rgba(240,80,100,0.5)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,40,60,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,30,60,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,80,100,0.5)' }}>
                                                <Square className="w-4 h-4" /> END
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── SESSION COMPLETE ── */}
                                {done && (
                                    <motion.div key="done"
                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="flex flex-col items-center gap-5 text-center w-full max-w-lg">

                                        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, repeat: 2 }}>
                                            <h2 className="font-orbitron text-4xl font-black text-white" style={{ textShadow: '0 0 50px rgba(160,80,255,0.8)' }}>
                                                SESSION COMPLETE
                                            </h2>
                                        </motion.div>

                                        <div className="flex gap-3 flex-wrap justify-center">
                                            <div className="px-4 py-3 rounded-xl text-center"
                                                style={{ background: 'rgba(60,20,120,0.25)', border: '1px solid rgba(100,40,200,0.3)' }}>
                                                <div className="font-orbitron text-lg font-black" style={{ color: '#c084fc' }}>{Math.floor(selectedDuration.seconds / 60)}</div>
                                                <div className="font-mono" style={{ color: 'rgba(160,130,220,0.5)', fontSize: '9px' }}>MINUTES</div>
                                            </div>
                                            <div className="px-4 py-3 rounded-xl text-center"
                                                style={{
                                                    background: limitExceeded ? 'rgba(255,100,0,0.08)' : distractionCount > 0 ? 'rgba(255,60,60,0.08)' : 'rgba(0,200,80,0.08)',
                                                    border: limitExceeded ? '1px solid rgba(255,100,0,0.25)' : distractionCount > 0 ? '1px solid rgba(255,60,60,0.25)' : '1px solid rgba(0,200,80,0.25)',
                                                }}>
                                                <div className="font-orbitron text-lg font-black"
                                                    style={{ color: limitExceeded ? '#ff6600' : distractionCount > 0 ? '#ff6666' : '#00cc60' }}>
                                                    {distractionCount}/{distractionLimit}
                                                </div>
                                                <div className="font-mono" style={{ color: 'rgba(160,130,220,0.5)', fontSize: '9px' }}>DISTRACTIONS</div>
                                            </div>
                                        </div>

                                        {/* Breakdown */}
                                        {distractionCount > 0 && (
                                            <div className="w-full rounded-xl p-4" style={{ background: 'rgba(5,2,20,0.6)', border: '1px solid rgba(80,40,160,0.2)' }}>
                                                <div className="font-orbitron text-xs tracking-widest mb-3 text-left" style={{ color: 'rgba(160,120,255,0.4)' }}>DISTRACTION BREAKDOWN</div>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {(Object.keys(breakdown) as DistractionType[]).map(key => (
                                                        <div key={key} className="text-center p-2 rounded-lg"
                                                            style={{
                                                                background: breakdown[key] > 0 ? 'rgba(255,60,60,0.08)' : 'rgba(40,20,80,0.15)',
                                                                border: breakdown[key] > 0 ? '1px solid rgba(255,60,60,0.2)' : '1px solid rgba(80,40,140,0.15)'
                                                            }}>
                                                            <div style={{ fontSize: '14px' }}>{ALERT_ICONS[key]}</div>
                                                            <div className="font-orbitron font-bold mt-1"
                                                                style={{ color: breakdown[key] > 0 ? '#ff8888' : 'rgba(120,90,180,0.3)', fontSize: '12px' }}>
                                                                {breakdown[key]}
                                                            </div>
                                                            <div className="font-mono mt-0.5" style={{ color: 'rgba(120,90,180,0.35)', fontSize: '7px' }}>
                                                                {DISTRACTION_LABELS[key]}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {!sessionSaved && (
                                            <div className="w-full rounded-2xl p-6 space-y-4" style={glassCard}>
                                                <div className="font-orbitron text-sm font-black text-white mb-1">📸 PROVE YOUR WORK</div>
                                                <p className="font-mono text-xs" style={{ color: 'rgba(160,130,220,0.5)' }}>
                                                    Upload proof of completed work to mark this session as SUCCESS.
                                                </p>
                                                {completionPhoto ? (
                                                    <div className="relative">
                                                        <img src={completionPhoto} alt="proof" className="w-full rounded-xl object-cover" style={{ maxHeight: '180px' }} />
                                                        <button onClick={() => setCompletionPhoto(null)}
                                                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                                            style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => fileInputRef.current?.click()}
                                                        className="w-full py-4 rounded-xl font-mono text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
                                                        style={{ background: 'rgba(60,20,120,0.2)', border: '2px dashed rgba(100,50,200,0.3)', color: 'rgba(160,120,255,0.5)' }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(160,80,255,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(100,50,200,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,120,255,0.5)' }}>
                                                        <Upload className="w-4 h-4" /> TAP TO UPLOAD COMPLETION PHOTO
                                                    </button>
                                                )}
                                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                                <div className="flex gap-3">
                                                    {!limitExceeded && (
                                                        <button onClick={() => saveSession('SUCCESS')} disabled={!completionPhoto}
                                                            className="flex-1 py-3 font-orbitron text-xs tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all"
                                                            style={{
                                                                background: completionPhoto ? 'rgba(0,180,80,0.15)' : 'rgba(0,180,80,0.05)',
                                                                border: completionPhoto ? '1px solid rgba(0,200,80,0.4)' : '1px solid rgba(0,200,80,0.1)',
                                                                color: completionPhoto ? '#00cc60' : 'rgba(0,200,80,0.25)',
                                                                cursor: completionPhoto ? 'pointer' : 'not-allowed',
                                                            }}>
                                                            <CheckCircle className="w-4 h-4" /> MARK SUCCESS
                                                        </button>
                                                    )}
                                                    <button onClick={() => saveSession('INCOMPLETE')}
                                                        className="flex-1 py-3 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                        style={{
                                                            background: limitExceeded ? 'rgba(255,60,60,0.15)' : 'rgba(60,20,120,0.12)',
                                                            border: limitExceeded ? '1px solid rgba(255,60,60,0.3)' : '1px solid rgba(100,50,200,0.2)',
                                                            color: limitExceeded ? '#ff6666' : 'rgba(160,120,255,0.5)',
                                                        }}>
                                                        {limitExceeded ? 'SAVE AS FAILED' : 'SAVE WITHOUT PHOTO'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {sessionSaved && (
                                            <div className="w-full py-4 rounded-xl text-center font-mono text-sm"
                                                style={{
                                                    background: savedStatus === 'SUCCESS' ? 'rgba(0,180,80,0.08)' : savedStatus === 'FAILED' ? 'rgba(255,60,60,0.08)' : 'rgba(255,170,0,0.08)',
                                                    border: savedStatus === 'SUCCESS' ? '1px solid rgba(0,200,80,0.3)' : savedStatus === 'FAILED' ? '1px solid rgba(255,60,60,0.3)' : '1px solid rgba(255,170,0,0.3)',
                                                    color: savedStatus === 'SUCCESS' ? 'rgba(0,220,100,0.7)' : savedStatus === 'FAILED' ? 'rgba(255,80,80,0.7)' : 'rgba(255,170,0,0.7)',
                                                }}>
                                                {savedStatus === 'SUCCESS' ? '✓ Session saved as SUCCESS' : savedStatus === 'FAILED' ? '✗ Session saved as FAILED' : '~ Session saved'}
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            <button onClick={start}
                                                className="px-8 py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-300"
                                                style={{ background: 'rgba(100,40,200,0.2)', border: '1px solid rgba(140,70,240,0.5)', color: '#c084fc' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                START ANOTHER
                                            </button>
                                            <button onClick={() => navigate('/focus/history')}
                                                className="px-8 py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}>
                                                VIEW HISTORY
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── CAMERA PANEL ── */}
                        {cameraEnabled && running && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                className="w-72 flex flex-col gap-4 p-5 border-l"
                                style={{ borderColor: 'rgba(80,30,160,0.15)' }}>

                                <div className="font-orbitron tracking-widest" style={{ color: 'rgba(140,90,220,0.45)', fontSize: '9px' }}>ATTENTION MONITOR</div>

                                <div className="relative rounded-xl overflow-hidden"
                                    style={{ background: 'rgba(5,2,20,0.8)', border: `1px solid ${engineStatus && !engineStatus.faceDetected ? 'rgba(255,60,60,0.5)' : 'rgba(100,50,200,0.25)'}` }}>
                                    <video ref={videoRef} className="w-full"
                                        style={{ transform: 'scaleX(-1)', height: '180px', objectFit: 'cover' }}
                                        muted playsInline />
                                    {loading && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                                            style={{ background: 'rgba(5,2,20,0.85)' }}>
                                            <div className="font-orbitron text-xs tracking-widest" style={{ color: '#c084fc' }}>⏳ {loading}</div>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full"
                                        style={{ background: engineStatus?.faceDetected ? 'rgba(0,180,80,0.85)' : 'rgba(255,40,40,0.85)' }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="font-orbitron" style={{ fontSize: '7px', color: 'white' }}>
                                            {engineStatus?.faceDetected ? 'FOCUSED' : 'NO FACE'}
                                        </span>
                                    </div>
                                </div>

                                {/* Live status */}
                                <div className="p-3 rounded-xl text-center"
                                    style={{ background: 'rgba(5,2,20,0.7)', border: '1px solid rgba(60,25,130,0.3)' }}>
                                    <div className="font-orbitron font-bold" style={{ color: statusColor(), fontSize: '11px', letterSpacing: '2px' }}>
                                        {statusLabel()}
                                    </div>
                                    {engineStatus?.calibrating && (
                                        <div className="font-mono mt-1" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '9px' }}>
                                            calibrating movement baseline…
                                        </div>
                                    )}
                                </div>

                                {/* Distraction count */}
                                <div className="flex items-center justify-between p-3 rounded-xl"
                                    style={{
                                        background: limitExceeded ? 'rgba(255,100,0,0.1)' : distractionCount > 0 ? 'rgba(255,40,40,0.08)' : 'rgba(5,2,20,0.6)',
                                        border: limitExceeded ? '1px solid rgba(255,100,0,0.3)' : distractionCount > 0 ? '1px solid rgba(255,60,60,0.3)' : '1px solid rgba(60,25,130,0.2)',
                                    }}>
                                    <span className="font-mono" style={{ color: 'rgba(160,130,220,0.5)', fontSize: '10px' }}>DISTRACTIONS</span>
                                    <span className="font-orbitron text-2xl font-black"
                                        style={{ color: limitExceeded ? '#ff6600' : distractionCount > 0 ? '#ff4444' : '#c084fc' }}>
                                        {distractionCount}<span style={{ fontSize: '12px', opacity: 0.5 }}>/{distractionLimit}</span>
                                    </span>
                                </div>

                                {/* Early warnings */}
                                {engineStatus && engineStatus.warnings.length > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)' }}>
                                        <div className="font-orbitron mb-2" style={{ color: 'rgba(255,170,0,0.6)', fontSize: '8px' }}>⚠ BUILDING UP</div>
                                        {engineStatus.warnings.map(w => (
                                            <div key={w.type} className="mb-2">
                                                <div className="flex justify-between font-mono mb-1" style={{ fontSize: '9px', color: 'rgba(255,200,100,0.6)' }}>
                                                    <span>{DISTRACTION_LABELS[w.type]}</span>
                                                    <span>{Math.floor(w.seconds)}s / {w.threshold}s</span>
                                                </div>
                                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,170,0,0.15)' }}>
                                                    <div className="h-full rounded-full" style={{
                                                        width: `${Math.min(100, (w.seconds / w.threshold) * 100)}%`,
                                                        background: 'rgba(255,170,0,0.7)',
                                                        transition: 'width 0.3s'
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Live status chips */}
                                {engineStatus && !loading && (
                                    <div className="p-3 rounded-xl space-y-1.5" style={{ background: 'rgba(5,2,20,0.4)', border: '1px solid rgba(40,15,90,0.3)' }}>
                                        <div className="font-orbitron mb-2" style={{ color: 'rgba(120,80,200,0.4)', fontSize: '8px' }}>LIVE SIGNALS</div>
                                        {[
                                            { label: 'Face detected', ok: engineStatus.faceDetected },
                                            { label: 'No phone', ok: !engineStatus.phoneVisible },
                                            { label: 'Looking at screen', ok: !engineStatus.lookingAway },
                                            { label: 'Not talking', ok: !engineStatus.talking },
                                        ].map(({ label, ok }) => (
                                            <div key={label} className="flex items-center justify-between">
                                                <span className="font-mono" style={{ color: 'rgba(140,110,200,0.4)', fontSize: '9px' }}>{label}</span>
                                                <span style={{ color: ok ? 'rgba(0,220,100,0.7)' : '#ff8888', fontSize: '10px' }}>{ok ? '✓' : '✗'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="font-mono text-center" style={{ color: 'rgba(100,70,180,0.3)', fontSize: '9px' }}>
                                    🤖 MediaPipe + COCO-SSD active
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}