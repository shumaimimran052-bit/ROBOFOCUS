import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { ObjectDetection } from "@tensorflow-models/coco-ssd";

const MEDIAPIPE_VERSION = "0.10.35";
const FACE_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type DistractionType = "phone" | "absence" | "looking_away" | "talking" | "inactive";

export const DETECTION_THRESHOLDS: Record<DistractionType, number> = {
    phone: 20,
    absence: 20,
    looking_away: 20,
    talking: 20,
    inactive: 40,
};

export const DISTRACTION_LABELS: Record<DistractionType, string> = {
    phone: "Phone detected",
    absence: "Left the camera",
    looking_away: "Looking away",
    talking: "Talking",
    inactive: "Inactive / too still",
};

const TICK_MS = 100;
const OBJECT_DETECT_INTERVAL_MS = 1000;
const PHONE_SCORE_MIN = 0.45;
const PHONE_PERSIST_MS = 2500;
const COOLDOWN_MS = 15000;
const CALIBRATION_MS = 30000;
const MOVE_SAMPLE_MS = 500;

const YAW_MIN = 0.3;
const YAW_MAX = 0.7;
const PITCH_MIN = 0.35;
const PITCH_MAX = 0.8;
const GAZE_MIN = 0.22;
const GAZE_MAX = 0.78;
const JAW_WINDOW_MS = 3000;
const JAW_RANGE_MIN = 0.07;
const JAW_STD_MIN = 0.02;
const STILL_MIN = 0.0015;
const STILL_MAX = 0.02;
const STILL_BASELINE_FRACTION = 0.25;

export interface EngineWarning {
    type: DistractionType;
    seconds: number;
    threshold: number;
}

export interface EngineStatus {
    faceDetected: boolean;
    phoneVisible: boolean;
    lookingAway: boolean;
    talking: boolean;
    calibrating: boolean;
    movement: number;
    stillThreshold: number;
    warnings: EngineWarning[];
}

