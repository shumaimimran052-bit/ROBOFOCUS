import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

// Animated topographic background: a faint grid plus thin contour lines drawn from 2D simplex noise.
// Shader adapted from MengTo/threeui (MIT) "TopoField". Rewritten as a direct WebGL canvas,
// tinted purple for ROBOFOCUS, with no iframe and no extra libraries.

interface TopoFieldProps {
    className?: string
    style?: CSSProperties
    speed?: number // animation speed multiplier
    density?: number // number of contour bands
    scale?: number // size of the noise field
    opacity?: number
    color?: [number, number, number] // line color, 0-1 per channel
    background?: [number, number, number]
}

const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dpr;
uniform vec3 u_color;
uniform vec3 u_bg;
uniform float u_density;
uniform float u_scale;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    float gridSize = 48.0 * u_dpr;
    vec2 gridFract = fract(gl_FragCoord.xy / gridSize);
    float thickness = 1.0 / gridSize;
    float grid = clamp(step(1.0 - thickness, gridFract.x) + step(1.0 - thickness, gridFract.y), 0.0, 1.0) * 0.12;

    vec2 noisePos = st * u_scale + vec2(u_time * 0.015, u_time * 0.025);
    float n = snoise(noisePos) * 0.5 + 0.5;
    float tri = abs(fract(n * u_density) - 0.5) * 2.0;
    float topo = (1.0 - smoothstep(0.0, 0.02, tri)) * 0.5;

    vec3 col = u_bg + u_color * (grid + topo);
    gl_FragColor = vec4(col, 1.0);
}
`

export default function TopoField({
    className,
    style,
    speed = 1,
    density = 10,
    scale = 1.4,
    opacity = 1,
    color = [0.66, 0.33, 0.97],
    background = [0.02, 0.0, 0.031],
}: TopoFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const settingsRef = useRef({ speed, density, scale, color, background })

    useEffect(() => {
        settingsRef.current = { speed, density, scale, color, background }
    })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
        if (!gl) return

        const compile = (type: number, source: string) => {
            const shader = gl.createShader(type)
            if (!shader) return null
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.warn('TopoField shader error:', gl.getShaderInfoLog(shader))
                return null
            }
            return shader
        }

        const vs = compile(gl.VERTEX_SHADER, VERTEX)
        const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT)
        const program = gl.createProgram()
        if (!vs || !fs || !program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
        const position = gl.getAttribLocation(program, 'a_position')
        gl.enableVertexAttribArray(position)
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

        const uRes = gl.getUniformLocation(program, 'u_resolution')
        const uTime = gl.getUniformLocation(program, 'u_time')
        const uDpr = gl.getUniformLocation(program, 'u_dpr')
        const uColor = gl.getUniformLocation(program, 'u_color')
        const uBg = gl.getUniformLocation(program, 'u_bg')
        const uDensity = gl.getUniformLocation(program, 'u_density')
        const uScale = gl.getUniformLocation(program, 'u_scale')

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
            canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(uRes, canvas.width, canvas.height)
            gl.uniform1f(uDpr, dpr)
        }

        let raf = 0
        let time = 0
        let last = performance.now()
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const draw = (now: number) => {
            const s = settingsRef.current
            time += ((now - last) / 1000) * s.speed
            last = now
            gl.uniform1f(uTime, time)
            gl.uniform3f(uColor, s.color[0], s.color[1], s.color[2])
            gl.uniform3f(uBg, s.background[0], s.background[1], s.background[2])
            gl.uniform1f(uDensity, s.density)
            gl.uniform1f(uScale, s.scale)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            if (!reduceMotion) raf = requestAnimationFrame(draw)
        }

        window.addEventListener('resize', resize)
        resize()
        raf = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', resize)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            gl.deleteBuffer(buffer)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ display: 'block', width: '100%', height: '100%', opacity, ...style }}
        />
    )
}