import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import NeuralVortex from '../components/ui/NeuralVortex'

const LoginPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const isSignup = location.pathname === '/signup'
    const [tab, setTab] = useState<'login' | 'signup'>(isSignup ? 'signup' : 'login')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: '', email: '', password: '', confirm: ''
    })

    const handleSubmit = async () => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            navigate('/onboarding')
        }, 1500)
    }

    const inputClass = `
    w-full bg-white/5 border border-white/10 text-white text-sm font-mono
    px-4 py-3 pl-11 rounded-lg placeholder-white/20
    focus:outline-none focus:border-purple-500/60 focus:bg-white/8
    transition-all duration-300
  `

    return (
        <div className="relative min-h-screen bg-[#050008] overflow-hidden flex items-center justify-center">
            <NeuralVortex opacity={0.75} />

            {/* TOP LEFT LOGO */}
            <div
                className="absolute top-6 left-8 z-20 font-orbitron text-xl font-black tracking-widest cursor-pointer"
                style={{ color: '#a855f7' }}
                onClick={() => navigate('/')}
            >
                ROBO<span style={{ color: '#7c3aed' }}>FOCUS</span>
            </div>

            {/* CARD */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div
                    className="rounded-2xl p-8"
                    style={{
                        background: 'rgba(10, 5, 20, 0.85)',
                        border: '1px solid rgba(168, 85, 247, 0.15)',
                        backdropFilter: 'blur(24px)',
                        boxShadow: '0 0 60px rgba(139, 92, 246, 0.1), 0 0 120px rgba(109, 40, 217, 0.05)'
                    }}
                >
                    {/* LOGO INSIDE CARD */}
                    <div className="text-center mb-6">
                        <div className="font-orbitron text-lg font-black tracking-widest mb-1" style={{ color: '#a855f7' }}>
                            ROBO<span style={{ color: '#7c3aed' }}>FOCUS</span>
                        </div>
                        <p className="text-white/30 text-xs font-mono tracking-widest">AI EXECUTIVE ASSISTANT</p>
                    </div>

                    {/* TABS */}
                    <div className="flex mb-8 border-b border-white/10">
                        {(['login', 'signup'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className="flex-1 pb-3 text-xs font-mono tracking-widest transition-all duration-300 relative"
                                style={{ color: tab === t ? '#c084fc' : 'rgba(255,255,255,0.3)' }}
                            >
                                {t === 'login' ? 'LOGIN' : 'SIGN UP'}
                                {tab === t && (
                                    <motion.div
                                        layoutId="tabline"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                                        style={{ background: '#a855f7' }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* FORMS */}
                    <AnimatePresence mode="wait">
                        {tab === 'login' ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                {/* EMAIL */}
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7c3aed' }} />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        className={inputClass}
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>

                                {/* PASSWORD */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7c3aed' }} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        className={inputClass + ' pr-11'}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* FORGOT */}
                                <div className="text-right">
                                    <button className="text-xs font-mono tracking-widest transition-colors" style={{ color: '#9333ea' }}>
                                        FORGOT PASSWORD?
                                    </button>
                                </div>

                                {/* SUBMIT */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-3 font-orbitron text-xs tracking-widest transition-all duration-300 rounded-lg mt-2"
                                    style={{
                                        background: loading ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.15)',
                                        border: '1px solid rgba(168,85,247,0.5)',
                                        color: '#c084fc',
                                        boxShadow: '0 0 20px rgba(168,85,247,0.15)'
                                    }}
                                    onMouseEnter={e => {
                                        if (!loading) {
                                            (e.currentTarget as HTMLButtonElement).style.background = '#a855f7'
                                                ; (e.currentTarget as HTMLButtonElement).style.color = '#fff'
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!loading) {
                                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.15)'
                                                ; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'
                                        }
                                    }}
                                >
                                    {loading ? 'AUTHENTICATING...' : 'LOGIN →'}
                                </button>

                                {/* DIVIDER */}
                                <div className="flex items-center gap-3 my-2">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="text-white/20 text-xs font-mono">OR</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {/* GOOGLE */}
                                <button
                                    className="w-full py-3 font-mono text-xs tracking-widest text-white/40 rounded-lg border border-white/10 hover:border-purple-500/30 hover:text-white/60 transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    CONTINUE WITH GOOGLE
                                </button>
                            </motion.div>

                        ) : (
                            <motion.div
                                key="signup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                {/* NAME */}
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7c3aed' }} />
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        className={inputClass}
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                {/* EMAIL */}
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7c3aed' }} />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        className={inputClass}
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>

                                {/* PASSWORD */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7c3aed' }} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        className={inputClass + ' pr-11'}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* CONFIRM PASSWORD */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7c3aed' }} />
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Confirm password"
                                        className={inputClass + ' pr-11'}
                                        value={form.confirm}
                                        onChange={e => setForm({ ...form, confirm: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* TERMS */}
                                <p className="text-white/20 text-xs font-mono text-center">
                                    By signing up you agree to our{' '}
                                    <span className="cursor-pointer" style={{ color: '#9333ea' }}>Terms of Service</span>
                                </p>

                                {/* SUBMIT */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-3 font-orbitron text-xs tracking-widest transition-all duration-300 rounded-lg"
                                    style={{
                                        background: 'rgba(168,85,247,0.15)',
                                        border: '1px solid rgba(168,85,247,0.5)',
                                        color: '#c084fc',
                                        boxShadow: '0 0 20px rgba(168,85,247,0.15)'
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
                                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
                                </button>

                                {/* DIVIDER */}
                                <div className="flex items-center gap-3 my-2">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="text-white/20 text-xs font-mono">OR</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {/* GOOGLE */}
                                <button className="w-full py-3 font-mono text-xs tracking-widest text-white/40 rounded-lg border border-white/10 hover:border-purple-500/30 hover:text-white/60 transition-all duration-300 flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    CONTINUE WITH GOOGLE
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* BOTTOM TOGGLE */}
                    <p className="text-center text-white/20 text-xs font-mono mt-6">
                        {tab === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
                            className="transition-colors"
                            style={{ color: '#9333ea' }}
                        >
                            {tab === 'login' ? 'SIGN UP' : 'LOGIN'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default LoginPage