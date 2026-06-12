import { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import NeuralVortex from '../components/ui/NeuralVortex'

const Spline = lazy(() => import('@splinetool/react-spline'))

const LandingPage = () => {
    const navigate = useNavigate()

    return (
        <div className="relative min-h-screen bg-[#050008] overflow-hidden">
            <NeuralVortex opacity={0.75} />

            {/* NAVBAR */}
            <nav className="relative z-30 flex items-center justify-between px-8 py-6">
                <div className="font-orbitron text-xl font-black tracking-widest" style={{ color: '#a855f7' }}>
                    ROBO<span style={{ color: '#7c3aed' }}>FOCUS</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-xs tracking-widest text-white/60 font-mono">
                    <button onClick={() => navigate('/dashboard')} className="hover:text-purple-400 transition-colors">FEATURES</button>
                    <button onClick={() => navigate('/dashboard')} className="hover:text-purple-400 transition-colors">HOW IT WORKS</button>
                    <button onClick={() => navigate('/dashboard')} className="hover:text-purple-400 transition-colors">PRICING</button>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-xs tracking-widest text-white/60 hover:text-white font-mono transition-colors"
                    >
                        LOGIN
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="text-xs tracking-widest font-mono px-4 py-2 border transition-all duration-300"
                        style={{ borderColor: '#a855f7', color: '#a855f7' }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#a855f7'
                                ; (e.currentTarget as HTMLButtonElement).style.color = '#000'
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                                ; (e.currentTarget as HTMLButtonElement).style.color = '#a855f7'
                        }}
                    >
                        SIGN UP
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <div className="relative z-20 flex flex-col lg:flex-row items-center justify-between px-8 lg:px-20 pt-4 lg:pt-10 min-h-[88vh]">

                {/* LEFT CONTENT — always on top */}
                <div className="flex-1 max-w-xl relative" style={{ zIndex: 30 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-purple-500/30 backdrop-blur-sm rounded-full mb-6"
                    >
                        <span style={{ color: '#a855f7' }} className="text-xs">✦</span>
                        <span className="text-white/70 text-xs tracking-widest font-mono">AI-POWERED FOCUS ASSISTANT</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="font-orbitron text-4xl lg:text-[3.4rem] font-black text-white leading-tight mb-6"
                    >
                        YOUR BRAIN<br />
                        DESERVES A<br />
                        <span style={{ color: '#c084fc', textShadow: '0 0 30px rgba(168,85,247,0.6)' }}>SMARTER</span><br />
                        <span className="text-white">ASSISTANT</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-white/50 text-sm leading-relaxed mb-8 max-w-md font-mono"
                    >
                        ROBOFOCUS remembers what you forget, starts what you keep putting off,
                        and keeps you locked in — like having Jarvis for your productivity.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="flex items-center gap-4 mb-10 flex-wrap"
                    >
                        <button
                            onClick={() => navigate('/signup')}
                            className="font-orbitron text-xs tracking-widest px-8 py-4 transition-all duration-300 cursor-pointer"
                            style={{ border: '1px solid #a855f7', color: '#c084fc', boxShadow: '0 0 20px rgba(168,85,247,0.25)' }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = '#a855f7'
                                    ; (e.currentTarget as HTMLButtonElement).style.color = '#fff'
                                    ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 35px rgba(168,85,247,0.5)'
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                                    ; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc'
                                    ; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(168,85,247,0.25)'
                            }}
                        >
                            GET STARTED →
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="font-orbitron text-xs tracking-widest px-8 py-4 border border-white/20 text-white/60 hover:border-purple-500/40 hover:text-white/80 transition-all duration-300 cursor-pointer"
                        >
                            WATCH DEMO
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="flex items-center gap-6 flex-wrap"
                    >
                        {['10K+ Students', '94% Task Completion', 'Free to Start'].map(stat => (
                            <div key={stat} className="flex items-center gap-2">
                                <span style={{ color: '#a855f7' }} className="text-xs">●</span>
                                <span className="text-white/40 text-xs font-mono tracking-widest">{stat}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* RIGHT — ROBOT (lower z-index so it never blocks buttons) */}
                <motion.div
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1.0, delay: 0.3 }}
                    className="flex-1 flex items-center justify-center mt-8 lg:mt-0 relative"
                    style={{ height: '620px', minWidth: '480px', zIndex: 10 }}
                >
                    <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'radial-gradient(ellipse 60% 70% at 55% 55%, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.08) 40%, transparent 70%)',
                    }} />

                    <Suspense fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                            <span className="text-white/30 text-xs font-mono tracking-widest">LOADING ROBOT...</span>
                        </div>
                    }>
                        <Spline
                            scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
                            style={{ width: '100%', height: '100%', background: 'transparent' }}
                        />
                    </Suspense>

                    <div className="absolute bottom-0 left-0 pointer-events-none" style={{
                        width: '52%', height: '38%',
                        background: 'linear-gradient(to top right, #050008 45%, transparent 100%)', zIndex: 2,
                    }} />
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
                        height: '25%',
                        background: 'linear-gradient(to top, #050008 35%, transparent 100%)', zIndex: 2,
                    }} />
                    <div className="absolute bottom-0 right-0 pointer-events-none" style={{
                        width: '210px', height: '42px', background: '#050008', zIndex: 10,
                    }} />
                </motion.div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050008] to-transparent z-10" />
        </div>
    )
}

export default LandingPage