// src/lib/robofocus.ts
// ROBOFOCUS 2.0 shared helpers: settings, streaks, daily quests, nudges, AI helper.
// This file only READS the existing storage keys (rf_tasks, rf_xp, rf_mood, robofocus_sessions)
// and writes its own keys (rf_settings, rf_v2, rf_nudge_*). It never touches Focus Mode code.

export interface RFTask {
    id: number
    name: string
    meta: string
    priority: 'high' | 'med' | 'low'
    done: boolean
    postponeCount: number
    category: string
}

export interface RFSession {
    id: string
    mission: string
    duration: number // seconds
    completedAt: string
    status: 'SUCCESS' | 'INCOMPLETE' | 'FAILED'
    distractionCount: number
}

// ── generic safe storage helpers ────────────────────────────
const readJSON = <T>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

const writeJSON = (key: string, value: unknown): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        /* ignore quota errors */
    }
}

export const dateKey = (d: Date = new Date()): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export const readTasks = (): RFTask[] => {
    const t = readJSON<RFTask[]>('rf_tasks', [])
    return Array.isArray(t) ? t : []
}

export const readSessions = (): RFSession[] => {
    const s = readJSON<RFSession[]>('robofocus_sessions', [])
    return Array.isArray(s) ? s : []
}

// ── settings (shared with SettingsPage) ─────────────────────
export const DEFAULT_TOGGLES = {
    nudges: true,
    briefing: true,
    voice: true,
    taskReminders: true,
    deadlineWarnings: true,
    streakAlerts: false,
    breakReminder: true,
    autoStart: false,
    browserNotifications: false,
}

export interface RFSettings {
    toggles: typeof DEFAULT_TOGGLES
    wakeTime: string
    sleepTime: string
    dndTime: string
}

export const loadSettings = (): RFSettings => {
    const saved = readJSON<Partial<RFSettings>>('rf_settings', {})
    return {
        toggles: { ...DEFAULT_TOGGLES, ...(saved.toggles || {}) },
        wakeTime: saved.wakeTime || '07:00',
        sleepTime: saved.sleepTime || '23:00',
        dndTime: saved.dndTime || '23:00',
    }
}

export const saveSettings = (s: RFSettings): void => writeJSON('rf_settings', s)

// ── v2 store: task log, active days, claimed quests ─────────
interface V2Store {
    taskLog: Record<string, number>
    activeDays: string[]
    claimed: { date: string; ids: string[] }
}

const readV2 = (): V2Store => {
    const s = readJSON<Partial<V2Store>>('rf_v2', {})
    return {
        taskLog: s.taskLog || {},
        activeDays: Array.isArray(s.activeDays) ? s.activeDays : [],
        claimed: s.claimed || { date: '', ids: [] },
    }
}

const writeV2 = (s: V2Store): void => {
    const keys = Object.keys(s.taskLog).sort()
    if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(k => { delete s.taskLog[k] })
    if (s.activeDays.length > 400) s.activeDays = s.activeDays.slice(-400)
    writeJSON('rf_v2', s)
}

export const markActiveToday = (): void => {
    const s = readV2()
    const today = dateKey()
    if (!s.activeDays.includes(today)) {
        s.activeDays.push(today)
        writeV2(s)
    }
}

export const recordTaskCompleted = (delta: number): void => {
    const s = readV2()
    const today = dateKey()
    s.taskLog[today] = Math.max(0, (s.taskLog[today] || 0) + delta)
    if (delta > 0 && !s.activeDays.includes(today)) s.activeDays.push(today)
    writeV2(s)
}

export const tasksCompletedOn = (key: string): number => readV2().taskLog[key] || 0

export const getTaskLog = (): Record<string, number> => readV2().taskLog

const hasMoodToday = (): boolean => {
    const m = readJSON<{ timestamp?: string } | null>('rf_mood', null)
    if (!m || !m.timestamp) return false
    return new Date(m.timestamp).toDateString() === new Date().toDateString()
}

// every day the user did something (task, mood check-in, successful focus session, body double)
export const getActiveDaySet = (): Set<string> => {
    const set = new Set<string>(readV2().activeDays)
    readSessions().forEach(s => {
        if (s.status === 'SUCCESS' && s.completedAt) set.add(dateKey(new Date(s.completedAt)))
    })
    return set
}

