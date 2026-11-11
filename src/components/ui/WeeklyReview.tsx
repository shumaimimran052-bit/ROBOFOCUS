import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RotateCcw } from 'lucide-react'
import { askAI, dateKey, getActiveDaySet, getStreakInfo, getTaskLog, readSessions, readTasks } from '../../lib/robofocus'

interface ReviewText {
    wins: string
    pattern: string
    next: string
    source: 'ai' | 'local'
}

interface WeekData {
    labels: string[]
    minutesPerDay: number[]
    focusMinutes: number
    prevFocusMinutes: number
    sessions: number
    successful: number
    distractions: number
    activeDays: number
    tasksDone: number
    bestDay: string
    bestPart: string
    stuckTasks: string[]
    streak: number
    rangeLabel: string
}

const cardStyle = {
    background: 'rgba(10, 5, 20, 0.78)',
    border: '1px solid rgba(168, 85, 247, 0.15)',
    backdropFilter: 'blur(16px)',
}

const fmtMin = (m: number): string => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`)

const partOfDay = (hour: number): string => {
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 22) return 'evening'
    return 'night'
}

const buildWeek = (): WeekData => {
    const sessions = readSessions()
    const today = new Date()
    const days: Date[] = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        days.push(d)
    }
    const keys = days.map(d => dateKey(d))
    const prevKeys: string[] = []
    for (let i = 13; i >= 7; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        prevKeys.push(dateKey(d))
    }

    const inWeek = sessions.filter(s => keys.includes(dateKey(new Date(s.completedAt))))
    const inPrev = sessions.filter(s => prevKeys.includes(dateKey(new Date(s.completedAt))))
    const minutesPerDay = keys.map(k =>
        sessions
            .filter(s => dateKey(new Date(s.completedAt)) === k)
            .reduce((a, s) => a + Math.floor(s.duration / 60), 0)
    )
    const focusMinutes = minutesPerDay.reduce((a, b) => a + b, 0)
    const prevFocusMinutes = inPrev.reduce((a, s) => a + Math.floor(s.duration / 60), 0)

    let bestIdx = 0
    minutesPerDay.forEach((m, i) => { if (m > minutesPerDay[bestIdx]) bestIdx = i })

    const parts: Record<string, number> = {}
    inWeek.forEach(s => {
        const p = partOfDay(new Date(s.completedAt).getHours())
        parts[p] = (parts[p] || 0) + Math.floor(s.duration / 60)
    })
    const bestPart = Object.entries(parts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

    const active = getActiveDaySet()
    const log = getTaskLog()
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return {
        labels: days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()),
        minutesPerDay,
        focusMinutes,
        prevFocusMinutes,
        sessions: inWeek.length,
        successful: inWeek.filter(s => s.status === 'SUCCESS').length,
        distractions: inWeek.reduce((a, s) => a + (s.distractionCount || 0), 0),
        activeDays: keys.filter(k => active.has(k)).length,
        tasksDone: keys.reduce((a, k) => a + (log[k] || 0), 0),
        bestDay: focusMinutes > 0 ? days[bestIdx].toLocaleDateString('en-US', { weekday: 'long' }) : '',
        bestPart,
        stuckTasks: readTasks().filter(t => !t.done && t.postponeCount >= 3).map(t => t.name).slice(0, 3),
        streak: getStreakInfo().current,
        rangeLabel: `${fmt(days[0])} – ${fmt(days[6])}`,
    }
}

const localReview = (w: WeekData): ReviewText => {
    const rate = w.sessions > 0 ? Math.round((w.successful / w.sessions) * 100) : 0
    let wins = 'A fresh week is a clean slate. One short focus session is all it takes to get moving.'
    if (w.sessions > 0 || w.tasksDone > 0) {
        const bits: string[] = []
        if (w.focusMinutes > 0) bits.push(`${fmtMin(w.focusMinutes)} of focus across ${w.sessions} session${w.sessions === 1 ? '' : 's'}`)
        if (w.successful > 0) bits.push(`${w.successful} successful (${rate}%)`)
        if (w.tasksDone > 0) bits.push(`${w.tasksDone} mission${w.tasksDone === 1 ? '' : 's'} completed`)
        wins = `${bits.join(', ')}. You showed up on ${w.activeDays} of 7 days.`
    }
    let pattern = 'Not enough data yet to see a pattern. Use Focus Mode a few times and this will fill in.'
    if (w.bestDay) {
        pattern = `Your strongest day was ${w.bestDay}${w.bestPart ? ` and you focus best in the ${w.bestPart}` : ''}.`
        if (w.stuckTasks.length > 0) pattern += ` "${w.stuckTasks[0]}" keeps getting postponed.`
    }
    let next = 'Aim for one focus session on 3 different days.'
    if (w.stuckTasks.length > 0) next = `Break "${w.stuckTasks[0]}" into tiny steps in the Mission Planner and do the first step early.`
    else if (w.bestPart) next = `Protect your ${w.bestPart} for the hardest task of the day.`
    return { wins, pattern, next, source: 'local' }
}

const parseAI = (text: string): ReviewText | null => {
    const grab = (label: string): string => {
        const m = text.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'))
        return m ? m[1].trim() : ''
    }
    const wins = grab('WINS')
    const pattern = grab('PATTERN')
    const next = grab('NEXT WEEK')
    if (!wins || !pattern || !next) return null
    return { wins, pattern, next, source: 'ai' }
}

export default function WeeklyReview() {
    const [week] = useState<WeekData>(() => buildWeek())
    const [review, setReview] = useState<ReviewText | null>(null)
    const [loading, setLoading] = useState(false)

    const generate = async (force: boolean) => {
        const today = dateKey()
        if (!force) {
            try {
                const cached = JSON.parse(localStorage.getItem('rf_weekly_review') || 'null')
                if (cached && cached.day === today && cached.review) {
                    setReview(cached.review as ReviewText)
                    return
                }
            } catch { /* ignore bad cache */ }
        }
        setLoading(true)
        let result = localReview(week)
        if (week.sessions > 0 || week.tasksDone > 0) {
            try {
                const prompt = `You are ROBOFOCUS, a warm, direct coach for people with ADHD. Data for the last 7 days:
