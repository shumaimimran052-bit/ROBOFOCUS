import {
    DISTRACTION_TYPES,
    type DistractionType,
    type FocusSessionRecord,
} from "./types";

const KEY = "robofocus.sessions.v1";

export function loadSessions(): FocusSessionRecord[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as FocusSessionRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveSession(record: FocusSessionRecord): void {
    if (typeof window === "undefined") return;
    const sessions = [record, ...loadSessions()];
    try {
        window.localStorage.setItem(KEY, JSON.stringify(sessions));
    } catch {
        const slim = sessions.map((s, i) => (i === 0 ? s : { ...s, proofImage: undefined }));
        try {
            window.localStorage.setItem(KEY, JSON.stringify(slim));
        } catch {
            /* give up silently */
        }
    }
}

export interface FocusStats {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    totalFocusMinutes: number;
    avgFocusScore: number;
    mostCommonDistraction: DistractionType | null;
    distractionTotals: Record<DistractionType, number>;
}

export function computeStats(sessions: FocusSessionRecord[]): FocusStats {
    const totals = Object.fromEntries(DISTRACTION_TYPES.map((t) => [t, 0])) as Record<DistractionType, number>;
    DistractionType,
        number
        >;
    let successful = 0;
    let minutes = 0;
    let scoreSum = 0;
    for (const s of sessions) {
        if (s.success) successful += 1;
        minutes += s.durationMin;
        scoreSum += s.focusScore;
        for (const t of DISTRACTION_TYPES) totals[t] += s.counts?.[t] ?? 0;
    }
    let mostCommon: DistractionType | null = null;
    for (const t of DISTRACTION_TYPES) {
        if (totals[t] > 0 && (mostCommon === null || totals[t] > totals[mostCommon])) mostCommon = t;
    }
    return {
        total: sessions.length,
        successful,
        failed: sessions.length - successful,
        successRate: sessions.length ? Math.round((successful / sessions.length) * 100) : 0,
        totalFocusMinutes: minutes,
        avgFocusScore: sessions.length ? Math.round(scoreSum / sessions.length) : 0,
        mostCommonDistraction: mostCommon,
        distractionTotals: totals,
    };
}