export interface StreakInfo {
    current: number
    best: number
    activeToday: boolean
}

export const getStreakInfo = (): StreakInfo => {
    const set = getActiveDaySet()
    const today = new Date()
    const activeToday = set.has(dateKey(today))
    const cursor = new Date(today)
    if (!activeToday) cursor.setDate(cursor.getDate() - 1)
    let current = 0
    while (set.has(dateKey(cursor))) {
        current += 1
        cursor.setDate(cursor.getDate() - 1)
    }
    const days = Array.from(set).sort()
    let best = 0
    let run = 0
    let prev: Date | null = null
    days.forEach(k => {
        const [y, m, d] = k.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        if (prev) {
            const diff = Math.round((dt.getTime() - prev.getTime()) / 86400000)
            run = diff === 1 ? run + 1 : 1
        } else {
            run = 1
        }
        if (run > best) best = run
        prev = dt
    })
    return { current, best: Math.max(best, current), activeToday }
}

// ── daily quests ────────────────────────────────────────────
export interface QuestStatus {
    id: string
    label: string
    desc: string
    xp: number
    progress: number
    goal: number
    done: boolean
    claimed: boolean
}

const todaySuccessSessions = (): number => {
    const today = new Date().toDateString()
    return readSessions().filter(s => s.status === 'SUCCESS' && new Date(s.completedAt).toDateString() === today).length
}

export const getQuests = (): QuestStatus[] => {
    const v2 = readV2()
    const today = dateKey()
    const claimedIds = v2.claimed.date === today ? v2.claimed.ids : []
    const tasksDone = v2.taskLog[today] || 0
    const mood = hasMoodToday() ? 1 : 0
    const focus = todaySuccessSessions()
    const base = [
        { id: 'tasks', label: 'Complete 2 missions', desc: 'Finish two tasks today', xp: 20, progress: Math.min(tasksDone, 2), goal: 2 },
        { id: 'mood', label: 'Mood check-in', desc: 'Tell ROBOFOCUS how you feel', xp: 10, progress: mood, goal: 1 },
        { id: 'focus', label: 'One focus session', desc: 'Finish a successful focus session', xp: 30, progress: Math.min(focus, 1), goal: 1 },
    ]
    return base.map(q => ({
        ...q,
        done: q.progress >= q.goal,
        claimed: claimedIds.includes(q.id),
    }))
}

// returns the XP to award, or 0 if the quest is not complete / already claimed
export const claimQuest = (id: string): number => {
    const quest = getQuests().find(q => q.id === id)
    if (!quest || !quest.done || quest.claimed) return 0
    const v2 = readV2()
    const today = dateKey()
    const ids = v2.claimed.date === today ? v2.claimed.ids : []
    v2.claimed = { date: today, ids: [...ids, id] }
    writeV2(v2)
    return quest.xp
}

// add XP straight to storage (used by pages that do not own the XP state, e.g. Body Doubling)
export const addXpToStorage = (amount: number): void => {
    const current = parseInt(localStorage.getItem('rf_xp') || '0')
    try {
        localStorage.setItem('rf_xp', String((isNaN(current) ? 0 : current) + amount))
    } catch {
        /* ignore */
    }
}

// mark a task done from outside the dashboard (Body Doubling summary)
export const completeTaskInStorage = (taskId: number): boolean => {
    const tasks = readTasks()
    const target = tasks.find(t => t.id === taskId)
    if (!target || target.done) return false
    writeJSON('rf_tasks', tasks.map(t => (t.id === taskId ? { ...t, done: true } : t)))
    recordTaskCompleted(1)
    addXpToStorage(25)
    return true
}

// ── nudges ──────────────────────────────────────────────────
export interface Nudge {
    id: string
    message: string
    action?: { label: string; path: string }
}

const minutesOf = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
}

