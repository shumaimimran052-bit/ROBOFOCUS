export type DistractionType =
    | "phone"
    | "absence"
    | "looking_away"
    | "talking"
    | "inactive";

export const DISTRACTION_TYPES: DistractionType[] = [
    "phone",
    "absence",
    "looking_away",
    "talking",
    "inactive",
];

export const DISTRACTION_LABELS: Record<DistractionType, string> = {
    phone: "Phone detected",
    absence: "Left the camera",
    looking_away: "Looking away",
    talking: "Talking",
    inactive: "Inactive / too still",
};

export const DISTRACTION_PENALTIES: Record<DistractionType, number> = {
    phone: 10,
    absence: 8,
    looking_away: 6,
    talking: 6,
    inactive: 5,
};

export interface SessionConfig {
    task: string;
    durationMin: number;
    distractionLimit: number;
}

export type DistractionCounts = Record<DistractionType, number>;

export const emptyCounts = (): DistractionCounts => ({
    phone: 0,
    absence: 0,
    looking_away: 0,
    talking: 0,
    inactive: 0,
});

export const totalDistractions = (c: DistractionCounts): number =>
    DISTRACTION_TYPES.reduce((sum, t) => sum + c[t], 0);

export const focusScore = (c: DistractionCounts): number =>
    Math.max(
        0,
        Math.round(
            100 -
            DISTRACTION_TYPES.reduce(
                (sum, t) => sum + c[t] * DISTRACTION_PENALTIES[t],
                0,
            ),
        ),
    );

export type FailReason = "distractions" | "abandoned" | "no_proof";

export interface FocusSessionRecord {
    id: string;
    task: string;
    durationMin: number;
    success: boolean;
    failReason?: FailReason;
    totalDistractions: number;
    counts: DistractionCounts;
    focusScore: number;
    date: string;
    proofImage?: string;
}