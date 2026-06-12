import React, { useEffect, useRef } from 'react';

interface NeuralVortexProps {
    opacity?: number;
}

const NeuralVortex: React.FC<NeuralVortexProps> = ({ opacity = 1 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointer = useRef({ x: 0, y: 0, tX: 0, tY: 0 });
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        const gl = canvasEl.getContext('webgl') || canvasEl.getContext('experimental-webgl') as WebGLRenderingContext;
        if (!gl) return;

        const vsSource = `
      precision mediump float;
      attribute vec2 a_position;
      varying vec2 vUv;
      void main() {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

        const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform float u_scroll_progress;

      vec2 rotate(vec2 uv, float th) {
        return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }

      float neuro_shape(vec2 uv, float t, float p) {
        vec2 sine_acc = vec2(0.);
        vec2 res = vec2(0.);
        float scale = 8.;
        for (int j = 0; j < 15; j++) {
          uv = rotate(uv, 1.);
          sine_acc = rotate(sine_acc, 1.);
          vec2 layer = uv * scale + float(j) + sine_acc - t;
          sine_acc += sin(layer) + 2.4 * p;
          res += (.5 + .5 * cos(layer)) / scale;
          scale *= (1.2);
        }
        return res.x + res.y;
      }

      void main() {
        vec2 uv = .5 * vUv;
        uv.x *= u_ratio;
        vec2 pointer = vUv - u_pointer_position;
        pointer.x *= u_ratio;
        float p = clamp(length(pointer), 0., 1.);
        p = .5 * pow(1. - p, 2.);
        float t = .001 * u_time;
        vec3 color = vec3(0.);
        float noise = neuro_shape(uv, t, p);
        noise = 1.2 * pow(noise, 3.);
        noise += pow(noise, 10.);
        noise = max(.0, noise - .5);
        noise *= (1. - length(vUv - .5));
        color = vec3(0.5, 0.15, 0.65);
        color = mix(color, vec3(0.02, 0.7, 0.9), 0.32 + 0.16 * sin(2.0 * u_scroll_progress + 1.2));
        color += vec3(0.15, 0.0, 0.6) * sin(2.0 * u_scroll_progress + 1.5);
        color = color * noise;
        gl_FragColor = vec4(color, noise);
      }
    `;

        const compileShader = (source: string, type: number) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);

        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const position = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(program, 'u_time');
        const uRatio = gl.getUniformLocation(program, 'u_ratio');
        const uPointer = gl.getUniformLocation(program, 'u_pointer_position');
        const uScroll = gl.getUniformLocation(program, 'u_scroll_progress');

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio, 2);
            canvasEl.width = window.innerWidth * dpr;
            canvasEl.height = window.innerHeight * dpr;
            gl.viewport(0, 0, canvasEl.width, canvasEl.height);
            gl.uniform1f(uRatio, canvasEl.width / canvasEl.height);
        };

        resize();
        window.addEventListener('resize', resize);

        const render = () => {
            pointer.current.x += (pointer.current.tX - pointer.current.x) * 0.2;
            pointer.current.y += (pointer.current.tY - pointer.current.y) * 0.2;

            gl.uniform1f(uTime, performance.now());
            gl.uniform2f(uPointer,
                pointer.current.x / window.innerWidth,
                1 - pointer.current.y / window.innerHeight
            );
            gl.uniform1f(uScroll, window.pageYOffset / (2 * window.innerHeight));
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            animationRef.current = requestAnimationFrame(render);
        };

        render();

        const handleMouseMove = (e: MouseEvent) => {
            pointer.current.tX = e.clientX;
            pointer.current.tY = e.clientY;
        };

        window.addEventListener('pointermove', handleMouseMove);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', handleMouseMove);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ opacity }}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
        />
    );
};

export default NeuralVortex;