- Focus time: ${fmtMin(week.focusMinutes)} (previous week: ${fmtMin(week.prevFocusMinutes)})
- Sessions: ${week.sessions}, successful: ${week.successful}, distractions: ${week.distractions}
- Missions completed: ${week.tasksDone}
- Active days: ${week.activeDays} of 7, current streak: ${week.streak}
- Best day: ${week.bestDay || 'none'}, best time of day: ${week.bestPart || 'unknown'}
- Tasks postponed 3+ times: ${week.stuckTasks.join(', ') || 'none'}
Reply in EXACTLY this format, one line each, max 25 words per line, no other text:
WINS: <what went well>
PATTERN: <one pattern you notice>
NEXT WEEK: <one specific suggestion>`
                const parsed = parseAI(await askAI(prompt, 220))
                if (parsed) result = parsed
            } catch { /* fall back to local review */ }
        }
        setReview(result)
        if (result.source === 'ai') {
            try { localStorage.setItem('rf_weekly_review', JSON.stringify({ day: today, review: result })) } catch { /* ignore */ }
        }
        setLoading(false)
    }

    useEffect(() => { generate(false) }, [])

    const delta = week.prevFocusMinutes > 0
        ? Math.round(((week.focusMinutes - week.prevFocusMinutes) / week.prevFocusMinutes) * 100)
        : null
    const maxMin = Math.max(...week.minutesPerDay, 1)

    const stats = [
        { label: 'FOCUS TIME', value: fmtMin(week.focusMinutes), sub: delta === null ? 'no data last week' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs last week`, color: '#c084fc' },
        { label: 'SESSIONS', value: String(week.sessions), sub: `${week.successful} successful`, color: '#00c8ff' },
        { label: 'ACTIVE DAYS', value: `${week.activeDays}/7`, sub: `${week.streak} day streak`, color: '#f59e0b' },
        { label: 'MISSIONS DONE', value: String(week.tasksDone), sub: 'counted from 2.0 on', color: '#00cc60' },
    ]

    const blocks = review ? [
        { label: 'WINS', text: review.wins, color: '#00cc60' },
        { label: 'PATTERN', text: review.pattern, color: '#c084fc' },
        { label: 'NEXT WEEK', text: review.next, color: '#ff3cac' },
    ] : []

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-xl p-5" style={{ ...cardStyle, borderLeft: '3px solid rgba(168,85,247,0.5)' }}>
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)' }}>
                        <Sparkles className="w-5 h-5" style={{ color: '#a855f7' }} />
                    </div>
                    <div className="flex-1">
                        <div className="font-orbitron text-sm font-black text-white mb-1">WEEKLY REVIEW</div>
                        <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180,155,255,0.55)' }}>
                            {week.rangeLabel} · your last 7 days, summarised by ROBOFOCUS
                        </p>
                    </div>
                    <button
                        onClick={() => generate(true)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.3)', color: 'rgba(192,132,252,0.7)', opacity: loading ? 0.5 : 1 }}
                    >
                        <RotateCcw className="w-3 h-3" />
                        REFRESH
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="rounded-xl p-4 text-center" style={cardStyle}>
                        <div className="font-orbitron text-2xl font-black mb-1" style={{ color: s.color, textShadow: `0 0 15px ${s.color}60` }}>{s.value}</div>
                        <div className="text-white/30 font-mono tracking-widest" style={{ fontSize: '8px' }}>{s.label}</div>
                        <div className="font-mono mt-1" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="rounded-xl p-5" style={cardStyle}>
                <div className="font-orbitron text-xs tracking-widest text-white/40 mb-4">FOCUS MINUTES PER DAY</div>
                <div className="flex items-end gap-3" style={{ height: '110px' }}>
                    {week.minutesPerDay.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                            <span className="font-mono" style={{ color: 'rgba(200,185,255,0.5)', fontSize: '9px' }}>{m > 0 ? m : ''}</span>
                            <div className="w-full rounded-md"
                                style={{
                                    height: `${Math.max((m / maxMin) * 70, m > 0 ? 6 : 2)}px`,
                                    background: m > 0 ? 'linear-gradient(180deg, rgba(168,85,247,0.8), rgba(168,85,247,0.25))' : 'rgba(255,255,255,0.05)',
                                }} />
                            <span className="font-mono text-white/30" style={{ fontSize: '9px' }}>{week.labels[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {loading || !review ? (
                <div className="rounded-xl p-5 flex items-center gap-2" style={cardStyle}>
                    <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
                        style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                    <span className="font-mono text-xs text-white/30">Writing your weekly review...</span>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4">
                    {blocks.map(b => (
                        <div key={b.label} className="rounded-xl p-5" style={{ ...cardStyle, borderTop: `2px solid ${b.color}55` }}>
                            <div className="font-orbitron tracking-widest mb-2" style={{ color: b.color, fontSize: '9px' }}>{b.label}</div>
                            <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(210,195,255,0.7)' }}>{b.text}</p>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}