import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Brain, MessageSquare, Timer,
    Vault, BarChart3, Settings, ChevronRight, History, Rocket
} from 'lucide-react'

const navItems = [
    { icon: LayoutDashboard, label: 'DASHBOARD', path: '/dashboard' },
    { icon: Brain, label: 'BRAIN DUMP', path: '/braindump' },
    { icon: MessageSquare, label: 'AI ASSISTANT', path: '/assistant' },
    { icon: Timer, label: 'FOCUS MODE', path: '/focus' },
    { icon: History, label: 'FOCUS HISTORY', path: '/focus/history' },
    { icon: Rocket, label: 'MISSION PLANNER', path: '/mission' },
    { icon: Vault, label: 'MEMORY VAULT', path: '/memory' },
    { icon: BarChart3, label: 'INSIGHTS', path: '/insights' },
    { icon: Settings, label: 'SETTINGS', path: '/settings' },
]

const Sidebar = () => {
    const [expanded, setExpanded] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <>
            <div
                className="fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300"
                style={{
                    width: expanded ? '200px' : '56px',
                    background: 'rgba(5, 0, 8, 0.95)',
                    borderRight: '1px solid rgba(168, 85, 247, 0.12)',
                    backdropFilter: 'blur(20px)',
                }}
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
            >
                <div className="flex items-center gap-2 px-3 py-4 border-b border-purple-500/10 overflow-hidden">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)' }}
                    >
                        <span className="font-orbitron text-xs font-black" style={{ color: '#a855f7' }}>RF</span>
                    </div>
                    {expanded && (
                        <span
                            className="font-orbitron text-xs font-black tracking-widest whitespace-nowrap overflow-hidden"
                            style={{ color: '#a855f7' }}
                        >
                            ROBOFOCUS
                        </span>
                    )}
                </div>

                <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-hidden">
                    {navItems.map(({ icon: Icon, label, path }) => {
                        const active = location.pathname === path
                        const isSubItem = path === '/focus/history'
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                title={label}
                                className="flex items-center gap-3 py-2.5 mx-1.5 rounded-lg transition-all duration-200 text-left overflow-hidden"
                                style={{
                                    paddingLeft: isSubItem ? '20px' : '12px',
                                    paddingRight: '12px',
                                    background: active ? 'rgba(168,85,247,0.15)' : 'transparent',
                                    borderLeft: active ? '2px solid #a855f7' : '2px solid transparent',
                                    color: active
                                        ? '#c084fc'
                                        : isSubItem
                                            ? 'rgba(255,255,255,0.25)'
                                            : 'rgba(255,255,255,0.35)',
                                    minWidth: 0,
                                }}
                            >
                                <Icon
                                    className="flex-shrink-0"
                                    style={{
                                        width: isSubItem ? '14px' : '16px',
                                        height: isSubItem ? '14px' : '16px',
                                    }}
                                />
                                {expanded && (
                                    <span
                                        className="font-mono tracking-widest whitespace-nowrap overflow-hidden"
                                        style={{ fontSize: isSubItem ? '9px' : '11px' }}
                                    >
                                        {label}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-3 border-t border-purple-500/10 flex justify-center">
                    <ChevronRight
                        className="w-3 h-3 transition-transform duration-300 flex-shrink-0"
                        style={{
                            color: 'rgba(168,85,247,0.3)',
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                    />
                </div>
            </div>
            <div style={{ width: '56px', flexShrink: 0 }} />
        </>
    )
}

export default Sidebar