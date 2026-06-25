import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, Volume2, VolumeX, RotateCcw } from 'lucide-react'
import { VoicePoweredOrb } from '../components/ui/VoicePoweredOrb'
import Sidebar from '../components/ui/Sidebar'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const SYSTEM_PROMPT = `You are ROBOFOCUS, a sharp direct AI executive assistant for people with ADHD and focus challenges. You speak like a brilliant coach — confident, specific, zero fluff. Keep responses under 60 words. Never use bullet points. Speak in short punchy sentences. If they procrastinate call it out and give ONE concrete first step. Be warm but direct. Never break character.`

const quickPrompts = [
    "What should I do right now?",
    "What am I forgetting?",
    "Help me stop procrastinating",
    "How am I doing today?",
    "Give me a focus strategy",
]

const callAI = async (messages: Message[]): Promise<string> => {
    const apiKey = import.meta.env.VITE_GROQ_KEY
    if (!apiKey) throw new Error('Missing VITE_GROQ_KEY in .env')

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.map(m => ({ role: m.role, content: m.content }))
            ],
            max_tokens: 200,
            temperature: 0.85,
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`${res.status}: ${err?.error?.message || 'API error'}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || 'Something went wrong.'
}

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hey. I'm ROBOFOCUS. Tell me what's on your mind — tasks, stress, procrastination, anything. I'm here to help you focus and move forward."
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [listening, setListening] = useState(false)
    const [speaking, setSpeaking] = useState(false)
    const [voiceMode, setVoiceMode] = useState(false)
    const [muted, setMuted] = useState(false)
    const [orbStatus, setOrbStatus] = useState('CLICK ORB TO START VOICE')
    const [, setVoiceDetected] = useState(false)
    const [error, setError] = useState('')

    const bottomRef = useRef<HTMLDivElement>(null)
    const recognitionRef = useRef<any>(null)
    const voiceModeRef = useRef(false)
    const mutedRef = useRef(false)

    useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
    useEffect(() => { mutedRef.current = muted }, [muted])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices()
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
        }
    }, [])

    const speakText = (text: string, onDone?: () => void) => {
        if (mutedRef.current || !('speechSynthesis' in window)) { onDone?.(); return }
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.05
        utterance.pitch = 1.1
        utterance.volume = 1.0
        const voices = window.speechSynthesis.getVoices()
        const preferred =
            voices.find(v => v.name === 'Google US English') ||
            voices.find(v => v.name === 'Google UK English Female') ||
            voices.find(v => v.name.includes('Samantha')) ||
            voices.find(v => v.name.includes('Karen')) ||
            voices.find(v => v.name.includes('Moira')) ||
            voices.find(v => v.name.includes('Tessa')) ||
            voices.find(v => v.lang.startsWith('en-') && !v.name.toLowerCase().includes('microsoft'))
        if (preferred) utterance.voice = preferred
        utterance.onstart = () => setSpeaking(true)
        utterance.onend = () => { setSpeaking(false); onDone?.() }
        utterance.onerror = () => { setSpeaking(false); onDone?.() }
        window.speechSynthesis.speak(utterance)
    }

    const startListening = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { setOrbStatus('USE CHROME FOR VOICE'); return }
        const r = new SR()
        r.continuous = false
        r.interimResults = false
        r.lang = 'en-US'
        r.onstart = () => { setListening(true); setOrbStatus('LISTENING — SPEAK NOW') }
        r.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript.trim()
            if (transcript) { setOrbStatus('PROCESSING...'); sendMessage(transcript, true) }
        }
        r.onerror = (e: any) => {
            setListening(false)
            setOrbStatus(e.error === 'not-allowed' ? 'MICROPHONE BLOCKED' : 'CLICK ORB TO START VOICE')
            if (e.error === 'not-allowed') setVoiceMode(false)
        }
        r.onend = () => setListening(false)
        r.start()
        recognitionRef.current = r
    }

    const stopListening = () => {
        recognitionRef.current?.stop()
        recognitionRef.current = null
        setListening(false)
        setOrbStatus('CLICK ORB TO START VOICE')
    }

    const toggleVoiceMode = () => {
        if (voiceMode) {
            stopListening()
            window.speechSynthesis.cancel()
            setSpeaking(false)
            setVoiceMode(false)
            setOrbStatus('CLICK ORB TO START VOICE')
        } else {
            setVoiceMode(true)
            setOrbStatus('STARTING...')
            startListening()
        }
    }

    const sendMessage = async (content?: string, fromVoice = false) => {
        const msg = (content || input).trim()
        if (!msg || loading) return
        setInput('')
        setError('')
        const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
        setMessages(newMessages)
        setLoading(true)
        setOrbStatus('THINKING...')

        try {
            const reply = await callAI(newMessages)
            const updated: Message[] = [...newMessages, { role: 'assistant', content: reply }]
            setMessages(updated)
            setLoading(false)
            if (fromVoice || voiceModeRef.current) {
                setOrbStatus('ROBOFOCUS SPEAKING...')
                speakText(reply, () => {
                    if (voiceModeRef.current) {
                        setOrbStatus('LISTENING — SPEAK NOW')
                        startListening()
                    } else {
                        setOrbStatus('CLICK ORB TO START VOICE')
                    }
                })
            } else {
                setOrbStatus('CLICK ORB TO START VOICE')
            }
        } catch (err: any) {
            console.error('AI error:', err)
            setError(err.message)
            setLoading(false)
            setOrbStatus('CLICK ORB TO START VOICE')
            const lower = msg.toLowerCase()
            let fallback = "I'm having trouble connecting. But whatever you're avoiding — start with just 5 minutes of it."
            if (lower.includes('procrastinat')) fallback = "You're stalling. Pick the task you've been avoiding and set a 5-minute timer. Start now."
            else if (lower.includes('focus')) fallback = "Close everything except what you need. Phone away. 25-minute timer. Go."
            else if (lower.includes('forget')) fallback = "The thing you're forgetting is probably the thing you've been avoiding. Check your task list now."
            else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) fallback = "Hey. I'm ROBOFOCUS. What do you need to get done today? Let's start there."
            const updated: Message[] = [...newMessages, { role: 'assistant', content: fallback }]
            setMessages(updated)
            if (fromVoice || voiceModeRef.current) speakText(fallback)
        }
    }

    const orbState: 'idle' | 'listening' | 'speaking' | 'thinking' =
        listening ? 'listening' : speaking ? 'speaking' : loading ? 'thinking' : 'idle'

    const orbStyle = {
        idle: {
            bg: 'rgba(10, 4, 30, 0.6)',
            border: '2px solid rgba(100, 50, 180, 0.35)',
            glow: 'none',
            color: 'rgba(140, 80, 220, 0.5)'
        },
        listening: {
            bg: 'rgba(20, 8, 55, 0.7)',
            border: '2px solid rgba(160, 80, 255, 0.9)',
            glow: '0 0 60px rgba(140, 60, 240, 0.5), 0 0 120px rgba(100, 30, 200, 0.2)',
            color: '#b070f0'
        },
        speaking: {
            bg: 'rgba(15, 5, 45, 0.7)',
            border: '2px solid rgba(130, 60, 220, 0.8)',
            glow: '0 0 60px rgba(110, 40, 210, 0.45), 0 0 100px rgba(80, 20, 180, 0.2)',
            color: '#9060d8'
        },
        thinking: {
            bg: 'rgba(18, 5, 50, 0.7)',
            border: '2px solid rgba(150, 70, 240, 0.7)',
            glow: '0 0 50px rgba(130, 50, 220, 0.4)',
            color: '#a068e0'
        },
    }[orbState]

    const statusText = {
        idle: orbStatus,
        listening: 'LISTENING — SPEAK NOW',
        speaking: 'ROBOFOCUS SPEAKING...',
        thinking: 'THINKING...',
    }[orbState]

    return (
        // ── BACKGROUND: radial purple-to-black gradient (image 3) ──
        <div
            className="min-h-screen relative"
            style={{
                background: 'radial-gradient(125% 125% at 50% 10%, #000 40%, #6600ee 100%)',
            }}
        >
            {/* Subtle extra depth blobs */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div style={{
                    position: 'absolute', top: '-10%', left: '30%',
                    width: '600px', height: '500px',
                    background: 'radial-gradient(ellipse, rgba(100,30,220,0.12) 0%, transparent 70%)',
                    filter: 'blur(100px)'
                }} />
                <div style={{
                    position: 'absolute', bottom: '5%', right: '15%',
                    width: '500px', height: '400px',
                    background: 'radial-gradient(ellipse, rgba(80,10,180,0.1) 0%, transparent 70%)',
                    filter: 'blur(100px)'
                }} />
            </div>

            <div className="relative z-10 flex min-h-screen">
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen" style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '0 24px' }}>

                    {/* Header */}
                    <div className="py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(120,60,200,0.2)' }}>
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">AI ASSISTANT</h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(160,110,240,0.5)', fontSize: '11px' }}>Voice + text · Powered by Groq Llama (Free)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Mute button — glass style */}
                            <button
                                onClick={() => { setMuted(!muted); if (!muted) window.speechSynthesis.cancel() }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                                style={{
                                    background: muted ? 'rgba(180,40,40,0.15)' : 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(12px)',
                                    border: muted ? '1px solid rgba(200,60,60,0.35)' : '1px solid rgba(255,255,255,0.1)',
                                    color: muted ? '#f87171' : 'rgba(200,170,255,0.6)',
                                }}
                            >
                                {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                {muted ? 'UNMUTE' : 'MUTE'}
                            </button>
                            {/* Clear button — glass style */}
                            <button
                                onClick={() => {
                                    setMessages([{ role: 'assistant', content: "Fresh start. What's on your mind?" }])
                                    window.speechSynthesis.cancel()
                                    stopListening()
                                    setVoiceMode(false)
                                    setError('')
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.35)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'
                                        ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'
                                        ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
                                }}
                            >
                                <RotateCcw className="w-3 h-3" />
                                CLEAR
                            </button>
                        </div>
                    </div>

                    {/* ── ORB SECTION (image 1 style — large purple ring) ── */}
                    <div className="flex flex-col items-center py-10 gap-4">
                        <motion.div
                            className="relative rounded-full cursor-pointer flex items-center justify-center"
                            style={{
                                width: '200px', height: '200px',
                                background: orbStyle.bg,
                                border: orbStyle.border,
                                boxShadow: orbStyle.glow,
                                backdropFilter: 'blur(8px)',
                                transition: 'background 0.5s ease, border 0.5s ease, box-shadow 0.5s ease',
                            }}
                            animate={listening ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                            transition={{ duration: 2, repeat: listening ? Infinity : 0 }}
                            onClick={toggleVoiceMode}
                        >
                            <VoicePoweredOrb
                                enableVoiceControl={listening}
                                hue={270}
                                onVoiceDetected={setVoiceDetected}
                                className="rounded-full overflow-hidden"
                            />
                            {orbState === 'idle' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Mic className="w-8 h-8" style={{ color: 'rgba(160,100,240,0.5)' }} />
                                </div>
                            )}
                            {/* Pulse rings when listening */}
                            {listening && [0, 1, 2].map(i => (
                                <motion.div key={i} className="absolute inset-0 rounded-full"
                                    style={{ border: `1px solid rgba(160,80,255,${0.4 - i * 0.12})` }}
                                    animate={{ scale: [1, 1.6 + i * 0.25], opacity: [0.6, 0] }}
                                    transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity }}
                                />
                            ))}
                            {speaking && (
                                <motion.div className="absolute inset-0 rounded-full"
                                    style={{ border: '1px solid rgba(140,70,240,0.4)' }}
                                    animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                                    transition={{ duration: 1.1, repeat: Infinity }}
                                />
                            )}
                        </motion.div>

                        <div className="text-center space-y-1">
                            <p className="font-orbitron tracking-widest transition-colors duration-300" style={{ color: orbStyle.color, fontSize: '9px' }}>
                                {statusText}
                            </p>
                            <p className="font-mono" style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>
                                {voiceMode ? 'VOICE MODE ACTIVE — CLICK ORB TO STOP' : 'CLICK ORB FOR CONTINUOUS VOICE CONVERSATION'}
                            </p>
                        </div>

                        {error && (
                            <div className="px-4 py-2 rounded-lg font-mono text-xs max-w-md text-center"
                                style={{
                                    background: 'rgba(180,40,40,0.1)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(200,60,60,0.25)',
                                    color: 'rgba(240,100,100,0.8)'
                                }}>
                                ⚠ {error}
                            </div>
                        )}
                    </div>

                    {/* ── QUICK PROMPTS — glass pill buttons (image 2 style) ── */}
                    <div className="flex flex-wrap gap-2 justify-center mb-5">
                        {quickPrompts.map(p => (
                            <button
                                key={p}
                                onClick={() => sendMessage(p)}
                                disabled={loading}
                                className="px-4 py-2 rounded-full font-mono transition-all duration-200"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'rgba(200,170,255,0.65)',
                                    fontSize: '11px',
                                }}
                                onMouseEnter={e => {
                                    const b = e.currentTarget as HTMLButtonElement
                                    b.style.background = 'rgba(120,60,220,0.2)'
                                    b.style.color = '#c8a8ff'
                                    b.style.borderColor = 'rgba(160,90,255,0.4)'
                                }}
                                onMouseLeave={e => {
                                    const b = e.currentTarget as HTMLButtonElement
                                    b.style.background = 'rgba(255,255,255,0.05)'
                                    b.style.color = 'rgba(200,170,255,0.65)'
                                    b.style.borderColor = 'rgba(255,255,255,0.12)'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* ── CHAT AREA — glass panel (image 2 style) ── */}
                    <div
                        className="flex-1 rounded-2xl p-5 overflow-y-auto mb-4 space-y-3"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            minHeight: '200px',
                            maxHeight: '340px',
                        }}
                    >
                        <AnimatePresence>
                            {messages.map((msg, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className="max-w-[80%] px-4 py-3 rounded-xl font-mono leading-relaxed"
                                        style={{
                                            fontSize: '13px',
                                            backdropFilter: 'blur(12px)',
                                            ...(msg.role === 'assistant' ? {
                                                background: 'rgba(120,50,220,0.15)',
                                                border: '1px solid rgba(140,70,240,0.25)',
                                                color: 'rgba(220,200,255,0.9)',
                                            } : {
                                                background: 'rgba(255,255,255,0.07)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                color: 'rgba(200,180,255,0.8)',
                                            })
                                        }}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="font-orbitron mb-1.5" style={{ color: 'rgba(160,90,255,0.9)', fontSize: '8px', letterSpacing: '2px' }}>ROBOFOCUS</div>
                                        )}
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {loading && (
                            <div className="flex justify-start">
                                <div className="px-4 py-3 rounded-xl"
                                    style={{
                                        background: 'rgba(120,50,220,0.15)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(140,70,240,0.25)'
                                    }}>
                                    <div className="font-orbitron mb-1.5" style={{ color: 'rgba(160,90,255,0.9)', fontSize: '8px', letterSpacing: '2px' }}>ROBOFOCUS</div>
                                    <div className="flex gap-1.5 items-center">
                                        {[0, 1, 2].map(i => (
                                            <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: 'rgba(160,90,255,0.8)' }}
                                                animate={{ y: [0, -4, 0] }}
                                                transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* ── INPUT ROW — glass style ── */}
                    <div className="flex gap-3 pb-6">
                        {/* Mic toggle button */}
                        <button
                            onClick={listening ? stopListening : startListening}
                            className="px-4 py-3 rounded-xl transition-all duration-300 flex-shrink-0"
                            style={{
                                background: listening ? 'rgba(130,50,230,0.3)' : 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(16px)',
                                border: listening ? '1px solid rgba(160,80,255,0.8)' : '1px solid rgba(255,255,255,0.12)',
                                color: listening ? '#c080ff' : 'rgba(180,130,255,0.5)',
                                boxShadow: listening ? '0 0 20px rgba(140,60,240,0.35)' : 'none',
                            }}
                        >
                            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>

                        {/* Text input */}
                        <input
                            className="flex-1 font-mono text-sm px-4 py-3 rounded-xl focus:outline-none transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(220,200,255,0.9)',
                            }}
                            placeholder="Type a message or click the orb to speak..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            onFocus={e => {
                                (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(160,90,255,0.5)'
                                    ; (e.currentTarget as HTMLInputElement).style.background = 'rgba(255,255,255,0.08)'
                            }}
                            onBlur={e => {
                                (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'
                                    ; (e.currentTarget as HTMLInputElement).style.background = 'rgba(255,255,255,0.05)'
                            }}
                        />

                        {/* Send button */}
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || loading}
                            className="px-5 py-3 rounded-xl transition-all duration-300 flex-shrink-0"
                            style={{
                                background: input.trim() && !loading ? 'rgba(120,50,230,0.3)' : 'rgba(255,255,255,0.04)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: input.trim() && !loading ? '#c080ff' : 'rgba(160,120,220,0.3)',
                                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                            }}
                            onMouseEnter={e => {
                                if (input.trim() && !loading) {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(140,60,255,0.4)'
                                        ; (e.currentTarget as HTMLButtonElement).style.color = '#d4a0ff'
                                }
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,230,0.3)'
                                    ; (e.currentTarget as HTMLButtonElement).style.color = '#c080ff'
                            }}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}