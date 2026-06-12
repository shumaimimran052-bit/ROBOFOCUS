import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Brain, CheckSquare, Target, Lightbulb, Heart } from 'lucide-react'
import WarpBackground from '../components/ui/background-shaders'
import Sidebar from '../components/ui/Sidebar'

interface Memory {
    id: number
    title: string
    content: string
    type: 'TASK' | 'GOAL' | 'NOTE' | 'INSIGHT' | 'MOOD'
    date: string
    mood: string
    moodImage: string
    aiInsight: string
}

const typeColors: Record<string, string> = {
    TASK: '#00c8ff',
    GOAL: '#a855f7',
    NOTE: '#ff3cac',
    INSIGHT: '#00ff9d',
    MOOD: '#f59e0b',
}

const typeIcons: Record<string, any> = {
    TASK: CheckSquare,
    GOAL: Target,
    NOTE: Brain,
    INSIGHT: Lightbulb,
    MOOD: Heart,
}

const sampleMemories: Memory[] = [
    { id: 1, title: 'Chemistry lab report deadline', content: 'Need to finish chemistry lab report before Friday. Feeling stressed about it.', type: 'TASK', date: '2 days ago', mood: 'Stressed', moodImage: 'https://image.pollinations.ai/prompt/dark%20stormy%20purple%20abstract%20swirls%20anxiety%20moody?width=300&height=200&nologo=true', aiInsight: 'High stress detected. Breaking this into smaller chunks would help.' },
    { id: 2, title: 'Goal: Focus for 25 mins daily', content: 'Set a goal to complete at least one 25-minute focus session every day.', type: 'GOAL', date: '5 days ago', mood: 'Motivated', moodImage: 'https://image.pollinations.ai/prompt/bright%20golden%20energy%20burst%20motivation%20sunrise%20warm?width=300&height=200&nologo=true', aiInsight: 'You have been consistent 4 out of 5 days. Great momentum.' },
    { id: 3, title: 'Email teacher about extension', content: 'Remember to email Mr. Ahmed about getting an extension on the project.', type: 'NOTE', date: '1 week ago', mood: 'Anxious', moodImage: 'https://image.pollinations.ai/prompt/blue%20electric%20nervous%20energy%20lightning%20dark%20background?width=300&height=200&nologo=true', aiInsight: 'You tend to postpone communication tasks. Try doing them first thing.' },
    { id: 4, title: 'Focus peak: 8-10 PM', content: 'Noticed I work best in the evening between 8 and 10 PM when it is quiet.', type: 'INSIGHT', date: '2 weeks ago', mood: 'Calm', moodImage: 'https://image.pollinations.ai/prompt/deep%20ocean%20calm%20night%20stars%20peaceful%20serene%20dark%20blue?width=300&height=200&nologo=true', aiInsight: 'Schedule your hardest tasks during your 8-10 PM peak window.' },
    { id: 5, title: 'Finished biology project!', content: 'Finally completed the biology group project. Feeling really proud and relieved.', type: 'MOOD', date: '3 weeks ago', mood: 'Proud', moodImage: 'https://image.pollinations.ai/prompt/warm%20glowing%20celebration%20golden%20light%20achievement%20victory?width=300&height=200&nologo=true', aiInsight: 'Completion creates momentum. Ride this feeling into your next task.' },
    { id: 6, title: 'Study schedule plan', content: 'Created a weekly study schedule to manage all subjects better.', type: 'GOAL', date: '1 month ago', mood: 'Organised', moodImage: 'https://image.pollinations.ai/prompt/structured%20geometric%20grid%20purple%20organised%20minimal%20clean?width=300&height=200&nologo=true', aiInsight: 'Planning ahead reduces decision fatigue significantly.' },
]

const filters = ['ALL', 'TASK', 'GOAL', 'NOTE', 'INSIGHT', 'MOOD']

