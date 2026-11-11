import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { getQuests, getStreakInfo, claimQuest } from '../../lib/robofocus'

interface QuestsCardProps {
    onXp: (amount: number, label: string) => void
}

export default function QuestsCard({ onXp }: QuestsCardProps) {
    const [, setTick] = useState(0)
    const quests = getQuests()
    const streak = getStreakInfo()
    const claimedCount = quests.filter(q => q.claimed).length

    const claim = (id: string, label: string) => {
        const xp = claimQuest(id)
        if (xp > 0) onXp(xp, `Quest: ${label} +${xp} XP`)
        setTick(t => t + 1)
    }

    return (
        <div
            className="rounded-2xl p-5"
            style={{
                background: 'rgba(4, 2, 16, 0.82)',
                border: '1px solid rgba(100, 50, 200, 0.2)',
                backdropFilter: 'blur(20px)',
                borderTop: '2px solid rgba(245,158,11,0.35)',
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="font-orbitron tracking-widest" style={{ color: 'rgba(140,100,220,0.45)', fontSize: '9px' }}>
                    DAILY QUESTS
                </span>
                <span className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>
                    {claimedCount}/{quests.length} CLAIMED
                </span>
            </div>

            <div
                className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}
            >
                <div className="flex items-center gap-2">
                    <span style={{ fontSize: '18px' }}>🔥</span>
                    <div>
                        <div className="font-orbitron font-black" style={{ color: '#f59e0b', fontSize: '14px' }}>
                            {streak.current} DAY STREAK
                        </div>
                        <div className="font-mono" style={{ color: 'rgba(245,158,11,0.5)', fontSize: '9px' }}>
                            {streak.activeToday ? 'Today is locked in' : 'Do one thing today to keep it'}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-orbitron" style={{ color: 'rgba(192,132,252,0.7)', fontSize: '11px' }}>{streak.best}</div>
                    <div className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '8px' }}>BEST</div>
                </div>
            </div>

            <div className="space-y-2">
                {quests.map(q => (
                    <div
                        key={q.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl"
                        style={{
                            background: q.claimed ? 'rgba(0,204,96,0.05)' : 'rgba(40,15,80,0.18)',
                            border: q.claimed ? '1px solid rgba(0,204,96,0.2)' : '1px solid rgba(80,40,160,0.15)',
                        }}
                    >
                        {q.done
                            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#00cc60' }} />
                            : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(120,80,200,0.3)' }} />}
                        <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs" style={{ color: q.claimed ? 'rgba(160,140,200,0.4)' : 'rgba(210,195,255,0.8)' }}>
                                {q.label}
                            </div>
                            <div className="font-mono" style={{ color: 'rgba(120,90,180,0.45)', fontSize: '9px' }}>
                                {q.progress}/{q.goal} · {q.desc}
                            </div>
                        </div>
                        {q.claimed ? (
                            <span className="font-orbitron" style={{ color: 'rgba(0,204,96,0.6)', fontSize: '8px' }}>DONE</span>
                        ) : q.done ? (
                            <button
                                onClick={() => claim(q.id, q.label)}
                                className="font-orbitron px-2.5 py-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(120,50,240,0.25)', border: '1px solid rgba(168,85,247,0.6)', color: '#c084fc', fontSize: '8px' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(140,60,255,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                            >
                                CLAIM +{q.xp}
                            </button>
                        ) : (
                            <span className="font-orbitron" style={{ color: 'rgba(160,120,255,0.45)', fontSize: '8px' }}>+{q.xp} XP</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}