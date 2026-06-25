import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    AlertTriangle, Clock, RotateCcw,
    ChevronDown, ChevronUp, Target, Bell, Play
} from 'lucide-react'
import ShaderBackground from '../components/ui/ShaderBackground'
import Sidebar from '../components/ui/Sidebar'

interface FocusSession {
    id: string
    mission: string
    duration: number
    completedAt: string
    status: 'SUCCESS' | 'INCOMPLETE' | 'FAILED'
    distractionCount: number
    completionPhoto?: string
}

export default function FocusHistoryPage() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState<FocusSession[]>(() => {
        try { return JSON.parse(localStorage.getItem('robofocus_sessions') || '[]') }
        catch { return [] }
    })
    const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'INCOMPLETE'>('ALL')
    const [expanded, setExpanded] = useState<string | null>(null)
    const [notifEnabled, setNotifEnabled] = useState(false)
    const [notifMessage, setNotifMessage] = useState('')

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window) {
            setNotifEnabled(Notification.permission === 'granted')
        }
    }, [])

    // Send retry reminders for incomplete sessions
    useEffect(() => {
        const incomplete = sessions.filter(s => s.status === 'INCOMPLETE')
        if (incomplete.length > 0 && notifEnabled) {
            const oldest = incomplete[incomplete.length - 1]
            const timeSince = Date.now() - new Date(oldest.completedAt).getTime()
            const hoursSince = timeSince / (1000 * 60 * 60)
            if (hoursSince >= 2) {
                new Notification('⚡ ROBOFOCUS REMINDER', {
                    body: `You still need to retry: "${oldest.mission}". Finish what you started.`,
                })
            }
        }
    }, [notifEnabled, sessions])

    const requestNotifications = async () => {
        if (!('Notification' in window)) return
        const perm = await Notification.requestPermission()
        setNotifEnabled(perm === 'granted')
        if (perm === 'granted') {
            setNotifMessage('Notifications enabled! You\'ll get reminders for incomplete sessions.')
            setTimeout(() => setNotifMessage(''), 3000)
        }
    }

    const deleteSession = (id: string) => {
        const updated = sessions.filter(s => s.id !== id)
        setSessions(updated)
        localStorage.setItem('robofocus_sessions', JSON.stringify(updated))
    }

    const clearAll = () => {
        setSessions([])
        localStorage.setItem('robofocus_sessions', JSON.stringify([]))
    }

    const filteredSessions = sessions.filter(s =>
        filter === 'ALL' ? true : s.status === filter
    )

    const successCount = sessions.filter(s => s.status === 'SUCCESS').length
    const incompleteCount = sessions.filter(s => s.status === 'INCOMPLETE').length
    const totalMinutes = sessions.reduce((acc, s) => acc + Math.floor(s.duration / 60), 0)
    const completionRate = sessions.length > 0 ? Math.round((successCount / sessions.length) * 100) : 0

    const card = {
        background: 'rgba(5, 2, 20, 0.78)',
        border: '1px solid rgba(120, 60, 220, 0.22)',
        backdropFilter: 'blur(24px)',
    }

    const statusStyle = (status: FocusSession['status']) => ({
        SUCCESS: {
            bg: 'rgba(0,200,80,0.08)', border: '1px solid rgba(0,200,80,0.25)',
            color: 'rgba(0,220,100,0.7)', dot: '#00cc60'
        },
        INCOMPLETE: {
            bg: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.25)',
            color: 'rgba(255,160,40,0.7)', dot: '#f59e0b'
        },
        FAILED: {
            bg: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)',
            color: 'rgba(255,80,80,0.7)', dot: '#ef4444'
        },
    }[status])

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: '#030010' }}>
            <ShaderBackground />
            <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(2,0,10,0.55)', zIndex: 1 }} />

            <div className="relative flex min-h-screen" style={{ zIndex: 2 }}>
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen">

                    {/* TOPBAR */}
                    <div className="px-8 py-5 flex items-center justify-between flex-wrap gap-4"
                        style={{ borderBottom: '1px solid rgba(100,40,200,0.15)' }}>
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">FOCUS HISTORY</h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(160,120,255,0.35)', fontSize: '11px' }}>
                                Every session logged. Incomplete ones need your attention.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {!notifEnabled && (
                                <button onClick={requestNotifications}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs tracking-widest transition-all"
                                    style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.25)', color: 'rgba(255,160,40,0.7)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,0,0.15)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,0,0.08)' }}>
                                    <Bell className="w-3.5 h-3.5" />
                                    ENABLE RETRY REMINDERS
                                </button>
                            )}
                            {notifEnabled && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                                    style={{ background: 'rgba(0,200,80,0.06)', border: '1px solid rgba(0,200,80,0.2)' }}>
                                    <Bell className="w-3 h-3" style={{ color: 'rgba(0,200,80,0.5)' }} />
                                    <span className="font-mono" style={{ color: 'rgba(0,200,80,0.5)', fontSize: '9px' }}>REMINDERS ON</span>
                                </div>
                            )}
                            <button onClick={() => navigate('/focus')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                style={{ background: 'rgba(100,40,200,0.15)', border: '1px solid rgba(140,70,240,0.4)', color: '#c084fc' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                <Play className="w-3.5 h-3.5" />
                                NEW SESSION
                            </button>
                        </div>
                    </div>

                    <div className="px-8 py-6 space-y-5">

                        {/* Notification message */}
                        <AnimatePresence>
                            {notifMessage && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="px-4 py-3 rounded-xl font-mono text-xs"
                                    style={{ background: 'rgba(0,200,80,0.08)', border: '1px solid rgba(0,200,80,0.25)', color: 'rgba(0,220,100,0.7)' }}>
                                    ✓ {notifMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* STATS */}
                        <div className="grid grid-cols-5 gap-4">
                            {[
                                { label: 'TOTAL SESSIONS', value: sessions.length, color: '#c084fc' },
                                { label: 'SUCCESSFUL', value: successCount, color: '#00cc60' },
                                { label: 'NEED RETRY', value: incompleteCount, color: '#f59e0b' },
                                { label: 'TOTAL MINUTES', value: totalMinutes, color: '#00c8ff' },
                                { label: 'SUCCESS RATE', value: `${completionRate}%`, color: completionRate >= 70 ? '#00cc60' : completionRate >= 40 ? '#f59e0b' : '#ff3cac' },
                            ].map(s => (
                                <div key={s.label} className="rounded-2xl p-4 text-center" style={card}>
                                    <div className="font-orbitron text-2xl font-black mb-1"
                                        style={{ color: s.color, textShadow: `0 0 20px ${s.color}60` }}>{s.value}</div>
                                    <div className="font-mono tracking-widest" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* INCOMPLETE BANNER */}
                        {incompleteCount > 0 && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl p-5"
                                style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.28)' }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.3)' }}>
                                        <AlertTriangle className="w-4 h-4" style={{ color: 'rgba(255,160,40,0.8)' }} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-orbitron text-xs tracking-widest mb-1"
                                            style={{ color: 'rgba(255,160,40,0.7)', fontSize: '9px' }}>
                                            {incompleteCount} SESSION{incompleteCount > 1 ? 'S' : ''} NEED RETRY
                                        </div>
                                        <p className="font-mono text-sm mb-3" style={{ color: 'rgba(255,200,120,0.7)' }}>
                                            You started these but didn't mark them complete. Finish what you started — even 10 minutes counts.
                                        </p>
                                        <div className="space-y-1 mb-3">
                                            {sessions.filter(s => s.status === 'INCOMPLETE').slice(0, 3).map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-2 rounded-xl"
                                                    style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.15)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
                                                        <span className="font-mono text-xs" style={{ color: 'rgba(255,220,160,0.7)' }}>{s.mission}</span>
                                                        <span className="font-mono" style={{ color: 'rgba(255,160,40,0.4)', fontSize: '9px' }}>
                                                            {Math.floor(s.duration / 60)} min · {new Date(s.completedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => { navigate('/focus') }}
                                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-orbitron text-xs transition-all"
                                                        style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', color: 'rgba(255,160,40,0.7)' }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,0,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#f59e0b' }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,0,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,160,40,0.7)' }}>
                                                        <RotateCcw className="w-3 h-3" />
                                                        RETRY
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {!notifEnabled && (
                                            <button onClick={requestNotifications}
                                                className="flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', color: 'rgba(255,160,40,0.7)' }}>
                                                <Bell className="w-3.5 h-3.5" />
                                                GET REMINDED TO RETRY
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* FILTER TABS */}
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {(['ALL', 'SUCCESS', 'INCOMPLETE'] as const).map(f => (
                                    <button key={f} onClick={() => setFilter(f)}
                                        className="px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                        style={{
                                            background: filter === f ? 'rgba(100,40,200,0.2)' : 'rgba(40,15,80,0.15)',
                                            border: filter === f ? '1px solid rgba(160,80,255,0.45)' : '1px solid rgba(80,40,160,0.18)',
                                            color: filter === f ? '#c084fc' : 'rgba(140,100,220,0.4)',
                                        }}>
                                        {f} {f === 'SUCCESS' ? `(${successCount})` : f === 'INCOMPLETE' ? `(${incompleteCount})` : `(${sessions.length})`}
                                    </button>
                                ))}
                            </div>
                            {sessions.length > 0 && (
                                <button onClick={clearAll}
                                    className="font-mono text-xs tracking-widest transition-all"
                                    style={{ color: 'rgba(255,80,80,0.3)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,80,80,0.6)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,80,80,0.3)' }}>
                                    CLEAR ALL
                                </button>
                            )}
                        </div>

                        {/* SESSION LIST */}
                        {filteredSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(80,30,160,0.12)', border: '1px solid rgba(100,50,200,0.18)' }}>
                                    <Target className="w-7 h-7" style={{ color: 'rgba(140,90,220,0.3)' }} />
                                </div>
                                <div className="text-center">
                                    <div className="font-orbitron text-sm font-black text-white mb-2">NO SESSIONS YET</div>
                                    <p className="font-mono text-xs" style={{ color: 'rgba(160,130,220,0.45)' }}>
                                        Complete your first focus session to see history here.
                                    </p>
                                </div>
                                <button onClick={() => navigate('/focus')}
                                    className="px-6 py-3 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                    style={{ background: 'rgba(100,40,200,0.2)', border: '1px solid rgba(140,70,240,0.5)', color: '#c084fc' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                    START FIRST SESSION →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSessions.map((session, i) => {
                                    const ss = statusStyle(session.status)
                                    const isExpanded = expanded === session.id
                                    return (
                                        <motion.div key={session.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="rounded-2xl overflow-hidden"
                                            style={{ ...card, borderLeft: `3px solid ${ss.dot}` }}
                                        >
                                            {/* Session header */}
                                            <div className="flex items-center gap-4 p-4 cursor-pointer"
                                                onClick={() => setExpanded(isExpanded ? null : session.id)}>
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ss.dot }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-mono text-sm truncate" style={{ color: 'rgba(210,195,255,0.82)' }}>
                                                        {session.mission}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                        <span className="flex items-center gap-1 font-mono" style={{ color: 'rgba(140,110,200,0.4)', fontSize: '10px' }}>
                                                            <Clock className="w-3 h-3" />
                                                            {Math.floor(session.duration / 60)} min
                                                        </span>
                                                        <span className="flex items-center gap-1 font-mono" style={{ color: session.distractionCount > 0 ? 'rgba(255,100,100,0.5)' : 'rgba(140,110,200,0.4)', fontSize: '10px' }}>
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {session.distractionCount} distractions
                                                        </span>
                                                        <span className="font-mono" style={{ color: 'rgba(120,90,180,0.35)', fontSize: '10px' }}>
                                                            {new Date(session.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(session.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    {session.completionPhoto && (
                                                        <img src={session.completionPhoto} alt="proof"
                                                            className="w-8 h-8 rounded-lg object-cover"
                                                            style={{ border: `1px solid ${ss.dot}40` }} />
                                                    )}
                                                    <span className="font-orbitron px-2.5 py-1 rounded-lg"
                                                        style={{ fontSize: '8px', background: ss.bg, border: ss.border, color: ss.color }}>
                                                        {session.status}
                                                    </span>
                                                    {session.status === 'INCOMPLETE' && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); navigate('/focus') }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                                            style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', color: 'rgba(255,160,40,0.7)' }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,0,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#f59e0b' }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,0,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,160,40,0.7)' }}>
                                                            <RotateCcw className="w-3 h-3" />
                                                            RETRY
                                                        </button>
                                                    )}
                                                    <div style={{ color: 'rgba(140,100,220,0.35)' }}>
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded detail */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-6 pb-5 pt-2 space-y-4"
                                                            style={{ borderTop: '1px solid rgba(80,40,160,0.12)' }}>

                                                            {/* Completion photo */}
                                                            {session.completionPhoto ? (
                                                                <div>
                                                                    <div className="font-orbitron tracking-widest mb-2"
                                                                        style={{ color: 'rgba(140,90,220,0.45)', fontSize: '8px' }}>COMPLETION PHOTO</div>
                                                                    <img src={session.completionPhoto} alt="Completion proof"
                                                                        className="rounded-xl object-cover w-full"
                                                                        style={{ maxHeight: '200px', border: '1px solid rgba(100,50,200,0.25)' }} />
                                                                </div>
                                                            ) : (
                                                                <div className="px-4 py-3 rounded-xl font-mono text-xs"
                                                                    style={{ background: 'rgba(60,20,120,0.1)', border: '1px solid rgba(80,40,160,0.15)', color: 'rgba(160,130,220,0.4)' }}>
                                                                    No completion photo uploaded for this session.
                                                                </div>
                                                            )}

                                                            {/* Stats row */}
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {[
                                                                    { label: 'DURATION', value: `${Math.floor(session.duration / 60)} min` },
                                                                    { label: 'DISTRACTIONS', value: session.distractionCount, color: session.distractionCount > 3 ? '#ff6666' : '#c084fc' },
                                                                    { label: 'DATE', value: new Date(session.completedAt).toLocaleDateString() },
                                                                ].map(s => (
                                                                    <div key={s.label} className="p-3 rounded-xl text-center"
                                                                        style={{ background: 'rgba(40,15,80,0.2)', border: '1px solid rgba(80,40,160,0.15)' }}>
                                                                        <div className="font-orbitron text-base font-black mb-0.5"
                                                                            style={{ color: (s as any).color || '#c084fc' }}>{s.value}</div>
                                                                        <div className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '8px' }}>{s.label}</div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Delete */}
                                                            <button onClick={() => deleteSession(session.id)}
                                                                className="font-mono text-xs tracking-widest transition-all"
                                                                style={{ color: 'rgba(255,80,80,0.25)' }}
                                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,80,80,0.55)' }}
                                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,80,80,0.25)' }}>
                                                                DELETE THIS SESSION
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}