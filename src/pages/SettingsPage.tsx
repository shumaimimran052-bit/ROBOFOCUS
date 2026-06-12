// pages/SettingsPage.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Brain, Timer, Shield, LogOut } from 'lucide-react'
import { ShaderBackground } from '../components/ui/hero-shader'
import Sidebar from '../components/ui/Sidebar'

export default function SettingsPage() {
    const navigate = useNavigate()
    const [saved, setSaved] = useState('')
    const [profile, setProfile] = useState({ name: 'Alex', email: 'alex@example.com', age: '20' })
    const [toggles, setToggles] = useState({
        nudges: true, briefing: true, voice: true,
        taskReminders: true, deadlineWarnings: true,
        streakAlerts: false, breakReminder: true, autoStart: false,
    })
    const [personality, setPersonality] = useState('Motivating')
    const [defaultDuration, setDefaultDuration] = useState('25 MIN')
    const [wakeTime, setWakeTime] = useState('07:00')
    const [sleepTime, setSleepTime] = useState('23:00')
    const [dndTime, setDndTime] = useState('23:00')

    const saveSection = (id: string) => {
        setSaved(id)
        setTimeout(() => setSaved(''), 2000)
    }

    const Toggle = ({ id }: { id: keyof typeof toggles }) => (
        <button
            onClick={() => setToggles({ ...toggles, [id]: !toggles[id] })}
            className="relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0"
            style={{
                background: toggles[id] ? 'rgba(120, 50, 220, 0.5)' : 'rgba(255,255,255,0.08)',
                border: toggles[id] ? '1px solid rgba(160, 80, 255, 0.6)' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: toggles[id] ? '0 0 10px rgba(140, 60, 220, 0.25)' : 'none',
            }}
        >
            <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300"
                style={{ left: toggles[id] ? '20px' : '2px', opacity: toggles[id] ? 1 : 0.5 }}
            />
        </button>
    )

    // Cards get a stronger glass effect to stand out over the shader
    const card = {
        background: 'rgba(4, 2, 16, 0.65)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '16px',
        overflow: 'hidden' as const,
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
    }

    const inputStyle = {
        background: 'rgba(30, 10, 70, 0.35)',
        border: '1px solid rgba(80, 40, 160, 0.3)',
        color: 'rgba(200, 185, 255, 0.82)',
        fontFamily: 'Space Mono, monospace',
        fontSize: '13px',
        padding: '10px 16px',
        borderRadius: '10px',
        width: '100%',
        outline: 'none',
        transition: 'border-color 0.2s',
    }

    const Section = ({ icon: Icon, title, id, children }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={card}
        >
            <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" style={{ color: 'rgba(160, 100, 255, 0.75)' }} />
                    <span className="font-orbitron tracking-widest"
                        style={{ color: 'rgba(160, 100, 255, 0.65)', fontSize: '9px' }}>
                        {title}
                    </span>
                </div>
                {saved === id && (
                    <span className="font-mono tracking-widest"
                        style={{ color: 'rgba(0,255,157,0.7)', fontSize: '9px' }}>
                        SAVED ✓
                    </span>
                )}
            </div>
            <div className="px-6 py-5 space-y-4">{children}</div>
        </motion.div>
    )

    const ToggleRow = ({ id, label, desc }: { id: keyof typeof toggles; label: string; desc?: string }) => (
        <div className="flex items-center justify-between gap-4">
            <div>
                <div className="font-mono text-sm" style={{ color: 'rgba(200, 185, 255, 0.7)' }}>{label}</div>
                {desc && (
                    <div className="font-mono"
                        style={{ color: 'rgba(130, 100, 200, 0.45)', fontSize: '10px', marginTop: '2px' }}>
                        {desc}
                    </div>
                )}
            </div>
            <Toggle id={id} />
        </div>
    )

    const SaveBtn = ({ id }: { id: string }) => (
        <button
            onClick={() => saveSection(id)}
            className="font-orbitron text-xs tracking-widest px-6 py-2.5 rounded-xl transition-all duration-300"
            style={{
                background: 'rgba(80, 30, 160, 0.25)',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                color: '#c084fc',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100, 40, 200, 0.4)'
                    ; (e.currentTarget as HTMLButtonElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80, 30, 160, 0.25)'
                    ; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'
            }}
        >
            SAVE CHANGES
        </button>
    )

    return (
        <ShaderBackground>
            <div className="flex min-h-screen relative z-10">
                <Sidebar />

                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div
                        className="px-8 py-5"
                        style={{
                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                            background: 'rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <h1 className="font-orbitron text-base font-bold tracking-widest text-white">
                            SETTINGS
                        </h1>
                        <p className="font-mono mt-0.5"
                            style={{ color: 'rgba(139, 92, 246, 0.6)', fontSize: '11px' }}>
                            Configure your assistant
                        </p>
                    </div>

                    {/* Scrollable content */}
                    <div className="px-8 py-6 max-w-2xl space-y-4 overflow-y-auto">

                        <Section icon={User} title="PROFILE" id="profile">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-mono tracking-widest block mb-2"
                                        style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                        NAME
                                    </label>
                                    <input
                                        style={inputStyle}
                                        value={profile.name}
                                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160, 80, 255, 0.6)' }}
                                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(80, 40, 160, 0.3)' }}
                                    />
                                </div>
                                <div>
                                    <label className="font-mono tracking-widest block mb-2"
                                        style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                        AGE
                                    </label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={profile.age}
                                        onChange={e => setProfile({ ...profile, age: e.target.value })}
                                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160, 80, 255, 0.6)' }}
                                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(80, 40, 160, 0.3)' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="font-mono tracking-widest block mb-2"
                                    style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                    EMAIL
                                </label>
                                <input style={{ ...inputStyle, opacity: 0.45 }} value={profile.email} readOnly />
                            </div>
                            <SaveBtn id="profile" />
                        </Section>

                        <Section icon={Brain} title="AI PREFERENCES" id="ai">
                            <ToggleRow id="nudges" label="Proactive nudges" desc="ROBOFOCUS messages you when tasks are overdue" />
                            <ToggleRow id="briefing" label="Morning briefing" desc="AI generates daily summary at wake-up time" />
                            <ToggleRow id="voice" label="Voice responses" desc="AI speaks responses aloud" />
                            <div>
                                <label className="font-mono tracking-widest block mb-2"
                                    style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                    AI PERSONALITY
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Motivating', 'Direct', 'Gentle', 'Robotic'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPersonality(p)}
                                            className="px-4 py-2 rounded-xl font-mono text-xs tracking-widest transition-all"
                                            style={{
                                                background: personality === p ? 'rgba(100, 40, 200, 0.3)' : 'rgba(30, 10, 70, 0.25)',
                                                border: personality === p ? '1px solid rgba(160, 80, 255, 0.6)' : '1px solid rgba(60, 25, 130, 0.25)',
                                                color: personality === p ? '#c084fc' : 'rgba(140, 100, 220, 0.45)',
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Section>

                        <Section icon={Timer} title="FOCUS DEFAULTS" id="focus">
                            <div>
                                <label className="font-mono tracking-widest block mb-2"
                                    style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                    DEFAULT SESSION LENGTH
                                </label>
                                <div className="flex gap-2">
                                    {['15 MIN', '25 MIN', '45 MIN', '60 MIN'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDefaultDuration(d)}
                                            className="flex-1 py-2.5 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                            style={{
                                                background: defaultDuration === d ? 'rgba(100, 40, 200, 0.3)' : 'rgba(30, 10, 70, 0.2)',
                                                border: defaultDuration === d ? '1px solid rgba(160, 80, 255, 0.6)' : '1px solid rgba(60, 25, 130, 0.2)',
                                                color: defaultDuration === d ? '#c084fc' : 'rgba(140, 100, 220, 0.4)',
                                            }}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <ToggleRow id="breakReminder" label="Break reminders" desc="Get notified to take breaks between sessions" />
                            <ToggleRow id="autoStart" label="Auto-start next session" desc="Automatically begin next focus session" />
                        </Section>

                        <Section icon={Bell} title="NOTIFICATIONS" id="notifications">
                            <ToggleRow id="taskReminders" label="Task reminders" />
                            <ToggleRow id="deadlineWarnings" label="Deadline warnings" />
                            <ToggleRow id="streakAlerts" label="Streak alerts" />
                            <div>
                                <label className="font-mono tracking-widest block mb-2"
                                    style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                    DO NOT DISTURB AFTER
                                </label>
                                <input
                                    type="time"
                                    style={{ ...inputStyle, width: 'auto' }}
                                    value={dndTime}
                                    onChange={e => setDndTime(e.target.value)}
                                    onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160, 80, 255, 0.6)' }}
                                    onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(80, 40, 160, 0.3)' }}
                                />
                            </div>
                        </Section>

                        <Section icon={Timer} title="YOUR SCHEDULE" id="schedule">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-mono tracking-widest block mb-2"
                                        style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                        I WAKE UP AT
                                    </label>
                                    <input
                                        type="time"
                                        style={inputStyle}
                                        value={wakeTime}
                                        onChange={e => setWakeTime(e.target.value)}
                                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160, 80, 255, 0.6)' }}
                                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(80, 40, 160, 0.3)' }}
                                    />
                                </div>
                                <div>
                                    <label className="font-mono tracking-widest block mb-2"
                                        style={{ color: 'rgba(130, 90, 200, 0.5)', fontSize: '9px' }}>
                                        I GO TO SLEEP AT
                                    </label>
                                    <input
                                        type="time"
                                        style={inputStyle}
                                        value={sleepTime}
                                        onChange={e => setSleepTime(e.target.value)}
                                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160, 80, 255, 0.6)' }}
                                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(80, 40, 160, 0.3)' }}
                                    />
                                </div>
                            </div>
                            <SaveBtn id="schedule" />
                        </Section>

                        <Section icon={Shield} title="ACCOUNT & SECURITY" id="account">
                            <button
                                className="w-full py-3 font-mono text-xs tracking-widest rounded-xl transition-all"
                                style={{ border: '1px solid rgba(80, 35, 160, 0.25)', color: 'rgba(160, 130, 220, 0.5)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(140, 70, 240, 0.5)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200, 170, 255, 0.8)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80, 35, 160, 0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160, 130, 220, 0.5)' }}
                            >
                                CHANGE PASSWORD
                            </button>
                            <button
                                className="w-full py-3 font-mono text-xs tracking-widest rounded-xl transition-all"
                                style={{ border: '1px solid rgba(80, 35, 160, 0.25)', color: 'rgba(160, 130, 220, 0.5)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(140, 70, 240, 0.5)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200, 170, 255, 0.8)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80, 35, 160, 0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160, 130, 220, 0.5)' }}
                            >
                                EXPORT MY DATA
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full py-3 font-orbitron text-xs tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all"
                                style={{ border: '1px solid rgba(200, 40, 80, 0.25)', color: 'rgba(240, 80, 120, 0.55)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220, 50, 90, 0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200, 40, 80, 0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240, 80, 120, 0.55)' }}
                            >
                                <LogOut className="w-4 h-4" />
                                SIGN OUT
                            </button>
                            <button
                                className="w-full py-3 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                style={{ border: '1px solid rgba(180, 30, 50, 0.18)', color: 'rgba(220, 60, 80, 0.35)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220, 60, 80, 0.6)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220, 60, 80, 0.35)' }}
                            >
                                DELETE ACCOUNT
                            </button>
                        </Section>

                        <div style={{ height: '40px' }} />
                    </div>
                </div>
            </div>
        </ShaderBackground>
    )
}