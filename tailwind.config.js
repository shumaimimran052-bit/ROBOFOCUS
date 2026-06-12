/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx,js,jsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                orbitron: ["Orbitron", "sans-serif"],
                mono: ["Space Mono", "monospace"],
            },
            colors: {
                neongreen: "#00ff9d",
                neonblue: "#00c8ff",
                neonpink: "#ff3cac",
                neonpurple: "#7b2fff",
            },
            animation: {
                marquee: "marquee var(--duration) linear infinite",
            },
            keyframes: {
                marquee: {
                    from: { transform: "translateX(0)" },
                    to: { transform: "translateX(calc(-100% - var(--gap)))" },
                },
            },
        },
    },
    plugins: [],
}