interface Pt { x: number; y: number; }

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const ema = (prev: number, next: number, alpha: number) => prev + alpha * (next - prev);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class FocusDetectionEngine {
    private video: HTMLVideoElement | null = null;
    private faceLandmarker: FaceLandmarker | null = null;
    private objectModel: ObjectDetection | null = null;

    private running = false;
    private paused = false;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private startedAt = 0;

    private conditionSince: Partial<Record<DistractionType, number>> = {};
    private cooldownUntil: Partial<Record<DistractionType, number>> = {};

    private lastPhoneSeenAt = -Infinity;
    private lastObjectDetectAt = 0;
    private objectBusy = false;
    private phoneVisibleNow = false;

    private faceDetected = false;
    private yawEma = 0.5;
    private pitchEma = 0.55;
    private gazeEma = 0.5;
    private lookingAwayNow = false;

    private jawBuffer: { t: number; v: number }[] = [];
    private talkingNow = false;

    private lastSamplePts: Pt[] | null = null;
    private lastSampleAt = 0;
    private movementEma: number | null = null;
    private calibMoves: number[] = [];
    private calibrating = true;
    private stillThreshold = 0.002;

    private lastStatusEmit = 0;

    onDistraction: ((type: DistractionType) => void) | null = null;
    onStatus: ((status: EngineStatus) => void) | null = null;

    async init(video: HTMLVideoElement, onProgress?: (msg: string) => void): Promise<void> {
        this.video = video;
        onProgress?.("Loading face analysis model…");

        const { FilesetResolver, FaceLandmarker: FL } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(
            `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
        );

        const makeOpts = (delegate: "GPU" | "CPU") => ({
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
            runningMode: "VIDEO" as const,
            numFaces: 1,
            outputFaceBlendshapes: true,
        });

        try {
            this.faceLandmarker = await FL.createFromOptions(fileset, makeOpts("GPU"));
        } catch {
            this.faceLandmarker = await FL.createFromOptions(fileset, makeOpts("CPU"));
        }

        onProgress?.("Loading phone detection model…");
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        this.objectModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });

        onProgress?.("Calibrating…");
    }

    start(): void {
        if (this.running || !this.video) return;
        this.running = true;
        this.paused = false;
        this.startedAt = performance.now();
        this.resetTransient();
        this.intervalId = setInterval(this.tick, TICK_MS);
    }

    pause(): void { this.paused = true; }

    resume(): void {
        this.paused = false;
        this.resetTransient();
    }

    stop(): void {
        this.running = false;
        if (this.intervalId !== null) clearInterval(this.intervalId);
        this.intervalId = null;
    }

    destroy(): void {
        this.stop();
        try { this.faceLandmarker?.close(); } catch { /* noop */ }
        try { this.objectModel?.dispose(); } catch { /* noop */ }
        this.faceLandmarker = null;
        this.objectModel = null;
    }

    private resetTransient(): void {
        this.conditionSince = {};
        this.lastPhoneSeenAt = -Infinity;
        this.phoneVisibleNow = false;
        this.jawBuffer = [];
        this.lastSamplePts = null;
        this.talkingNow = false;
        this.lookingAwayNow = false;
        this.yawEma = 0.5;
        this.pitchEma = 0.55;
        this.gazeEma = 0.5;
    }

    private tick = (): void => {
        if (!this.running || !this.video) return;
        const now = performance.now();
        if (this.paused) { this.emitStatus(now); return; }

        let result: FaceLandmarkerResult | null = null;
        if (this.faceLandmarker && this.video.readyState >= 2) {
            try {
                result = this.faceLandmarker.detectForVideo(this.video, now);
            } catch { result = null; }
        }

        const face = result?.faceLandmarks?.[0] ?? null;
        this.faceDetected = !!face && face.length > 460;

        if (face && this.faceDetected) {
            this.updateGaze(face);
            this.updateTalking(result!, now);
            this.updateMovement(face, now);
        } else {
            this.lookingAwayNow = false;
            this.talkingNow = false;
            this.lastSamplePts = null;
        }

        this.maybeDetectObjects(now);
        this.phoneVisibleNow = now - this.lastPhoneSeenAt < PHONE_PERSIST_MS;

        this.updateCondition("absence", !this.faceDetected, now);
        this.updateCondition("phone", this.phoneVisibleNow, now);
        this.updateCondition("looking_away", this.faceDetected && this.lookingAwayNow && !this.phoneVisibleNow, now);
        this.updateCondition("talking", this.faceDetected && this.talkingNow, now);
        const inactive =
            this.faceDetected &&
            !this.calibrating &&
            this.movementEma !== null &&
            this.movementEma < this.stillThreshold &&
            !this.lookingAwayNow;
        this.updateCondition("inactive", inactive, now);

        this.emitStatus(now);
    };

    private maybeDetectObjects(now: number): void {
        if (
            !this.objectModel || !this.video || this.objectBusy ||
            this.video.readyState < 2 ||
            now - this.lastObjectDetectAt < OBJECT_DETECT_INTERVAL_MS
        ) return;
        this.lastObjectDetectAt = now;
        this.objectBusy = true;
        this.objectModel
            .detect(this.video)
            .then((preds) => {
                const phone = preds.find((p) => p.class === "cell phone" && p.score >= PHONE_SCORE_MIN);
                if (phone) this.lastPhoneSeenAt = performance.now();
            })
            .catch(() => { /* skip frame */ })
            .finally(() => { this.objectBusy = false; });
    }

    private updateGaze(face: Pt[]): void {
        const nose = face[1];
        const left = face[234];
        const right = face[454];
        const top = face[10];
        const chin = face[152];
        const yaw = (nose.x - left.x) / Math.max(1e-6, right.x - left.x);
        const pitch = (nose.y - top.y) / Math.max(1e-6, chin.y - top.y);
        this.yawEma = ema(this.yawEma, yaw, 0.25);
        this.pitchEma = ema(this.pitchEma, pitch, 0.25);

        let gazeOff = false;
        const leftIris = face[468];
        const rightIris = face[473];
        if (leftIris && rightIris) {
            const gl = (leftIris.x - face[33].x) / Math.max(1e-6, face[133].x - face[33].x);
            const gr = (rightIris.x - face[362].x) / Math.max(1e-6, face[263].x - face[362].x);
            this.gazeEma = ema(this.gazeEma, (gl + gr) / 2, 0.25);
            gazeOff = this.gazeEma < GAZE_MIN || this.gazeEma > GAZE_MAX;
        }

        const headOff =
            this.yawEma < YAW_MIN || this.yawEma > YAW_MAX ||
            this.pitchEma < PITCH_MIN || this.pitchEma > PITCH_MAX;
        this.lookingAwayNow = headOff || gazeOff;
    }

    private updateTalking(result: FaceLandmarkerResult, now: number): void {
        const shapes = result.faceBlendshapes?.[0]?.categories;
        const jaw = shapes?.find((c) => c.categoryName === "jawOpen")?.score ?? 0;
        this.jawBuffer.push({ t: now, v: jaw });
        while (this.jawBuffer.length && this.jawBuffer[0].t < now - JAW_WINDOW_MS) {
            this.jawBuffer.shift();
        }
        if (this.jawBuffer.length < 12) { this.talkingNow = false; return; }
        let min = Infinity, max = -Infinity, sum = 0;
        for (const s of this.jawBuffer) {
            min = Math.min(min, s.v);
            max = Math.max(max, s.v);
            sum += s.v;
        }
        const mean = sum / this.jawBuffer.length;
        let varSum = 0;
        for (const s of this.jawBuffer) varSum += (s.v - mean) ** 2;
        const std = Math.sqrt(varSum / this.jawBuffer.length);
        this.talkingNow = max - min > JAW_RANGE_MIN && std > JAW_STD_MIN;
    }

    private updateMovement(face: Pt[], now: number): void {
        if (now - this.lastSampleAt < MOVE_SAMPLE_MS) return;
        const indices = [1, 10, 152, 234, 454];
        const pts = indices.map((i) => ({ x: face[i].x, y: face[i].y }));
        const scale = dist(face[33], face[263]);
        if (this.lastSamplePts && scale > 1e-6) {
            let sum = 0;
            for (let i = 0; i < pts.length; i++) sum += dist(pts[i], this.lastSamplePts[i]);
            const move = sum / pts.length / scale;
            this.movementEma = this.movementEma === null ? move : ema(this.movementEma, move, 0.3);
            if (this.calibrating) {
                this.calibMoves.push(move);
                if (now - this.startedAt > CALIBRATION_MS && this.calibMoves.length >= 10) {
                    const sorted = [...this.calibMoves].sort((a, b) => a - b);
                    const median = sorted[Math.floor(sorted.length / 2)];
                    this.stillThreshold = clamp(median * STILL_BASELINE_FRACTION, STILL_MIN, STILL_MAX);
                    this.calibrating = false;
                }
            }
        }
        this.lastSamplePts = pts;
        this.lastSampleAt = now;
    }

    private updateCondition(type: DistractionType, active: boolean, now: number): void {
        if (!active) { delete this.conditionSince[type]; return; }
        if (now < (this.cooldownUntil[type] ?? 0)) return;
        if (this.conditionSince[type] === undefined) {
            this.conditionSince[type] = now;
            return;
        }
        const elapsed = (now - this.conditionSince[type]!) / 1000;
        if (elapsed >= DETECTION_THRESHOLDS[type]) {
            delete this.conditionSince[type];
            this.cooldownUntil[type] = now + COOLDOWN_MS;
            this.onDistraction?.(type);
        }
    }

    private emitStatus(now: number): void {
        if (now - this.lastStatusEmit < 300) return;
        this.lastStatusEmit = now;
        const warnings: EngineWarning[] = [];
        for (const [type, since] of Object.entries(this.conditionSince)) {
            if (since === undefined) continue;
            const seconds = (now - since) / 1000;
            if (seconds >= 3) {
                warnings.push({
                    type: type as DistractionType,
                    seconds,
                    threshold: DETECTION_THRESHOLDS[type as DistractionType],
                });
            }
        }
        this.onStatus?.({
            faceDetected: this.faceDetected,
            phoneVisible: this.phoneVisibleNow,
            lookingAway: this.lookingAwayNow,
            talking: this.talkingNow,
            calibrating: this.calibrating,
            movement: this.movementEma ?? 0,
            stillThreshold: this.stillThreshold,
            warnings,
        });
    }
}