import { useEffect, useRef } from 'react'

const ProceduralGround = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext('webgl')
        if (!gl) return

        const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

        const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float depth = 1.0 / (uv.y + 1.15);
        vec2 gridUv = vec2(uv.x * depth, depth + u_time * 0.15);
        float n = noise(gridUv * 3.5);
        float ripples = sin(gridUv.y * 18.0 + n * 8.0 + u_time * 0.5);
        float topoLine = smoothstep(0.03, 0.0, abs(ripples));
        vec3 baseColor = vec3(0.03, 0.02, 0.10);
        vec3 accentColor = vec3(0.08, 0.2, 0.6);
        vec3 neonColor = vec3(0.5, 0.15, 0.9);
        vec3 finalColor = mix(baseColor, accentColor, n * 0.5);
        finalColor += topoLine * neonColor * depth * 0.35;
        float fade = smoothstep(0.1, -1.0, uv.y);
        finalColor *= (1.0 - length(uv) * 0.4) * (1.0 - fade);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

        const createShader = (type: number, source: string) => {
            const shader = gl.createShader(type)!
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            return shader
        }

        const program = gl.createProgram()!
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource))
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource))
        gl.linkProgram(program)
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW)

        const posAttrib = gl.getAttribLocation(program, 'position')
        gl.enableVertexAttribArray(posAttrib)
        gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0)

        const timeLoc = gl.getUniformLocation(program, 'u_time')
        const resLoc = gl.getUniformLocation(program, 'u_resolution')

        let rafId: number
        const render = (time: number) => {
            const w = window.innerWidth
            const h = window.innerHeight
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                gl.viewport(0, 0, w, h)
            }
            gl.uniform1f(timeLoc, time * 0.001)
            gl.uniform2f(resLoc, w, h)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            rafId = requestAnimationFrame(render)
        }
        rafId = requestAnimationFrame(render)

        return () => cancelAnimationFrame(rafId)
    }, [])

    return (
        <div className="fixed inset-0 w-full h-full" style={{ zIndex: 0, background: '#06020f' }}>
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                style={{ filter: 'contrast(1.1) brightness(0.85)' }}
            />
        </div>
    )
}

export default ProceduralGround