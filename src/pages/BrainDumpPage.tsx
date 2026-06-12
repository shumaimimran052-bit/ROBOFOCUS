import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Sparkles, Plus, Trash2, CheckCircle, Brain, GitBranch, X, RotateCcw } from 'lucide-react'
import { LiquidShader } from '../components/ui/LiquidShader'
import Sidebar from '../components/ui/Sidebar'

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY

interface ParsedTask {
    name: string
    category: 'SCHOOL' | 'WORK' | 'PERSONAL' | 'HEALTH'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    when: string
    follow_up: string
}

interface BrainNode {
    id: string
    label: string
    type: 'root' | 'category' | 'task'
    category?: string
    x: number
    y: number
    vx: number
    vy: number
    connections: string[]
}

const categoryColors: Record<string, string> = {
    SCHOOL: '#00c8ff',
    WORK: '#ff3cac',
    PERSONAL: '#a855f7',
    HEALTH: '#00ff9d',
}

const priorityColors: Record<string, string> = {
    HIGH: '#ff3cac',
    MEDIUM: '#00c8ff',
    LOW: '#a855f7',
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
            max_tokens: 1000,
            temperature: 0.7,
        })
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

const parseLocally = (text: string): ParsedTask[] => {
    const sentences = text.split(/[,.\n!]+/).map(s => s.trim()).filter(s => s.length > 3)
    return sentences.map(sentence => {
        const lower = sentence.toLowerCase()
        let category: ParsedTask['category'] = 'PERSONAL'
        let priority: ParsedTask['priority'] = 'MEDIUM'
        let when = 'this week'
        if (['homework', 'exam', 'study', 'assignment', 'class', 'teacher', 'school', 'biology', 'chemistry', 'math', 'essay', 'report'].some(w => lower.includes(w))) category = 'SCHOOL'
        else if (['email', 'meeting', 'boss', 'work', 'deadline', 'project', 'client', 'office'].some(w => lower.includes(w))) category = 'WORK'
        else if (['gym', 'workout', 'sleep', 'eat', 'doctor', 'medicine', 'health', 'run', 'exercise'].some(w => lower.includes(w))) category = 'HEALTH'
        if (['urgent', 'asap', 'immediately', 'tonight', 'due tomorrow', 'deadline'].some(w => lower.includes(w))) priority = 'HIGH'
        else if (['soon', 'this week', 'important'].some(w => lower.includes(w))) priority = 'MEDIUM'
        else priority = 'LOW'
        if (['today', 'tonight', 'now', 'this evening', 'after school'].some(w => lower.includes(w))) when = 'today'
        else if (['tomorrow', 'due tomorrow'].some(w => lower.includes(w))) when = 'tomorrow'
        const nudges: Record<string, string> = {
            SCHOOL: 'Start with 5 minutes — momentum builds fast.',
            WORK: 'Block 30 minutes and knock this out now.',
            PERSONAL: 'Small steps. Do it today, not someday.',
            HEALTH: 'Your future self will thank you for this.',
        }
        return { name: sentence.charAt(0).toUpperCase() + sentence.slice(1), category, priority, when, follow_up: nudges[category] }
    })
}

const buildBrainMap = (tasks: ParsedTask[]): BrainNode[] => {
    const cx = 500, cy = 300
    const nodes: BrainNode[] = []

    // Root node
    nodes.push({
        id: 'root',
        label: 'MY MIND',
        type: 'root',
        x: cx, y: cy,
        vx: 0, vy: 0,
        connections: [],
    })

    // Category nodes
    const categories = [...new Set(tasks.map(t => t.category))]
    const catAngleStep = (2 * Math.PI) / categories.length
    categories.forEach((cat, i) => {
        const angle = i * catAngleStep - Math.PI / 2
        const r = 130
        const nodeId = `cat-${cat}`
        nodes[0].connections.push(nodeId)
        nodes.push({
            id: nodeId,
            label: cat,
            type: 'category',
            category: cat,
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
            vx: 0, vy: 0,
            connections: [],
        })
    })

    // Task nodes
    tasks.forEach((task, i) => {
        const catNodeId = `cat-${task.category}`
        const catNode = nodes.find(n => n.id === catNodeId)
        const catIdx = categories.indexOf(task.category)
        const tasksInCat = tasks.filter(t => t.category === task.category)
        const taskIdx = tasksInCat.indexOf(task)
        const catAngle = catIdx * catAngleStep - Math.PI / 2
        const spread = (taskIdx - (tasksInCat.length - 1) / 2) * 0.4
        const taskAngle = catAngle + spread
        const r = 220
        const nodeId = `task-${i}`
        if (catNode) catNode.connections.push(nodeId)
        nodes.push({
            id: nodeId,
            label: task.name.length > 28 ? task.name.slice(0, 28) + '...' : task.name,
            type: 'task',
            category: task.category,
            x: cx + Math.cos(taskAngle) * r + (Math.random() - 0.5) * 40,
            y: cy + Math.sin(taskAngle) * r + (Math.random() - 0.5) * 40,
            vx: 0, vy: 0,
            connections: [],
        })
    })

    return nodes
}