const inQuietHours = (s: RFSettings): boolean => {
    const now = new Date()
    const cur = now.getHours() * 60 + now.getMinutes()
    const dnd = minutesOf(s.dndTime)
    const wake = minutesOf(s.wakeTime)
    if (dnd === wake) return false
    return dnd > wake ? cur >= dnd || cur < wake : cur >= dnd && cur < wake
}

const NUDGE_COOLDOWN_MS = 3 * 60 * 60 * 1000

export const snoozeNudges = (minutes: number): void => {
    try {
        localStorage.setItem('rf_nudge_snooze', String(Date.now() + minutes * 60000))
    } catch {
        /* ignore */
    }
}

const isSnoozed = (): boolean => {
    const until = parseInt(localStorage.getItem('rf_nudge_snooze') || '0')
    return !isNaN(until) && Date.now() < until
}

const recentlyShown = (id: string): boolean => {
    const log = readJSON<Record<string, number>>('rf_nudge_log', {})
    return Date.now() - (log[id] || 0) < NUDGE_COOLDOWN_MS
}

export const logNudgeShown = (id: string): void => {
    const log = readJSON<Record<string, number>>('rf_nudge_log', {})
    log[id] = Date.now()
    writeJSON('rf_nudge_log', log)
}

// returns the single most useful nudge right now, or null
export const pickNudge = (): Nudge | null => {
    const settings = loadSettings()
    const t = settings.toggles
    if (!t.nudges || isSnoozed() || inQuietHours(settings)) return null

    const tasks = readTasks()
    const pending = tasks.filter(x => !x.done)
    const hour = new Date().getHours()
    const candidates: Nudge[] = []

    if (t.deadlineWarnings && hour >= 16) {
        const dueToday = pending.filter(x => x.meta === 'TODAY' || (x.meta === 'DUE TOMORROW' && hour >= 20))
        if (dueToday.length > 0) {
            candidates.push({
                id: 'deadline',
                message: `${dueToday.length} mission${dueToday.length > 1 ? 's are' : ' is'} still open for today. Start with "${dueToday[0].name}".`,
                action: { label: 'OPEN MISSIONS', path: '/dashboard' },
            })
        }
    }

    if (t.taskReminders) {
        const stuck = pending.filter(x => x.postponeCount >= 3).sort((a, b) => b.postponeCount - a.postponeCount)[0]
        if (stuck) {
            candidates.push({
                id: `postponed-${stuck.id}`,
                message: `"${stuck.name}" has been postponed ${stuck.postponeCount} times. Want to break it into tiny steps?`,
                action: { label: 'BREAK IT DOWN', path: '/mission' },
            })
        }
    }

    const streak = getStreakInfo()
    if (t.streakAlerts && !streak.activeToday && streak.current >= 2 && hour >= 18) {
        candidates.push({
            id: 'streak',
            message: `Your ${streak.current}-day streak ends tonight. One small mission keeps it alive.`,
            action: { label: 'KEEP STREAK', path: '/dashboard' },
        })
    }

    if (t.taskReminders && hour >= 11 && hour < 21 && !streak.activeToday && pending.length > 0) {
        const todaySessions = readSessions().filter(s => new Date(s.completedAt).toDateString() === new Date().toDateString())
        if (todaySessions.length === 0) {
            candidates.push({
                id: 'not-started',
                message: `You haven't started anything today. Pick the smallest mission and give it 5 minutes.`,
                action: { label: 'START WITH A FRIEND', path: '/bodydouble' },
            })
        }
    }

    return candidates.find(c => !recentlyShown(c.id)) || null
}

export const sendBrowserNotification = (message: string): void => {
    try {
        if (!loadSettings().toggles.browserNotifications) return
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        if (!document.hidden) return
        new Notification('ROBOFOCUS', { body: message })
    } catch {
        /* ignore */
    }
}

// ── AI helper (Groq first because the Assistant uses it, then OpenRouter) ──
export const askAI = async (prompt: string, maxTokens = 160): Promise<string> => {
    const groqKey = import.meta.env.VITE_GROQ_KEY
    const orKey = import.meta.env.VITE_OPENROUTER_KEY
    if (groqKey) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.7,
            }),
        })
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    }
    if (orKey) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'ROBOFOCUS',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.7,
            }),
        })
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    }
    throw new Error('No API key')
}