export default function MemoryPage() {
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('ALL')
    const [selected, setSelected] = useState<Memory | null>(null)

    const filtered = sampleMemories.filter(m => {
        const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase())
        const matchFilter = activeFilter === 'ALL' || m.type === activeFilter
        return matchSearch && matchFilter
    })

    // Glass cards get stronger blur/dark so they pop against the colorful Warp shader
    const card = {
        background: 'rgba(4, 2, 18, 0.55)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
    }

    return (
        <WarpBackground>
            {/* Full-screen dark overlay to soften the Warp shader behind UI */}
            <div className="fixed inset-0 bg-black/50 -z-[5] pointer-events-none" />

            <div className="flex min-h-screen">
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen">

                    {/* TOPBAR */}
                    <div
                        className="px-8 py-5 flex items-center justify-between flex-wrap gap-4"
                        style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                        }}
                    >
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">
                                MEMORY VAULT
                            </h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(180, 220, 255, 0.5)', fontSize: '11px' }}>
                                ROBOFOCUS HAS{' '}
                                <span style={{ color: 'rgba(168, 85, 247, 0.9)' }}>{sampleMemories.length}</span>
                                {' '}MEMORIES OF YOU
                            </p>
                        </div>
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                                style={{ color: 'rgba(160, 200, 255, 0.4)' }}
                            />
                            <input
                                className="font-mono text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none transition-all w-64"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'rgba(200, 220, 255, 0.8)',
                                    backdropFilter: 'blur(12px)',
                                }}
                                placeholder="Search your memories..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160, 80, 255, 0.6)' }}
                                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255, 255, 255, 0.1)' }}
                            />
                        </div>
                    </div>

                    <div
                        className="flex flex-1 gap-5 px-8 py-5 overflow-hidden"
                        style={{ height: 'calc(100vh - 80px)' }}
                    >

                        {/* LEFT LIST */}
                        <div className="w-72 flex flex-col gap-4 flex-shrink-0">
                            <div className="flex flex-wrap gap-1.5">
                                {filters.map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className="px-2.5 py-1 rounded-full font-mono tracking-widest transition-all"
                                        style={{
                                            background: activeFilter === f ? 'rgba(120, 60, 220, 0.35)' : 'rgba(0, 0, 0, 0.3)',
                                            border: activeFilter === f ? '1px solid rgba(180, 100, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: activeFilter === f ? '#c084fc' : 'rgba(200, 200, 255, 0.35)',
                                            fontSize: '9px',
                                            backdropFilter: 'blur(8px)',
                                        }}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                {filtered.map((memory, i) => {
                                    const Icon = typeIcons[memory.type]
                                    return (
                                        <motion.div
                                            key={memory.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.25, delay: i * 0.04 }}
                                            onClick={() => setSelected(memory)}
                                            className="p-3 rounded-xl cursor-pointer transition-all"
                                            style={{
                                                background: selected?.id === memory.id
                                                    ? 'rgba(100, 40, 200, 0.3)'
                                                    : 'rgba(0, 0, 0, 0.3)',
                                                border: selected?.id === memory.id
                                                    ? '1px solid rgba(160, 80, 255, 0.5)'
                                                    : '1px solid rgba(255, 255, 255, 0.07)',
                                                backdropFilter: 'blur(16px)',
                                                WebkitBackdropFilter: 'blur(16px)',
                                            }}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                        background: `${typeColors[memory.type]}18`,
                                                        border: `1px solid ${typeColors[memory.type]}35`,
                                                    }}
                                                >
                                                    <Icon className="w-3 h-3" style={{ color: typeColors[memory.type] }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-mono text-xs truncate" style={{ color: 'rgba(210, 200, 255, 0.75)' }}>
                                                        {memory.title}
                                                    </div>
                                                    <div className="flex gap-1.5 mt-0.5">
                                                        <span style={{ color: typeColors[memory.type], fontSize: '8px' }} className="font-mono">
                                                            {memory.type}
                                                        </span>
                                                        <span style={{ color: 'rgba(180, 160, 255, 0.3)', fontSize: '8px' }} className="font-mono">
                                                            {memory.date}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* CENTER GALLERY */}
                        <div className="flex-1 rounded-2xl overflow-hidden relative" style={card}>
                            <div className="absolute top-4 left-5 z-10">
                                <span className="font-orbitron tracking-widest" style={{ color: 'rgba(180, 200, 255, 0.3)', fontSize: '8px' }}>
                                    NEURAL ARCHIVE — EMOTIONAL MEMORY MAP
                                </span>
                            </div>
                            <div className="h-full p-5 pt-10 grid grid-cols-3 gap-3 overflow-y-auto content-start">
                                {filtered.map((memory, i) => (
                                    <motion.div
                                        key={memory.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, delay: i * 0.07 }}
                                        onClick={() => setSelected(memory)}
                                        className="relative rounded-xl overflow-hidden cursor-pointer group"
                                        style={{ aspectRatio: '4/3' }}
                                        whileHover={{ scale: 1.03, zIndex: 10 }}
                                    >
                                        <img
                                            src={memory.moodImage}
                                            alt={memory.mood}
                                            className="w-full h-full object-cover"
                                            onError={e => {
                                                (e.currentTarget as HTMLImageElement).src =
                                                    `https://via.placeholder.com/300x200/0a0520/8855cc?text=${memory.type}`
                                            }}
                                        />
                                        <div
                                            className="absolute inset-0"
                                            style={{ background: 'linear-gradient(to top, rgba(4,1,20,0.85) 0%, rgba(4,1,20,0.2) 50%, transparent 100%)' }}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                                            <div className="font-mono text-xs line-clamp-1" style={{ color: 'rgba(210, 195, 255, 0.85)' }}>
                                                {memory.title}
                                            </div>
                                            <div className="flex gap-1.5 mt-0.5">
                                                <span className="font-mono" style={{ color: typeColors[memory.type], fontSize: '8px' }}>
                                                    {memory.type}
                                                </span>
                                                <span className="font-mono" style={{ color: 'rgba(180, 160, 255, 0.4)', fontSize: '8px' }}>
                                                    · {memory.mood}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-purple-400/40 transition-all duration-300" />
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT DETAIL */}
                        <AnimatePresence>
                            {selected && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="rounded-2xl overflow-hidden flex-shrink-0 flex flex-col"
                                    style={{ ...card, width: '260px' }}
                                >
                                    <img
                                        src={selected.moodImage}
                                        alt={selected.mood}
                                        className="w-full object-cover"
                                        style={{ height: '140px' }}
                                        onError={e => {
                                            (e.currentTarget as HTMLImageElement).src =
                                                `https://via.placeholder.com/300x200/0a0520/8855cc?text=${selected.type}`
                                        }}
                                    />
                                    <div className="p-5 flex-1 flex flex-col gap-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span
                                                    className="font-mono px-2 py-0.5 rounded-full"
                                                    style={{
                                                        background: `${typeColors[selected.type]}18`,
                                                        border: `1px solid ${typeColors[selected.type]}35`,
                                                        color: typeColors[selected.type],
                                                        fontSize: '9px',
                                                    }}
                                                >
                                                    {selected.type}
                                                </span>
                                                <div className="font-mono mt-1" style={{ color: 'rgba(180, 160, 255, 0.4)', fontSize: '9px' }}>
                                                    {selected.date} · {selected.mood}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelected(null)}
                                                className="transition-colors"
                                                style={{ color: 'rgba(200, 180, 255, 0.3)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220, 200, 255, 0.7)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200, 180, 255, 0.3)' }}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <div className="font-mono text-sm font-bold mb-1.5" style={{ color: 'rgba(220, 210, 255, 0.85)' }}>
                                                {selected.title}
                                            </div>
                                            <div className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180, 160, 220, 0.6)' }}>
                                                {selected.content}
                                            </div>
                                        </div>
                                        <div
                                            className="mt-auto p-3 rounded-xl"
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.25)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                            }}
                                        >
                                            <div
                                                className="font-orbitron tracking-widest mb-1.5"
                                                style={{ color: 'rgba(160, 200, 255, 0.5)', fontSize: '8px' }}
                                            >
                                                AI INSIGHT
                                            </div>
                                            <div className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180, 160, 220, 0.6)' }}>
                                                {selected.aiInsight}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </WarpBackground>
    )
}