export default function BrainDumpPage() {
    const [activeTab, setActiveTab] = useState<'dump' | 'map'>('dump')

    // Dump state
    const [text, setText] = useState('')
    const [parsing, setParsing] = useState(false)
    const [parsed, setParsed] = useState<ParsedTask[]>([])
    const [listening, setListening] = useState(false)
    const [added, setAdded] = useState(false)
    const [status, setStatus] = useState('')
    const recognitionRef = useRef<any>(null)

    // Brain map state
    const [nodes, setNodes] = useState<BrainNode[]>([])
    const [buildingMap, setBuildingMap] = useState(false)
    const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null)
    const [dragNode, setDragNode] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [mapText, setMapText] = useState('')
    const [aiInsight, setAiInsight] = useState('')
    const svgRef = useRef<SVGSVGElement>(null)
    const animFrameRef = useRef<number>(0)

    // Physics simulation for nodes
    useEffect(() => {
        if (nodes.length === 0) return

        const simulate = () => {
            setNodes(prev => {
                const next = prev.map(n => ({ ...n }))

                // Repulsion between all nodes
                for (let i = 0; i < next.length; i++) {
                    for (let j = i + 1; j < next.length; j++) {
                        const dx = next[i].x - next[j].x
                        const dy = next[i].y - next[j].y
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1
                        const minDist = next[i].type === 'root' ? 120 : 80
                        if (dist < minDist) {
                            const force = (minDist - dist) / dist * 0.3
                            next[i].vx += dx * force
                            next[i].vy += dy * force
                            next[j].vx -= dx * force
                            next[j].vy -= dy * force
                        }
                    }
                }

                // Attraction along connections
                for (const node of next) {
                    for (const connId of node.connections) {
                        const conn = next.find(n => n.id === connId)
                        if (!conn) continue
                        const dx = conn.x - node.x
                        const dy = conn.y - node.y
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1
                        const targetDist = node.type === 'root' ? 130 : 200
                        const force = (dist - targetDist) / dist * 0.05
                        node.vx += dx * force
                        node.vy += dy * force
                        conn.vx -= dx * force
                        conn.vy -= dy * force
                    }
                }

                // Center gravity for root
                const root = next.find(n => n.id === 'root')
                if (root) {
                    root.vx += (500 - root.x) * 0.02
                    root.vy += (300 - root.y) * 0.02
                }

                // Apply velocity with damping
                for (const node of next) {
                    if (node.id === dragNode) continue
                    if (node.id === 'root') { node.vx *= 0.8; node.vy *= 0.8 }
                    else { node.vx *= 0.85; node.vy *= 0.85 }
                    node.x += node.vx
                    node.y += node.vy
                    // Bounds
                    node.x = Math.max(60, Math.min(940, node.x))
                    node.y = Math.max(40, Math.min(560, node.y))
                }

                return next
            })
            animFrameRef.current = requestAnimationFrame(simulate)
        }

        animFrameRef.current = requestAnimationFrame(simulate)
        return () => cancelAnimationFrame(animFrameRef.current)
    }, [nodes.length, dragNode])

    // Voice
    const startListening = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { setStatus('Use Chrome for voice support'); return }
        const r = new SR()
        r.continuous = true; r.interimResults = true; r.lang = 'en-US'
        r.onresult = (e: any) => {
            let t = ''
            for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
            setText(t)
        }
        r.onend = () => setListening(false)
        r.start()
        recognitionRef.current = r
        setListening(true)
    }

    const stopListening = () => { recognitionRef.current?.stop(); setListening(false) }

    // Parse dump
    const parseDump = async () => {
        if (!text.trim()) return
        setParsing(true); setParsed([]); setAdded(false); setStatus('')
        try {
            const raw = await callAI(
                `You are ROBOFOCUS. Extract tasks from this brain dump: "${text}"
Return ONLY valid JSON array. No markdown. Each object:
{"name":"string","category":"SCHOOL|WORK|PERSONAL|HEALTH","priority":"HIGH|MEDIUM|LOW","when":"today|tomorrow|this week","follow_up":"one short motivating sentence"}
4-8 items max.`
            )
            const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim()
            setParsed(JSON.parse(clean))
        } catch {
            setParsed(parseLocally(text))
        }
        setParsing(false)
    }

    // Build brain map
    const buildMap = async () => {
        const input = mapText.trim() || text.trim()
        if (!input) return
        setBuildingMap(true)
        setNodes([])
        setAiInsight('')
        setSelectedNode(null)

        let tasks: ParsedTask[] = []
        try {
            const raw = await callAI(
                `Extract tasks/thoughts from: "${input}"
Return ONLY valid JSON array. No markdown. Each:
{"name":"string","category":"SCHOOL|WORK|PERSONAL|HEALTH","priority":"HIGH|MEDIUM|LOW","when":"string","follow_up":"string"}
4-10 items.`
            )
            const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim()
            tasks = JSON.parse(clean)
        } catch {
            tasks = parseLocally(input)
        }

        const mapNodes = buildBrainMap(tasks)
        setNodes(mapNodes)

        // Get AI insight about the mind map
        try {
            const insight = await callAI(
                `Looking at these tasks: ${tasks.map(t => t.name).join(', ')}
In 2 sentences, what pattern do you notice? What should this person focus on first? Be direct.`
            )
            setAiInsight(insight)
        } catch {
            setAiInsight(`You have ${tasks.length} items across ${[...new Set(tasks.map(t => t.category))].length} categories. Focus on your HIGH priority tasks first.`)
        }

        setBuildingMap(false)
    }

    // Drag handlers
    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault()
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const node = nodes.find(n => n.id === nodeId)
        if (!node) return
        setDragNode(nodeId)
        setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y })
    }

    const handleSvgMouseMove = (e: React.MouseEvent) => {
        if (!dragNode) return
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const x = e.clientX - rect.left - dragOffset.x
        const y = e.clientY - rect.top - dragOffset.y
        setNodes(prev => prev.map(n => n.id === dragNode ? { ...n, x: Math.max(60, Math.min(940, x)), y: Math.max(40, Math.min(560, y)), vx: 0, vy: 0 } : n))
    }

    const handleSvgMouseUp = () => setDragNode(null)

    const removeTask = (i: number) => setParsed(parsed.filter((_, idx) => idx !== i))

    const addAll = () => {
        setAdded(true)
        setStatus(`${parsed.length} tasks added to your missions!`)
        setTimeout(() => { setText(''); setParsed([]); setAdded(false); setStatus('') }, 2000)
    }

    const card = {
        background: 'rgba(4, 2, 18, 0.78)',
        border: '1px solid rgba(120, 60, 220, 0.22)',
        backdropFilter: 'blur(24px)',
    }

    const tabStyle = (active: boolean) => ({
        background: active ? 'rgba(120,50,240,0.2)' : 'rgba(255,255,255,0.03)',
        border: active ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#c084fc' : 'rgba(255,255,255,0.3)',
    })

    // Draw connection lines
    const getConnections = () => {
        const lines: { x1: number; y1: number; x2: number; y2: number; color: string; key: string }[] = []
        for (const node of nodes) {
            for (const connId of node.connections) {
                const conn = nodes.find(n => n.id === connId)
                if (!conn) continue
                const color = node.type === 'root' ? 'rgba(168,85,247,0.4)'
                    : categoryColors[node.category || ''] ? `${categoryColors[node.category || '']}50` : 'rgba(168,85,247,0.25)'
                lines.push({ x1: node.x, y1: node.y, x2: conn.x, y2: conn.y, color, key: `${node.id}-${connId}` })
            }
        }
        return lines
    }

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: '#020010' }}>
            <LiquidShader />
            <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(2,0,12,0.60)', zIndex: 1 }} />

            <div className="relative flex min-h-screen" style={{ zIndex: 2 }}>
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen">

                    {/* TOPBAR */}
                    <div className="px-8 py-5 flex items-center justify-between"
                        style={{ borderBottom: '1px solid rgba(100,40,200,0.15)' }}>
                        <div>
                            <h1 className="font-orbitron text-base font-bold tracking-widest text-white">BRAIN DUMP</h1>
                            <p className="font-mono mt-0.5" style={{ color: 'rgba(160,120,255,0.35)', fontSize: '11px' }}>
                                Dump your thoughts — AI organizes and maps them
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('dump')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                style={tabStyle(activeTab === 'dump')}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                DUMP + PARSE
                            </button>
                            <button
                                onClick={() => setActiveTab('map')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest transition-all"
                                style={tabStyle(activeTab === 'map')}
                            >
                                <GitBranch className="w-3.5 h-3.5" />
                                BRAIN MAP
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* ── DUMP + PARSE TAB ── */}
                        {activeTab === 'dump' && (
                            <motion.div
                                key="dump"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex-1 flex overflow-hidden"
                            >
                                {/* LEFT — INPUT */}
                                <div className="flex-1 flex flex-col p-6 gap-4"
                                    style={{ borderRight: '1px solid rgba(80,30,160,0.12)' }}>
                                    <p className="font-mono tracking-widest" style={{ color: 'rgba(120,80,200,0.35)', fontSize: '10px' }}>
                                        — INPUT YOUR THOUGHTS
                                    </p>
                                    <div className="flex-1 rounded-xl overflow-hidden" style={card}>
                                        <textarea
                                            className="w-full h-full bg-transparent font-mono text-sm p-5 resize-none focus:outline-none leading-relaxed"
                                            style={{ minHeight: '320px', color: 'rgba(210,195,255,0.82)' }}
                                            placeholder={"What's on your mind? Tasks, worries, reminders, anything...\n\nTry: \"Finish biology report, email teacher, buy notebooks after school, call mom tonight\""}
                                            value={text}
                                            onChange={e => setText(e.target.value)}
                                        />
                                    </div>
                                    <p className="font-mono" style={{ color: 'rgba(120,80,200,0.25)', fontSize: '10px' }}>
                                        💡 Speak naturally — no formatting needed. AI sorts it out.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={listening ? stopListening : startListening}
                                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs tracking-widest transition-all duration-300"
                                            style={{
                                                background: listening ? 'rgba(120,50,240,0.25)' : 'rgba(60,20,120,0.12)',
                                                border: listening ? '1px solid rgba(168,85,247,0.8)' : '1px solid rgba(100,50,200,0.25)',
                                                color: listening ? '#c084fc' : 'rgba(140,90,220,0.5)',
                                                boxShadow: listening ? '0 0 20px rgba(168,85,247,0.3)' : 'none',
                                            }}>
                                            {listening ? <><MicOff className="w-4 h-4" /> STOP</> : <><Mic className="w-4 h-4" /> SPEAK</>}
                                        </button>
                                        <button
                                            onClick={parseDump}
                                            disabled={parsing || !text.trim()}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all duration-300"
                                            style={{
                                                background: !text.trim() ? 'rgba(60,20,120,0.05)' : 'rgba(100,40,200,0.18)',
                                                border: '1px solid rgba(120,60,220,0.4)',
                                                color: !text.trim() ? 'rgba(140,90,220,0.2)' : '#c084fc',
                                                cursor: !text.trim() ? 'not-allowed' : 'pointer',
                                            }}
                                            onMouseEnter={e => { if (text.trim() && !parsing) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.18)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                            <Sparkles className="w-4 h-4" />
                                            {parsing ? 'PARSING...' : 'PARSE WITH AI →'}
                                        </button>
                                        <button
                                            onClick={() => { if (text.trim()) { setActiveTab('map'); setMapText(text) } }}
                                            disabled={!text.trim()}
                                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs tracking-widest transition-all duration-300"
                                            style={{
                                                background: 'rgba(60,20,120,0.12)',
                                                border: '1px solid rgba(80,40,160,0.25)',
                                                color: text.trim() ? 'rgba(160,120,255,0.6)' : 'rgba(140,90,220,0.2)',
                                                cursor: text.trim() ? 'pointer' : 'not-allowed',
                                            }}
                                            onMouseEnter={e => { if (text.trim()) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80,40,160,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' } }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(60,20,120,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,120,255,0.6)' }}>
                                            <GitBranch className="w-4 h-4" />
                                            MAP IT
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {status && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="text-center py-2.5 rounded-xl font-mono text-xs tracking-widest"
                                                style={{
                                                    background: added ? 'rgba(0,255,157,0.07)' : 'rgba(255,60,172,0.07)',
                                                    border: added ? '1px solid rgba(0,255,157,0.25)' : '1px solid rgba(255,60,172,0.25)',
                                                    color: added ? '#00ff9d' : '#ff3cac',
                                                }}>
                                                {status}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* RIGHT — OUTPUT */}
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="font-mono tracking-widest" style={{ color: 'rgba(120,80,200,0.35)', fontSize: '10px' }}>
                                        — EXTRACTED TASKS
                                    </p>
                                    <div className="flex-1 rounded-xl overflow-y-auto" style={card}>
                                        {parsed.length === 0 && !parsing ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
                                                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                                    style={{ background: 'rgba(80,30,160,0.1)', border: '1px solid rgba(100,50,200,0.18)' }}>
                                                    <Sparkles className="w-6 h-6" style={{ color: 'rgba(140,90,220,0.3)' }} />
                                                </div>
                                                <div>
                                                    <p className="font-mono text-sm mb-1" style={{ color: 'rgba(180,150,255,0.25)' }}>
                                                        Your organized tasks will appear here
                                                    </p>
                                                    <p className="font-mono text-xs" style={{ color: 'rgba(120,90,200,0.2)' }}>
                                                        Type or speak, then hit Parse
                                                    </p>
                                                </div>
                                            </div>
                                        ) : parsing ? (
                                            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                                                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                                                    style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                                                <p className="font-mono tracking-widest" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '11px' }}>
                                                    ANALYSING YOUR THOUGHTS...
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-5 space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-orbitron tracking-widest" style={{ color: 'rgba(140,90,220,0.5)', fontSize: '9px' }}>
                                                        EXTRACTED {parsed.length} TASK{parsed.length !== 1 ? 'S' : ''}
                                                    </span>
                                                    <button onClick={() => setParsed([])}
                                                        className="font-mono text-xs transition-colors"
                                                        style={{ color: 'rgba(180,150,255,0.2)' }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,150,255,0.5)' }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,150,255,0.2)' }}>
                                                        CLEAR ALL
                                                    </button>
                                                </div>
                                                <AnimatePresence>
                                                    {parsed.map((task, i) => (
                                                        <motion.div key={i}
                                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -20, height: 0 }}
                                                            transition={{ duration: 0.25, delay: i * 0.06 }}
                                                            className="p-4 rounded-xl"
                                                            style={{
                                                                background: 'rgba(60,20,120,0.15)',
                                                                border: '1px solid rgba(100,50,200,0.18)',
                                                                borderLeft: `3px solid ${priorityColors[task.priority]}`,
                                                            }}>
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                        <span className="px-2 py-0.5 rounded-full font-mono font-bold"
                                                                            style={{ background: `${categoryColors[task.category]}12`, border: `1px solid ${categoryColors[task.category]}30`, color: categoryColors[task.category], fontSize: '9px' }}>
                                                                            {task.category}
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded-full font-mono"
                                                                            style={{ background: `${priorityColors[task.priority]}10`, border: `1px solid ${priorityColors[task.priority]}25`, color: priorityColors[task.priority], fontSize: '9px' }}>
                                                                            {task.priority}
                                                                        </span>
                                                                        <span className="font-mono" style={{ color: 'rgba(160,130,220,0.3)', fontSize: '9px' }}>{task.when}</span>
                                                                    </div>
                                                                    <div className="font-mono text-xs mb-1.5 leading-relaxed" style={{ color: 'rgba(200,185,255,0.75)' }}>
                                                                        {task.name}
                                                                    </div>
                                                                    <div className="font-mono italic" style={{ color: 'rgba(140,110,220,0.3)', fontSize: '10px' }}>
                                                                        "{task.follow_up}"
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => removeTask(i)}
                                                                    className="transition-colors flex-shrink-0 mt-1"
                                                                    style={{ color: 'rgba(180,150,255,0.15)' }}
                                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff3cac' }}
                                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(180,150,255,0.15)' }}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                    {parsed.length > 0 && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            onClick={addAll}
                                            className="w-full py-4 rounded-xl font-orbitron text-xs tracking-widest flex items-center justify-center gap-2 transition-all duration-300"
                                            style={{
                                                background: added ? 'rgba(0,255,157,0.1)' : 'rgba(100,40,200,0.15)',
                                                border: added ? '1px solid rgba(0,255,157,0.35)' : '1px solid rgba(130,60,240,0.4)',
                                                color: added ? '#00ff9d' : '#c084fc',
                                            }}
                                            onMouseEnter={e => { if (!added) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                                            onMouseLeave={e => { if (!added) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' } }}>
                                            {added
                                                ? <><CheckCircle className="w-4 h-4" /> TASKS ADDED TO DASHBOARD!</>
                                                : <><Plus className="w-4 h-4" /> ADD ALL {parsed.length} TASKS TO MISSIONS →</>
                                            }
                                        </motion.button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ── BRAIN MAP TAB ── */}
                        {activeTab === 'map' && (
                            <motion.div
                                key="map"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex-1 flex flex-col p-6 gap-4"
                            >
                                {nodes.length === 0 ? (
                                    /* MAP SETUP */
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-full max-w-lg space-y-5">
                                            <div className="rounded-2xl p-6" style={card}>
                                                <div className="flex items-start gap-4 mb-5">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                        style={{ background: 'rgba(120,50,240,0.18)', border: '1px solid rgba(160,80,255,0.3)' }}>
                                                        <GitBranch className="w-5 h-5" style={{ color: '#c084fc' }} />
                                                    </div>
                                                    <div>
                                                        <div className="font-orbitron text-sm font-black text-white mb-1">AI BRAIN MAP</div>
                                                        <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(180,155,255,0.55)' }}>
                                                            Visualize your thoughts as an interactive network. The AI organizes your messy mind into a clear map you can explore and drag around.
                                                        </p>
                                                    </div>
                                                </div>

                                                <label className="font-mono text-xs tracking-widest block mb-2"
                                                    style={{ color: 'rgba(140,100,220,0.5)' }}>
                                                    WHAT'S ON YOUR MIND?
                                                </label>
                                                <textarea
                                                    className="w-full font-mono text-sm px-4 py-3 rounded-xl focus:outline-none transition-all resize-none leading-relaxed mb-4"
                                                    style={{
                                                        background: 'rgba(60,20,120,0.12)',
                                                        border: '1px solid rgba(100,50,200,0.22)',
                                                        color: 'rgba(210,195,255,0.82)',
                                                        minHeight: '100px',
                                                    }}
                                                    placeholder="Dump everything here — tasks, worries, ideas, reminders..."
                                                    value={mapText}
                                                    onChange={e => setMapText(e.target.value)}
                                                    onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(160,80,255,0.5)' }}
                                                    onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(100,50,200,0.22)' }}
                                                />

                                                <button
                                                    onClick={buildMap}
                                                    disabled={buildingMap || (!mapText.trim() && !text.trim())}
                                                    className="w-full py-4 font-orbitron text-sm tracking-widest rounded-xl flex items-center justify-center gap-3 transition-all duration-300"
                                                    style={{
                                                        background: 'rgba(100,40,200,0.2)',
                                                        border: '1px solid rgba(140,70,240,0.5)',
                                                        color: '#c084fc',
                                                    }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}>
                                                    <Brain className="w-5 h-5" />
                                                    {buildingMap ? 'BUILDING YOUR BRAIN MAP...' : 'GENERATE BRAIN MAP →'}
                                                </button>
                                            </div>

                                            {buildingMap && (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                                                        style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
                                                    <p className="font-mono tracking-widest" style={{ color: 'rgba(160,120,255,0.4)', fontSize: '11px' }}>
                                                        MAPPING YOUR MIND...
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* MAP DISPLAY */
                                    <div className="flex-1 flex gap-4">

                                        {/* SVG Canvas */}
                                        <div className="flex-1 rounded-2xl overflow-hidden relative"
                                            style={{ ...card, minHeight: '500px' }}>

                                            {/* Legend */}
                                            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                                                {Object.entries(categoryColors).map(([cat, color]) => (
                                                    <div key={cat} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                                                        style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                                                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                                                        <span className="font-mono" style={{ color: `${color}`, fontSize: '8px' }}>{cat}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => { setNodes([]); setAiInsight(''); setSelectedNode(null) }}
                                                className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all"
                                                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}>
                                                <RotateCcw className="w-3 h-3" />
                                                REMAP
                                            </button>

                                            <svg
                                                ref={svgRef}
                                                viewBox="0 0 1000 600"
                                                className="w-full h-full"
                                                style={{ cursor: dragNode ? 'grabbing' : 'default' }}
                                                onMouseMove={handleSvgMouseMove}
                                                onMouseUp={handleSvgMouseUp}
                                                onMouseLeave={handleSvgMouseUp}
                                            >
                                                {/* Connection lines */}
                                                {getConnections().map(line => (
                                                    <line
                                                        key={line.key}
                                                        x1={line.x1} y1={line.y1}
                                                        x2={line.x2} y2={line.y2}
                                                        stroke={line.color}
                                                        strokeWidth="1.5"
                                                        strokeDasharray={line.color.includes('0.4') ? 'none' : '4,4'}
                                                    />
                                                ))}

                                                {/* Nodes */}
                                                {nodes.map(node => {
                                                    const isSelected = selectedNode?.id === node.id
                                                    const color = node.type === 'root' ? '#c084fc'
                                                        : node.category ? categoryColors[node.category] : '#a855f7'
                                                    const r = node.type === 'root' ? 40 : node.type === 'category' ? 28 : 20

                                                    return (
                                                        <g key={node.id}
                                                            transform={`translate(${node.x},${node.y})`}
                                                            style={{ cursor: 'grab' }}
                                                            onMouseDown={e => handleNodeMouseDown(e, node.id)}
                                                            onClick={() => setSelectedNode(isSelected ? null : node)}
                                                        >
                                                            {/* Glow */}
                                                            {(isSelected || node.type === 'root') && (
                                                                <circle r={r + 8} fill="none"
                                                                    stroke={color} strokeWidth="1"
                                                                    strokeOpacity={isSelected ? 0.6 : 0.2}
                                                                />
                                                            )}
                                                            {/* Main circle */}
                                                            <circle r={r}
                                                                fill={`${color}18`}
                                                                stroke={isSelected ? color : `${color}60`}
                                                                strokeWidth={isSelected ? 2 : 1.5}
                                                            />
                                                            {/* Pulse for root */}
                                                            {node.type === 'root' && (
                                                                <circle r={r - 8} fill={`${color}25`} />
                                                            )}
                                                            {/* Label */}
                                                            <text
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                                fill={color}
                                                                fontSize={node.type === 'root' ? 9 : node.type === 'category' ? 8 : 7}
                                                                fontFamily="monospace"
                                                                fontWeight={node.type !== 'task' ? 'bold' : 'normal'}
                                                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                                                            >
                                                                {node.type === 'task' ? (
                                                                    // Word wrap for task nodes
                                                                    node.label.split(' ').reduce((lines: string[], word: string) => {
                                                                        const last = lines[lines.length - 1]
                                                                        if (last && (last + ' ' + word).length <= 14) {
                                                                            lines[lines.length - 1] = last + ' ' + word
                                                                        } else {
                                                                            lines.push(word)
                                                                        }
                                                                        return lines
                                                                    }, []).slice(0, 3).map((line: string, i: number, arr: string[]) => (
                                                                        <tspan key={i} x="0" dy={i === 0 ? -(arr.length - 1) * 6 : 12}>
                                                                            {line}
                                                                        </tspan>
                                                                    ))
                                                                ) : (
                                                                    <tspan>{node.label}</tspan>
                                                                )}
                                                            </text>
                                                        </g>
                                                    )
                                                })}
                                            </svg>
                                        </div>

                                        {/* RIGHT PANEL */}
                                        <div className="w-64 flex flex-col gap-4 flex-shrink-0">

                                            {/* AI Insight */}
                                            {aiInsight && (
                                                <div className="rounded-2xl p-4" style={{ ...card, borderLeft: '2px solid rgba(168,85,247,0.5)' }}>
                                                    <div className="font-orbitron tracking-widest mb-2"
                                                        style={{ color: 'rgba(160,120,255,0.5)', fontSize: '8px' }}>
                                                        ROBOFOCUS READS YOUR MIND
                                                    </div>
                                                    <p className="font-mono text-xs leading-relaxed"
                                                        style={{ color: 'rgba(190,170,255,0.65)' }}>
                                                        {aiInsight}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Selected node detail */}
                                            <AnimatePresence>
                                                {selectedNode && (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: 16 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 16 }}
                                                        className="rounded-2xl p-4"
                                                        style={card}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="font-orbitron tracking-widest"
                                                                style={{ color: 'rgba(160,120,255,0.5)', fontSize: '8px' }}>
                                                                NODE DETAIL
                                                            </div>
                                                            <button onClick={() => setSelectedNode(null)}
                                                                style={{ color: 'rgba(160,130,220,0.3)' }}
                                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,180,255,0.6)' }}
                                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,130,220,0.3)' }}>
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        {selectedNode.category && (
                                                            <div className="inline-flex items-center px-2 py-1 rounded-full mb-2"
                                                                style={{
                                                                    background: `${categoryColors[selectedNode.category]}12`,
                                                                    border: `1px solid ${categoryColors[selectedNode.category]}30`,
                                                                    color: categoryColors[selectedNode.category],
                                                                    fontSize: '9px',
                                                                    fontFamily: 'monospace',
                                                                }}>
                                                                {selectedNode.category}
                                                            </div>
                                                        )}
                                                        <div className="font-mono text-sm leading-relaxed mb-3"
                                                            style={{ color: 'rgba(210,195,255,0.82)' }}>
                                                            {selectedNode.label}
                                                        </div>
                                                        <div className="font-mono mb-3"
                                                            style={{ color: 'rgba(140,110,200,0.35)', fontSize: '10px' }}>
                                                            Type: {selectedNode.type.toUpperCase()}
                                                            {selectedNode.connections.length > 0 && ` · ${selectedNode.connections.length} connections`}
                                                        </div>
                                                        {selectedNode.type === 'task' && (
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => { setActiveTab('dump'); setText(selectedNode.label) }}
                                                                    className="w-full py-2 font-orbitron text-xs tracking-widest rounded-xl transition-all"
                                                                    style={{ background: 'rgba(100,40,200,0.12)', border: '1px solid rgba(140,70,240,0.3)', color: 'rgba(192,132,252,0.6)' }}
                                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,50,240,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#c084fc' }}
                                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,40,200,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(192,132,252,0.6)' }}>
                                                                    PARSE THIS TASK
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Stats */}
                                            <div className="rounded-2xl p-4" style={card}>
                                                <div className="font-orbitron tracking-widest mb-3"
                                                    style={{ color: 'rgba(140,90,220,0.45)', fontSize: '8px' }}>
                                                    MAP STATS
                                                </div>
                                                <div className="space-y-2">
                                                    {[
                                                        { label: 'TOTAL NODES', value: nodes.length },
                                                        { label: 'TASK NODES', value: nodes.filter(n => n.type === 'task').length },
                                                        { label: 'CATEGORIES', value: nodes.filter(n => n.type === 'category').length },
                                                    ].map(s => (
                                                        <div key={s.label} className="flex justify-between items-center">
                                                            <span className="font-mono" style={{ color: 'rgba(140,100,220,0.4)', fontSize: '9px' }}>
                                                                {s.label}
                                                            </span>
                                                            <span className="font-orbitron" style={{ color: '#c084fc', fontSize: '14px' }}>
                                                                {s.value}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Category breakdown */}
                                            <div className="rounded-2xl p-4" style={card}>
                                                <div className="font-orbitron tracking-widest mb-3"
                                                    style={{ color: 'rgba(140,90,220,0.45)', fontSize: '8px' }}>
                                                    BY CATEGORY
                                                </div>
                                                <div className="space-y-2">
                                                    {Object.entries(categoryColors).map(([cat, color]) => {
                                                        const count = nodes.filter(n => n.type === 'task' && n.category === cat).length
                                                        if (count === 0) return null
                                                        return (
                                                            <div key={cat} className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                                                <span className="font-mono flex-1" style={{ color: 'rgba(160,130,220,0.45)', fontSize: '9px' }}>
                                                                    {cat}
                                                                </span>
                                                                <span className="font-orbitron" style={{ color, fontSize: '12px' }}>{count}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}