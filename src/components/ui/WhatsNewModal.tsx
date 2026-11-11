import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

const SEEN_KEY = 'rf_seen_v2'

const FEATURES = [
    { icon: '🔔', title: 'Smart Nudges', desc: 'Gentle reminders for postponed tasks, deadlines and streaks.' },
    { icon: '🔥', title: 'Streaks + Daily Quests', desc: 'Keep a real streak and claim bonus XP every day.' },
    { icon: '📊', title: 'Weekly Review', desc: 'An AI summary of your week on the Insights page.' },
    { icon: '🤝', title: 'Body Double', desc: 'Work alongside ROBOFOCUS with quiet check-ins.' },
]

export default function WhatsNewModal() {
    const location = useLocation()
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (location.pathname !== '/dashboard') return
        let seen = false
        try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* ignore */ }
        if (seen) return
        const timer = window.setTimeout(() => setOpen(true), 1200)
        return () => window.clearTimeout(timer)
    }, [location.pathname])

    const close = () => {
        try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
        setOpen(false)
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 70, background: 'rgba(2,0,10,0.85)', backdropFilter: 'blur(8px)' }}
                >
                    <motion.div
                        initial={{ scale: 0.92, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.92, y: 20 }}
                        className="rounded-2xl p-8 w-full max-w-md mx-4 relative"
                        style={{ background: 'rgba(6,2,20,0.97)', border: '1px solid rgba(140,60,240,0.3)', boxShadow: '0 0 60px rgba(120,50,220,0.25)' }}
                    >
                        <button onClick={close} className="absolute top-4 right-4" style={{ color: 'rgba(160,130,220,0.5)' }}>
                            <X className="w-5 h-5" />
                        </button>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
                            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)' }}>
                            <span className="font-orbitron tracking-widest" style={{ color: '#c084fc', fontSize: '9px' }}>NEW</span>
                        </div>
                        <div className="font-orbitron text-xl font-black text-white mb-1">ROBOFOCUS 2.0</div>
                        <p className="font-mono text-xs mb-6" style={{ color: 'rgba(160,130,220,0.6)' }}>
                            Four new ways to get started and keep going.
                        </p>
                        <div className="space-y-3 mb-6">
                            {FEATURES.map(f => (
                                <div key={f.title} className="flex items-start gap-3">
                                    <span style={{ fontSize: '20px' }}>{f.icon}</span>
                                    <div>
                                        <div className="font-orbitron" style={{ color: '#c084fc', fontSize: '10px' }}>{f.title}</div>
                                        <div className="font-mono" style={{ color: 'rgba(200,185,255,0.6)', fontSize: '11px' }}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={close}
                            className="w-full py-3 font-orbitron text-xs tracking-widest rounded-full transition-all"
                            style={{ background: '#f3e8ff', color: '#2e1065' }}
                        >
                            GOT IT
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}