import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const steps = [
    { id: 1, title: "LET'S GET TO KNOW YOU" },
    { id: 2, title: "WHAT ARE YOU WORKING TOWARDS?" },
    { id: 3, title: "LET'S SET YOUR RHYTHM" },
]

const struggles = [
    { icon: '🧠', label: 'I forget things easily' },
    { icon: '🎯', label: "I can't stay focused" },
    { icon: '⏳', label: 'I procrastinate a lot' },
]

const goals = [
    { icon: '🎓', label: 'Student', desc: 'Homework, exams, assignments' },
    { icon: '💼', label: 'Professional', desc: 'Meetings, deadlines, emails' },
    { icon: '🧬', label: 'Personal Growth', desc: 'Habits, health, self-improvement' },
]

const tags = ['Homework', 'Deadlines', 'Emails', 'Exams', 'Projects', 'Self-discipline', 'Daily habits']
const durations = ['15 MIN', '25 MIN', '45 MIN', '60 MIN']

const OnboardingPage = () => {
    const navigate = useNavigate()
    const [step, setStep] = useState(0)
    const [name, setName] = useState('')
    const [age, setAge] = useState('')
    const [selectedStruggles, setSelectedStruggles] = useState<string[]>([])
    const [selectedGoals, setSelectedGoals] = useState<string[]>([])
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [wakeTime, setWakeTime] = useState('07:00')
    const [sleepTime, setSleepTime] = useState('23:00')
    const [focusDuration, setFocusDuration] = useState('25 MIN')

    const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
        setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    }

    const inputClass = "bg-white/5 border border-purple-500/20 text-white text-sm font-mono px-4 py-3 rounded-lg placeholder-white/20 focus:outline-none focus:border-purple-500/60 transition-all duration-300 w-full"

    const cardBase = (active: boolean) => ({
        cursor: 'pointer',
        padding: '16px',
        borderRadius: '12px',
        border: active ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
        transition: 'all 0.2s',
        textAlign: 'left' as const,
    })

    return (
        <div className="min-h-screen bg-[#050008] overflow-hidden flex items-center justify-center"
            style={{
                backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(168,85,247,0.15) 0%, transparent 70%)',
            }}
        >
            {/* Subtle static grid */}
            <div className="fixed inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            <div className="relative z-10 w-full max-w-2xl mx-4 py-8">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div className="font-orbitron text-lg font-black tracking-widest" style={{ color: '#a855f7' }}>
                        ROBO<span style={{ color: '#7c3aed' }}>FOCUS</span>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-white/30 text-xs font-mono tracking-widest hover:text-white/60 transition-colors"
                    >
                        SKIP FOR NOW
                    </button>
                </div>

                {/* PROGRESS */}
                <div className="flex gap-2 mb-8">
                    {steps.map((s, i) => (
                        <div key={s.id} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
                                initial={{ width: '0%' }}
                                animate={{ width: i <= step ? '100%' : '0%' }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    ))}
                </div>

                {/* CARD */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.35 }}
                        className="rounded-2xl p-8"
                        style={{
                            background: 'rgba(10, 5, 20, 0.90)',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            backdropFilter: 'blur(24px)',
                            boxShadow: '0 0 60px rgba(168,85,247,0.08)',
                        }}
                    >
                        <p className="text-white/30 text-xs font-mono tracking-widest mb-2">STEP {step + 1} OF 3</p>
                        <h2 className="font-orbitron text-xl font-black text-white mb-6 tracking-wider">
                            {steps[step].title}
                        </h2>

                        {/* STEP 1 */}
                        {step === 0 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-white/40 text-xs font-mono tracking-widest mb-2 block">YOUR NAME</label>
                                        <input className={inputClass} placeholder="e.g. Alex" value={name} onChange={e => setName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-white/40 text-xs font-mono tracking-widest mb-2 block">YOUR AGE</label>
                                        <input className={inputClass} placeholder="e.g. 20" value={age} onChange={e => setAge(e.target.value)} type="number" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-white/40 text-xs font-mono tracking-widest mb-3 block">YOUR BIGGEST CHALLENGE</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {struggles.map(s => (
                                            <div key={s.label} style={cardBase(selectedStruggles.includes(s.label))} onClick={() => toggle(selectedStruggles, setSelectedStruggles, s.label)}>
                                                <div className="text-2xl mb-2">{s.icon}</div>
                                                <div className="text-white text-xs font-mono leading-tight">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-white/40 text-xs font-mono tracking-widest mb-3 block">MAIN FOCUS AREA</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {goals.map(g => (
                                            <div key={g.label} style={cardBase(selectedGoals.includes(g.label))} onClick={() => toggle(selectedGoals, setSelectedGoals, g.label)}>
                                                <div className="text-2xl mb-2">{g.icon}</div>
                                                <div className="text-white text-xs font-mono font-bold mb-1">{g.label}</div>
                                                <div className="text-white/40 text-xs font-mono leading-tight">{g.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-white/40 text-xs font-mono tracking-widest mb-3 block">WHAT DO YOU NEED HELP WITH?</label>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggle(selectedTags, setSelectedTags, tag)}
                                                className="px-3 py-1.5 rounded-full text-xs font-mono tracking-widest transition-all duration-200"
                                                style={{
                                                    background: selectedTags.includes(tag) ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                                                    border: selectedTags.includes(tag) ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                                                    color: selectedTags.includes(tag) ? '#c084fc' : 'rgba(255,255,255,0.4)',
                                                }}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-white/40 text-xs font-mono tracking-widest mb-2 block">I WAKE UP AT</label>
                                        <input type="time" className={inputClass} value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-white/40 text-xs font-mono tracking-widest mb-2 block">I GO TO SLEEP AT</label>
                                        <input type="time" className={inputClass} value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-white/40 text-xs font-mono tracking-widest mb-3 block">HOW LONG DO YOU LIKE TO FOCUS?</label>
                                    <div className="flex gap-3 flex-wrap">
                                        {durations.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setFocusDuration(d)}
                                                className="px-5 py-3 rounded-lg font-orbitron text-xs tracking-widest transition-all duration-200"
                                                style={{
                                                    background: focusDuration === d ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                                                    border: focusDuration === d ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                                                    color: focusDuration === d ? '#c084fc' : 'rgba(255,255,255,0.4)',
                                                }}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="mt-8 flex justify-between items-center">
                            {step > 0 ? (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="text-white/30 text-xs font-mono tracking-widest hover:text-white/60 transition-colors"
                                >
                                    ← BACK
                                </button>
                            ) : <div />}
                            <button
                                onClick={() => step < 2 ? setStep(step + 1) : navigate('/dashboard')}
                                className="font-orbitron text-xs tracking-widest px-8 py-4 rounded-lg transition-all duration-300"
                                style={{
                                    background: 'rgba(168,85,247,0.15)',
                                    border: '1px solid rgba(168,85,247,0.5)',
                                    color: '#c084fc',
                                    boxShadow: '0 0 20px rgba(168,85,247,0.15)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = '#a855f7'
                                        ; (e.currentTarget as HTMLButtonElement).style.color = '#fff'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.15)'
                                        ; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'
                                }}
                            >
                                {step < 2 ? 'NEXT →' : "LET'S GO →"}
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

export default OnboardingPage