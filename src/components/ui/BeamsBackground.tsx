import { useEffect, useRef } from "react"
import { cn } from "../../lib/utils"

interface Beam {
    x: number; y: number; width: number; length: number
    angle: number; speed: number; opacity: number
    hue: number; pulse: number; pulseSpeed: number
}

function createBeam(width: number, height: number): Beam {
    return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle: -35 + Math.random() * 10,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.16,
        hue: 260 + Math.random() * 60,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
    }
}

interface BeamsBackgroundProps {
    className?: string
    children?: React.ReactNode
    intensity?: "subtle" | "medium" | "strong"
}

export function BeamsBackground({ className, children, intensity = "strong" }: BeamsBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const beamsRef = useRef<Beam[]>([])
    const rafRef = useRef<number>(0)

    const opacityMap = { subtle: 0.7, medium: 0.85, strong: 1 }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            canvas.width = window.innerWidth * dpr
            canvas.height = window.innerHeight * dpr
            canvas.style.width = `${window.innerWidth}px`
            canvas.style.height = `${window.innerHeight}px`
            ctx.scale(dpr, dpr)
            beamsRef.current = Array.from({ length: 30 }, () => createBeam(canvas.width, canvas.height))
        }

        const resetBeam = (beam: Beam, index: number) => {
            const spacing = canvas.width / 3
            const column = index % 3
            beam.y = canvas.height + 100
            beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5
            beam.width = 100 + Math.random() * 100
            beam.speed = 0.5 + Math.random() * 0.4
            beam.hue = 260 + (index * 60) / 30
            beam.opacity = 0.15 + Math.random() * 0.12
        }

        const drawBeam = (beam: Beam) => {
            ctx.save()
            ctx.translate(beam.x, beam.y)
            ctx.rotate((beam.angle * Math.PI) / 180)
            const pulsing = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity]
            const grad = ctx.createLinearGradient(0, 0, 0, beam.length)
            grad.addColorStop(0, `hsla(${beam.hue}, 85%, 65%, 0)`)
            grad.addColorStop(0.1, `hsla(${beam.hue}, 85%, 65%, ${pulsing * 0.5})`)
            grad.addColorStop(0.4, `hsla(${beam.hue}, 85%, 65%, ${pulsing})`)
            grad.addColorStop(0.6, `hsla(${beam.hue}, 85%, 65%, ${pulsing})`)
            grad.addColorStop(0.9, `hsla(${beam.hue}, 85%, 65%, ${pulsing * 0.5})`)
            grad.addColorStop(1, `hsla(${beam.hue}, 85%, 65%, 0)`)
            ctx.fillStyle = grad
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length)
            ctx.restore()
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.filter = "blur(35px)"
            beamsRef.current.forEach((beam, i) => {
                beam.y -= beam.speed
                beam.pulse += beam.pulseSpeed
                if (beam.y + beam.length < -100) resetBeam(beam, i)
                drawBeam(beam)
            })
            rafRef.current = requestAnimationFrame(animate)
        }

        resize()
        animate()
        window.addEventListener("resize", resize)
        return () => {
            window.removeEventListener("resize", resize)
            cancelAnimationFrame(rafRef.current)
        }
    }, [intensity])

    return (
        <div className={cn("relative min-h-screen w-full overflow-hidden bg-[#050008]", className)}>
            <canvas ref={canvasRef} className="absolute inset-0" style={{ filter: "blur(15px)" }} />
            <div className="absolute inset-0" style={{ backdropFilter: "blur(50px)", background: "rgba(5,0,8,0.05)" }} />
            <div className="relative z-10 w-full h-full">{children}</div>
        </div>
    )
}