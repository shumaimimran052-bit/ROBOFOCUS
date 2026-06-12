import { useEffect, useRef } from "react"
import * as THREE from "three"

interface LiquidShaderProps {
    className?: string
}

export function LiquidShader({ className = "" }: LiquidShaderProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
        renderer.setPixelRatio(window.devicePixelRatio)
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const clock = new THREE.Clock()

        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

        const fragmentShader = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;
      varying vec2 vUv;

      #define t iTime
      mat2 m(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
      float map(vec3 p){
        p.xz *= m(t*0.4);
        p.xy *= m(t*0.3);
        vec3 q = p*2. + t;
        return length(p + vec3(sin(t*0.7))) * log(length(p)+1.0)
             + sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;
      }

      void mainImage(out vec4 O, in vec2 fragCoord) {
        vec2 uv = fragCoord / min(iResolution.x, iResolution.y) - vec2(.9, .5);
        uv.x += .4;
        vec3 col = vec3(0.0);
        float d = 2.5;

        for (int i = 0; i <= 5; i++) {
          vec3 p = vec3(0,0,5.) + normalize(vec3(uv, -1.)) * d;
          float rz = map(p);
          float f = clamp((rz - map(p + 0.1)) * 0.5, -0.1, 1.0);
          vec3 base = vec3(0.08, 0.05, 0.2) + vec3(3.0, 1.5, 5.0) * f;
          col = col * base + smoothstep(2.5, 0.0, rz) * 0.7 * base;
          d += min(rz, 1.0);
        }

        float dist = distance(fragCoord, iResolution * 0.5);
        float radius = min(iResolution.x, iResolution.y) * 0.5;
        float dim = smoothstep(radius * 0.3, radius * 0.5, dist);

        O = vec4(col, 1.0);
        O.rgb = mix(O.rgb * 0.3, O.rgb, dim);
      }

      void main() {
        mainImage(gl_FragColor, vUv * iResolution);
      }
    `

        const uniforms = {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2() },
            iMouse: { value: new THREE.Vector2() },
        }

        const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
        scene.add(mesh)

        const onResize = () => {
            const w = container.clientWidth
            const h = container.clientHeight
            renderer.setSize(w, h)
            uniforms.iResolution.value.set(w, h)
        }

        const onMouseMove = (e: MouseEvent) => {
            uniforms.iMouse.value.set(e.clientX, window.innerHeight - e.clientY)
        }

        window.addEventListener("resize", onResize)
        window.addEventListener("mousemove", onMouseMove)
        onResize()

        renderer.setAnimationLoop(() => {
            uniforms.iTime.value = clock.getElapsedTime()
            renderer.render(scene, camera)
        })

        return () => {
            window.removeEventListener("resize", onResize)
            window.removeEventListener("mousemove", onMouseMove)
            renderer.setAnimationLoop(null)
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement)
            }
            material.dispose()
            mesh.geometry.dispose()
            renderer.dispose()
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className={`fixed inset-0 ${className}`}
            style={{ zIndex: 0 }}
        />
    )
}