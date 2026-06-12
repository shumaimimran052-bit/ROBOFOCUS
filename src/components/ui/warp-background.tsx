import { Warp } from "@paper-design/shaders-react"

interface WarpBackgroundProps {
    children?: React.ReactNode
}

export default function WarpBackground({ children }: WarpBackgroundProps) {
    return (
        <div className="relative min-h-screen">
            <div className="fixed inset-0 -z-10">
                <Warp
                    style={{ width: "100%", height: "100%" }}
                    proportion={0.45}
                    softness={1}
                    distortion={0.25}
                    swirl={0.8}
                    swirlIterations={10}
                    shape="checks"
                    shapeScale={0.1}
                    scale={1}
                    rotation={0}
                    speed={1}
                    colors={[
                        "hsl(270, 80%, 8%)",
                        "hsl(265, 70%, 15%)",
                        "hsl(260, 90%, 20%)",
                        "hsl(0, 0%, 3%)",
                    ]}
                />
            </div>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}