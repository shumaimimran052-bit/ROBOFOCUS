import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import GridGlowBackground from '../components/ui/GridGlowBackground'
import Sidebar from '../components/ui/Sidebar'
import { Brain, Clock, Target, TrendingUp, Trophy, AlertTriangle, Zap, Calendar } from 'lucide-react'

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY

interface FocusSession {
    id: string
    mission: string
    duration: number
    completedAt: string
    status: 'SUCCESS' | 'INCOMPLETE' | 'FAILED'
    distractionCount: number
    completionPhoto?: string
}

interface Task {
    id: number
    name: string
    done: boolean
    category: string
    postponeCount: number
}

const categoryColors: Record<string, string> = {
    SCHOOL: '#00c8ff',
    PERSONAL: '#a855f7',
    WORK: '#ff3cac',
    HEALTH: '#00ff9d',
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
            max_tokens: 150,
            temperature: 0.7,
        })
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

export default function InsightsPage() {
    const [timeRange, setTimeRange] = useState<'THIS WEEK' | 'THIS MONTH' | 'ALL TIME'>('THIS WEEK')
    const [aiSummary, setAiSummary] = useState('')
    const [loadingAI, setLoadingAI] = useState(false)
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview')

    // Load real data
    const sessions: FocusSession[] = JSON.parse(localStorage.getItem('robofocus_sessions') || '[]')
    const tasks: Task[] = JSON.parse(localStorage.getItem('rf_tasks') || '[]')
    const xp: number = parseInt(localStorage.getItem('rf_xp') || '0')
    const mood = JSON.parse(localStorage.getItem('rf_mood') || 'null')

    // Filter sessions by time range
    const getFilteredSessions = () => {
        const now = new Date()
        return sessions.filter(s => {
            const d = new Date(s.completedAt)
            if (timeRange === 'THIS WEEK') {
                const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
                return d >= weekAgo
            }
            if (timeRange === 'THIS MONTH') {
                const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
                return d >= monthAgo
            }
            return true
        })
    }

    const filteredSessions = getFilteredSessions()
    const successSessions = filteredSessions.filter(s => s.status === 'SUCCESS')
    const totalFocusMinutes = filteredSessions.reduce((acc, s) => acc + Math.floor(s.duration / 60), 0)
    const totalFocusHours = (totalFocusMinutes / 60).toFixed(1)
    const totalDistractions = filteredSessions.reduce((acc, s) => acc + s.distractionCount, 0)
    const completionRate = filteredSessions.length > 0
        ? Math.round((successSessions.length / filteredSessions.length) * 100)
        : 0
    const completedTasks = tasks.filter(t => t.done).length
    const postponedTasks = tasks.filter(t => t.postponeCount >= 3).length
    const avgDistractions = filteredSessions.length > 0
        ? (totalDistractions / filteredSessions.length).toFixed(1)
        : '0'

    // Build focus hours by day chart
    const buildFocusChart = () => {
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        const now = new Date()
        return days.map((day, i) => {
            const target = new Date(now)
            target.setDate(target.getDate() - (now.getDay() - 1 - i + 7) % 7)
            const dayStr = target.toDateString()
            const daySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === dayStr)
            const hours = daySessions.reduce((acc, s) => acc + s.duration / 3600, 0)
            return { day, hours: parseFloat(hours.toFixed(2)), sessions: daySessions.length }
        })
    }

    // Build category breakdown from tasks
    const buildCategoryData = () => {
        const cats: Record<string, number> = {}
        tasks.forEach(t => {
            if (!cats[t.category]) cats[t.category] = 0
            cats[t.category]++
        })
        return Object.entries(cats).map(([name, value]) => ({
            name, value, color: categoryColors[name] || '#a855f7'
        }))
    }

    // Build heatmap — last 7 days x 12 hours
    const buildHeatmap = () => {
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        return days.map((day, dayIdx) => {
            const now = new Date()
            const target = new Date(now)
            target.setDate(target.getDate() - (now.getDay() - 1 - dayIdx + 7) % 7)
            const dayStr = target.toDateString()
            return Array.from({ length: 12 }, (_, hourIdx) => {
                const hour = hourIdx + 8
                const hasSessions = sessions.filter(s => {
                    const sd = new Date(s.completedAt)
                    return sd.toDateString() === dayStr && sd.getHours() === hour
                }).length
                return { day, hour, value: Math.min(hasSessions * 2, 4) }
            })
        })
    }

    // Build timeline data for Time Blindness
    const buildTimeline = () => {
        const today = new Date().toDateString()
        const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === today)
        const hours = Array.from({ length: 16 }, (_, i) => {
            const hour = i + 6 // 6am to 10pm
            const sessionsInHour = todaySessions.filter(s => new Date(s.completedAt).getHours() === hour)
            const currentHour = new Date().getHours()
            return {
                hour,
                label: hour <= 12 ? `${hour}AM` : `${hour - 12}PM`,
                sessions: sessionsInHour,
                focusMinutes: sessionsInHour.reduce((a, s) => a + Math.floor(s.duration / 60), 0),
                isPast: hour < currentHour,
                isCurrent: hour === currentHour,
                isFuture: hour > currentHour,
            }
        })
        return hours
    }

    const focusChartData = buildFocusChart()
    const categoryData = buildCategoryData()
    const heatmapData = buildHeatmap()
    const heatmapDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    const heatmapColors = ['rgba(168,85,247,0.04)', 'rgba(168,85,247,0.2)', 'rgba(168,85,247,0.45)', 'rgba(168,85,247,0.7)', 'rgba(168,85,247,0.95)']
    const timelineData = buildTimeline()
    const totalFocusToday = timelineData.reduce((a, h) => a + h.focusMinutes, 0)
    const gapHours = timelineData.filter(h => h.isPast && h.focusMinutes === 0).length

    // AI analysis
    useEffect(() => {
        const generateSummary = async () => {
            setLoadingAI(true)
            const prompt = `You are ROBOFOCUS. Analyse this productivity data for "${timeRange}":
- Focus sessions: ${filteredSessions.length} (${successSessions.length} successful)
- Total focus time: ${totalFocusHours} hours
- Tasks completed: ${completedTasks}
- Avg distractions per session: ${avgDistractions}
- Tasks postponed 3+ times: ${postponedTasks}
- Current mood: ${mood?.mood || 'unknown'}
- XP earned: ${xp}
In 2-3 sentences, give specific actionable insights. Mention their best pattern and one thing to improve. Be direct and encouraging.`
            try {
                const reply = await callAI(prompt)
                setAiSummary(reply)
            } catch {
                const fallbacks = {
                    'THIS WEEK': `You focused ${totalFocusHours} hours this week across ${filteredSessions.length} sessions. ${successSessions.length > 0 ? `${successSessions.length} sessions marked as successful.` : 'Try completing a task before marking a session done.'} ${postponedTasks > 0 ? `You have ${postponedTasks} tasks being repeatedly avoided — use the Mission Planner to break them down.` : 'Good job staying on top of tasks.'}`,
                    'THIS MONTH': `Monthly stats show ${totalFocusHours} hours of focused work. Completion rate is ${completionRate}%. Keep building the habit.`,
                    'ALL TIME': `Total: ${totalFocusHours} hours focused, ${completedTasks} tasks completed, ${xp} XP earned. You're building real momentum.`,
                }
                setAiSummary(fallbacks[timeRange])
            }
            setLoadingAI(false)
        }
        generateSummary()
    }, [timeRange])

    const cardStyle = {
        background: 'rgba(10, 5, 20, 0.78)',
        border: '1px solid rgba(168, 85, 247, 0.15)',
        backdropFilter: 'blur(16px)',
    }

    const tooltipStyle = {
        backgroundColor: 'rgba(10,5,20,0.95)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: '8px',
        color: '#c084fc',
        fontFamily: 'Space Mono, monospace',
        fontSize: '11px',
    }

    const tabStyle = (active: boolean) => ({
        background: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#c084fc' : 'rgba(255,255,255,0.3)',
    })

    const stats = [
        { label: 'FOCUS HOURS', value: totalFocusHours, icon: Clock, color: '#c084fc' },
        { label: 'SESSIONS', value: filteredSessions.length, icon: Target, color: '#00c8ff' },
        { label: 'SUCCESS RATE', value: `${completionRate}%`, icon: Trophy, color: '#00cc60' },
        { label: 'DISTRACTIONS', value: totalDistractions, icon: AlertTriangle, color: '#ff3cac' },
        { label: 'TASKS DONE', value: completedTasks, icon: TrendingUp, color: '#00cc60' },
        { label: 'XP EARNED', value: xp, icon: Zap, color: '#f59e0b' },
    ]

    return (
        <GridGlowBackground>
            <Sidebar />
            <div className="pl-14 min-h-screen w-full">

                {/* TOPBAR */}
                <div className="px-8 py-5 border-b border-purple-500/10 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="font-orbitron text-sm font-bold tracking-widest text-white">INSIGHTS</h1>
                        <p className="text-white/30 text-xs font-mono mt-1">Real data from your sessions</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex gap-2">
                            {(['THIS WEEK', 'THIS MONTH', 'ALL TIME'] as const).map(r => (
                                <button key={r} onClick={() => setTimeRange(r)}
                                    className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all duration-200"
                                    style={tabStyle(timeRange === r)}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('overview')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all duration-200"
                                style={tabStyle(activeTab === 'overview')}>
                                <TrendingUp className="w-3.5 h-3.5" />
                                OVERVIEW
                            </button>
                            <button onClick={() => setActiveTab('timeline')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all duration-200"
                                style={tabStyle(activeTab === 'timeline')}>
                                <Calendar className="w-3.5 h-3.5" />
                                TIME MAP
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 space-y-6">

                    {/* AI SUMMARY */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-5" style={{ ...cardStyle, borderLeft: '3px solid #a855f7' }}>
                        <div className="font-orbitron text-xs tracking-widest mb-3" style={{ color: '#a855f7', fontSize: '9px' }}>
                            ROBOFOCUS ANALYSIS
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)' }}>
                                <Brain className="w-4 h-4" style={{ color: '#a855f7' }} />
                            </div>
                            {loadingAI ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
                                        style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                                    <span className="font-mono text-xs text-white/30">Analysing your data...</span>
                                </div>
                            ) : (
                                <p className="text-white/60 text-sm font-mono leading-relaxed">{aiSummary}</p>
                            )}
                        </div>
                    </motion.div>

                    {/* STATS GRID */}
                    <div className="grid grid-cols-6 gap-3">
                        {stats.map((s, i) => (
                            <motion.div key={s.label}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                className="rounded-xl p-4 text-center" style={cardStyle}>
                                <div className="font-orbitron text-2xl font-black mb-1"
                                    style={{ color: s.color, textShadow: `0 0 15px ${s.color}60` }}>{s.value}</div>
                                <div className="text-white/30 font-mono tracking-widest" style={{ fontSize: '8px' }}>{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <>
                            {/* CHARTS ROW */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2 rounded-xl p-5" style={cardStyle}>
                                    <div className="font-orbitron text-xs tracking-widest text-white/40 mb-4">FOCUS HOURS THIS WEEK</div>
                                    {focusChartData.some(d => d.hours > 0) ? (
                                        <ResponsiveContainer width="100%" height={180}>
                                            <AreaChart data={focusChartData}>
                                                <defs>
                                                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Area type="monotone" dataKey="hours" stroke="#a855f7" strokeWidth={2} fill="url(#focusGrad)"
                                                    dot={{ fill: '#a855f7', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#c084fc' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-40 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="font-mono text-sm text-white/20 mb-2">No focus sessions yet this week</div>
                                                <button onClick={() => window.location.href = '/focus'}
                                                    className="font-orbitron text-xs tracking-widest px-4 py-2 rounded-xl transition-all"
                                                    style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc' }}>
                                                    START A SESSION →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl p-5" style={cardStyle}>
                                    <div className="font-orbitron text-xs tracking-widest text-white/40 mb-4">TASK CATEGORIES</div>
                                    {categoryData.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={130}>
                                                <PieChart>
                                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value">
                                                        {categoryData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} opacity={0.85} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={tooltipStyle} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="space-y-1 mt-2">
                                                {categoryData.map(c => (
                                                    <div key={c.name} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                                                            <span className="text-white/40 text-xs font-mono">{c.name}</span>
                                                        </div>
                                                        <span className="text-white/50 text-xs font-mono">{c.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-32 flex items-center justify-center">
                                            <span className="font-mono text-sm text-white/20">No tasks yet</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SESSION LIST */}
                            {filteredSessions.length > 0 && (
                                <div className="rounded-xl p-5" style={cardStyle}>
                                    <div className="font-orbitron text-xs tracking-widest text-white/40 mb-4">
                                        RECENT SESSIONS ({filteredSessions.length})
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {filteredSessions.slice(0, 10).map(s => (
                                            <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl"
                                                style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)' }}>
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0`}
                                                    style={{ background: s.status === 'SUCCESS' ? '#00cc60' : '#ff3cac' }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-mono text-xs truncate" style={{ color: 'rgba(200,185,255,0.75)' }}>
                                                        {s.mission}
                                                    </div>
                                                    <div className="font-mono" style={{ color: 'rgba(120,90,180,0.4)', fontSize: '9px' }}>
                                                        {Math.floor(s.duration / 60)} min · {s.distractionCount} distractions · {new Date(s.completedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                {s.completionPhoto && (
                                                    <img src={s.completionPhoto} alt="proof"
                                                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                                        style={{ border: '1px solid rgba(168,85,247,0.3)' }} />
                                                )}
                                                <span className="font-orbitron px-2 py-1 rounded-lg flex-shrink-0"
                                                    style={{
                                                        fontSize: '8px',
                                                        background: s.status === 'SUCCESS' ? 'rgba(0,200,80,0.1)' : 'rgba(255,60,60,0.1)',
                                                        border: s.status === 'SUCCESS' ? '1px solid rgba(0,200,80,0.3)' : '1px solid rgba(255,60,60,0.3)',
                                                        color: s.status === 'SUCCESS' ? 'rgba(0,220,100,0.7)' : 'rgba(255,80,80,0.7)',
                                                    }}>
                                                    {s.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* HEATMAP */}
                            <div className="rounded-xl p-5" style={cardStyle}>
                                <div className="font-orbitron text-xs tracking-widest text-white/40 mb-4">
                                    FOCUS HEATMAP — WEEKLY
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex flex-col gap-1 justify-center">
                                        {heatmapDays.map(d => (
                                            <div key={d} className="text-white/20 text-xs font-mono w-8 text-right"
                                                style={{ height: '24px', lineHeight: '24px' }}>{d}</div>
                                        ))}
                                    </div>
                                    <div className="flex-1">
                                        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <div key={i} className="text-white/20 text-center" style={{ fontSize: '8px' }}>
                                                    {i + 8}h
                                                </div>
                                            ))}
                                        </div>
                                        {heatmapData.map((row, dayIdx) => (
                                            <div key={dayIdx} className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                                                {row.map((cell, hourIdx) => (
                                                    <div key={hourIdx} className="rounded-sm"
                                                        style={{
                                                            height: '20px',
                                                            background: heatmapColors[cell.value] || heatmapColors[0],
                                                            border: '1px solid rgba(168,85,247,0.08)',
                                                        }}
                                                        title={`${heatmapDays[dayIdx]} ${hourIdx + 8}:00 — ${cell.value > 0 ? cell.value * 15 + ' min focus' : 'no data'}`}
                                                    />
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 mt-3 justify-end">
                                            <span className="font-mono text-white/20" style={{ fontSize: '9px' }}>LESS</span>
                                            {heatmapColors.map((c, i) => (
                                                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                                            ))}
                                            <span className="font-mono text-white/20" style={{ fontSize: '9px' }}>MORE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'timeline' && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            className="space-y-5">

                            {/* TIME BLINDNESS HEADER */}
                            <div className="rounded-xl p-5" style={{ ...cardStyle, borderLeft: '3px solid rgba(168,85,247,0.5)' }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)' }}>
                                        <Clock className="w-5 h-5" style={{ color: '#a855f7' }} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-orbitron text-sm font-black text-white mb-1">TIME BLINDNESS MAP</div>
                                        <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180,155,255,0.55)' }}>
                                            See exactly where your day went. Green = focused work. Grey = time unaccounted for. This is your day visualized.
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-orbitron text-xl font-black" style={{ color: '#c084fc' }}>
                                            {totalFocusToday}m
                                        </div>
                                        <div className="font-mono" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '9px' }}>
                                            FOCUSED TODAY
                                        </div>
                                    </div>
                                </div>
                                {gapHours > 0 && (
                                    <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl"
                                        style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.2)' }}>
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,160,40,0.6)' }} />
                                        <span className="font-mono text-xs" style={{ color: 'rgba(255,180,80,0.6)' }}>
                                            You have {gapHours} unaccounted hours today. What happened in those gaps?
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* TIMELINE VISUALIZATION */}
                            <div className="rounded-xl p-6" style={cardStyle}>
                                <div className="font-orbitron text-xs tracking-widest text-white/40 mb-6">TODAY'S TIME MAP</div>
                                <div className="space-y-2">
                                    {timelineData.map((block, i) => {
                                        const hasFocus = block.focusMinutes > 0
                                        const barWidth = hasFocus ? Math.min((block.focusMinutes / 60) * 100, 100) : 0
                                        const isNow = block.isCurrent

                                        return (
                                            <motion.div key={block.hour}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="flex items-center gap-4"
                                            >
                                                {/* Hour label */}
                                                <div className="w-12 text-right flex-shrink-0">
                                                    <span className="font-mono" style={{
                                                        color: isNow ? '#c084fc' : block.isPast ? 'rgba(200,185,255,0.5)' : 'rgba(160,130,220,0.25)',
                                                        fontSize: '10px',
                                                        fontWeight: isNow ? 'bold' : 'normal',
                                                    }}>
                                                        {block.label}
                                                    </span>
                                                </div>

                                                {/* Bar track */}
                                                <div className="flex-1 h-8 rounded-xl relative overflow-hidden"
                                                    style={{
                                                        background: block.isFuture ? 'rgba(60,20,120,0.08)' :
                                                            hasFocus ? 'rgba(168,85,247,0.08)' :
                                                                isNow ? 'rgba(255,255,255,0.04)' :
                                                                    'rgba(255,255,255,0.03)',
                                                        border: isNow ? '1px solid rgba(168,85,247,0.4)' :
                                                            hasFocus ? '1px solid rgba(168,85,247,0.2)' :
                                                                '1px solid rgba(255,255,255,0.04)',
                                                    }}>

                                                    {/* Focus bar */}
                                                    {hasFocus && (
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${barWidth}%` }}
                                                            transition={{ duration: 0.6, delay: i * 0.04 }}
                                                            className="absolute left-0 top-0 bottom-0 rounded-xl"
                                                            style={{
                                                                background: block.sessions.some(s => s.status === 'SUCCESS')
                                                                    ? 'linear-gradient(90deg, rgba(0,200,80,0.3), rgba(0,200,80,0.15))'
                                                                    : 'linear-gradient(90deg, rgba(168,85,247,0.35), rgba(168,85,247,0.15))',
                                                                borderRight: '2px solid rgba(168,85,247,0.5)',
                                                            }}
                                                        />
                                                    )}

                                                    {/* Now indicator */}
                                                    {isNow && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <motion.div
                                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                                className="font-orbitron"
                                                                style={{ color: '#c084fc', fontSize: '8px', letterSpacing: '2px' }}>
                                                                NOW
                                                            </motion.div>
                                                        </div>
                                                    )}

                                                    {/* Session details inside bar */}
                                                    {hasFocus && (
                                                        <div className="absolute inset-0 flex items-center px-3">
                                                            <span className="font-mono" style={{ color: 'rgba(200,185,255,0.7)', fontSize: '9px' }}>
                                                                {block.focusMinutes}m focused
                                                                {block.sessions.length > 0 && ` · "${block.sessions[0].mission.slice(0, 25)}${block.sessions[0].mission.length > 25 ? '...' : ''}"`}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Gap indicator */}
                                                    {block.isPast && !hasFocus && !isNow && (
                                                        <div className="absolute inset-0 flex items-center px-3">
                                                            <span className="font-mono" style={{ color: 'rgba(255,255,255,0.1)', fontSize: '9px' }}>
                                                                — untracked
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Session status dots */}
                                                <div className="w-16 flex items-center gap-1 flex-shrink-0">
                                                    {block.sessions.map(s => (
                                                        <div key={s.id} className="w-2 h-2 rounded-full"
                                                            style={{ background: s.status === 'SUCCESS' ? '#00cc60' : 'rgba(255,80,80,0.6)' }}
                                                            title={`${s.mission} — ${s.status}`} />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="flex items-center gap-6 mt-6 pt-4" style={{ borderTop: '1px solid rgba(168,85,247,0.08)' }}>
                                    {[
                                        { color: 'rgba(0,200,80,0.4)', label: 'Successful session' },
                                        { color: 'rgba(168,85,247,0.35)', label: 'Focus session' },
                                        { color: 'rgba(255,255,255,0.06)', label: 'Untracked time' },
                                        { color: 'rgba(60,20,120,0.08)', label: 'Future' },
                                    ].map(l => (
                                        <div key={l.label} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded" style={{ background: l.color }} />
                                            <span className="font-mono" style={{ color: 'rgba(160,130,220,0.4)', fontSize: '9px' }}>{l.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PRODUCTIVITY SCORE */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    {
                                        label: 'PRODUCTIVITY SCORE',
                                        value: sessions.length === 0 ? '—' : `${Math.min(Math.round((totalFocusToday / 120) * 100), 100)}%`,
                                        desc: totalFocusToday === 0 ? 'No sessions today' : totalFocusToday < 60 ? 'Keep going!' : totalFocusToday < 120 ? 'Good progress' : 'Excellent day!',
                                        color: totalFocusToday >= 120 ? '#00cc60' : totalFocusToday >= 60 ? '#f59e0b' : '#a855f7',
                                    },
                                    {
                                        label: 'TIME ACCOUNTED',
                                        value: `${Math.round((timelineData.filter(h => h.isPast && h.focusMinutes > 0).length / Math.max(timelineData.filter(h => h.isPast).length, 1)) * 100)}%`,
                                        desc: `${timelineData.filter(h => h.isPast && h.focusMinutes > 0).length} of ${timelineData.filter(h => h.isPast).length} past hours`,
                                        color: '#00c8ff',
                                    },
                                    {
                                        label: 'DISTRACTION RATE',
                                        value: filteredSessions.length > 0 ? avgDistractions : '—',
                                        desc: 'avg per session',
                                        color: parseFloat(avgDistractions) > 3 ? '#ff3cac' : parseFloat(avgDistractions) > 1 ? '#f59e0b' : '#00cc60',
                                    },
                                ].map(item => (
                                    <div key={item.label} className="rounded-xl p-5 text-center" style={cardStyle}>
                                        <div className="font-orbitron text-3xl font-black mb-1"
                                            style={{ color: item.color, textShadow: `0 0 20px ${item.color}50` }}>
                                            {item.value}
                                        </div>
                                        <div className="font-orbitron tracking-widest mb-1" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '8px' }}>
                                            {item.label}
                                        </div>
                                        <div className="font-mono" style={{ color: 'rgba(140,100,220,0.35)', fontSize: '9px' }}>
                                            {item.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </div>
            </div>
        </GridGlowBackground>
    )
}