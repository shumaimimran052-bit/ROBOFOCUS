import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Zap, X } from 'lucide-react'
import { pickNudge, logNudgeShown, snoozeNudges, sendBrowserNotification } from '../../lib/robofocus'
import type { Nudge } from '../../lib/robofocus'

// Nudges only appear on these pages. Focus Mode, Focus History, Assistant and
// Body Double are left out on purpose so nothing can interrupt them.
const NUDGE_PAGES = ['/dashboard', '/braindump', '/mission', '/memory', '/insights', '/settings']

export default function NudgeBanner() {
    const location = useLocation()
    const navigate = useNavigate()
    const [nudge, setNudge] = useState<Nudge | null>(null)
    const nudgeRef = useRef<Nudge | null>(null)
    const allowed = NUDGE_PAGES.includes(location.pathname)

    useEffect(() => {
        if (!allowed) return
        const check = () => {
            if (nudgeRef.current) return
            const found = pickNudge()
            if (!found) return
            nudgeRef.current = found
            logNudgeShown(found.id)
            sendBrowserNotification(found.message)
            setNudge(found)
        }
        const first = window.setTimeout(check, 4000)
        const interval = window.setInterval(check, 60000)
        return () => {
            window.clearTimeout(first)
            window.clearInterval(interval)
        }
    }, [allowed, location.pathname])

    const close = () => {
        nudgeRef.current = null
        setNudge(null)
    }

    return (
        <AnimatePresence>
            {allowed && nudge && (
                <motion.div
                    key={nudge.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    className="fixed rounded-2xl p-4"
                    style={{
                        left: '72px',
                        bottom: '24px',
                        width: '320px',
                        zIndex: 60,
                        background: 'rgba(4, 2, 16, 0.92)',
                        border: '1px solid rgba(255,60,172,0.3)',
                        borderLeft: '3px solid rgba(255,60,172,0.6)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 0 30px rgba(255,60,172,0.12)',
                    }}
                >
                    <button
                        onClick={close}
                        className="absolute top-3 right-3"
                        style={{ color: 'rgba(255,100,200,0.4)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,200,0.8)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,200,0.4)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3 h-3" style={{ color: 'rgba(255,60,172,0.6)' }} />
                        <span className="font-orbitron tracking-widest" style={{ color: 'rgba(255,60,172,0.55)', fontSize: '8px' }}>
                            ROBOFOCUS NUDGE
                        </span>
                    </div>
                    <p className="font-mono text-xs leading-relaxed mb-3 pr-4" style={{ color: 'rgba(210,195,255,0.7)' }}>
                        {nudge.message}
                    </p>
                    <div className="flex gap-2">
                        {nudge.action && (
                            <button
                                onClick={() => { const path = nudge.action!.path; close(); navigate(path) }}
                                className="flex-1 py-2 font-mono text-xs tracking-widest rounded-xl transition-all"
                                style={{ background: 'rgba(200,30,100,0.1)', border: '1px solid rgba(255,60,172,0.25)', color: 'rgba(255,100,180,0.75)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,30,100,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff3cac' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,30,100,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,180,0.75)' }}
                            >
                                {nudge.action.label}
                            </button>
                        )}
                        <button
                            onClick={() => { snoozeNudges(60); close() }}
                            className="flex-1 py-2 font-mono text-xs tracking-widest rounded-xl transition-all"
                            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(180,160,220,0.35)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,160,220,0.7)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,160,220,0.35)' }}
                        >
                            SNOOZE 1H
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}