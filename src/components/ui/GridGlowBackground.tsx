import React, { useRef, useEffect } from "react";

interface GridGlowBackgroundProps {
    children: React.ReactNode;
    backgroundColor?: string;
    gridColor?: string;
    gridSize?: number;
    glowColors?: string[];
    glowCount?: number;
    className?: string;
}

export const GridGlowBackground: React.FC<GridGlowBackgroundProps> = ({
    children,
    backgroundColor = "#050008",
    gridColor = "rgba(168, 85, 247, 0.06)",
    gridSize = 50,
    glowColors = ["#4A00E0", "#7c3aed", "#a855f7"],
    glowCount = 8,
    className = "",
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;

        interface GlowData {
            x: number; y: number; targetX: number; targetY: number;
            radius: number; speed: number; color: string; alpha: number;
        }

        const createGlow = (): GlowData => ({
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize,
            targetX: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            targetY: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize,
            radius: Math.random() * 80 + 40,
            speed: Math.random() * 0.015 + 0.005,
            color: glowColors[Math.floor(Math.random() * glowColors.length)],
            alpha: 0,
        });

        let glows: GlowData[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            glows = Array.from({ length: glowCount }, createGlow);
        };

        const drawGrid = () => {
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            for (let x = 0; x <= canvas.width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y <= canvas.height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            glows.forEach(g => {
                g.x += (g.targetX - g.x) * g.speed;
                g.y += (g.targetY - g.y) * g.speed;
                if (Math.abs(g.targetX - g.x) < 1 && Math.abs(g.targetY - g.y) < 1) {
                    g.targetX = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
                    g.targetY = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
                }
                if (g.alpha < 0.6) g.alpha += 0.005;
                ctx.globalAlpha = g.alpha;
                const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
                grad.addColorStop(0, g.color);
                grad.addColorStop(1, "transparent");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalAlpha = 1;
            });
            animationId = requestAnimationFrame(animate);
        };

        resize();
        animate();
        window.addEventListener("resize", resize);
        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationId);
        };
    }, [gridColor, gridSize, glowColors, glowCount]);

    return (
        <div className={`relative min-h-screen w-full ${className}`} style={{ backgroundColor }}>
            <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full opacity-60" />
            <div className="relative z-10 w-full">{children}</div>
        </div>
    );
};

export default GridGlowBackground;