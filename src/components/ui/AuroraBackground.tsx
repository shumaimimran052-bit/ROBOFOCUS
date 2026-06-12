import { motion } from 'framer-motion'

interface AuroraBackgroundProps {
    children?: React.ReactNode
    className?: string
    starCount?: number
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
    children,
    className = '',
    starCount = 60,
}) => {
    return (
        <div className={`relative min-h-screen w-full overflow-hidden bg-[#030010] ${className}`}>
            <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>

                {/* Pulsing radial gradients */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
              radial-gradient(circle at 30% 40%, rgba(120,40,220,0.15) 0%, transparent 60%),
              radial-gradient(circle at 70% 60%, rgba(60,30,180,0.12) 0%, transparent 60%)
            `,
                    }}
                />

                {/* Floating blobs */}
                <motion.div className="absolute inset-0 mix-blend-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                >
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            top: '-15%', left: '-10%',
                            width: '45%', height: '45%',
                            background: 'rgba(100,30,200,0.18)',
                            filter: 'blur(80px)',
                        }}
                        animate={{ x: [-40, 40, -40], y: [-20, 20, -20], scale: [1, 1.15, 1] }}
                        transition={{ duration: 28, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            bottom: '-15%', right: '-10%',
                            width: '45%', height: '45%',
                            background: 'rgba(80,20,180,0.15)',
                            filter: 'blur(80px)',
                        }}
                        animate={{ x: [40, -40, 40], y: [20, -20, 20], scale: [1, 1.2, 1] }}
                        transition={{ duration: 35, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            top: '35%', left: '35%',
                            width: '30%', height: '30%',
                            background: 'rgba(60,20,160,0.12)',
                            filter: 'blur(60px)',
                        }}
                        animate={{ x: [15, -15, 15], y: [-25, 25, -25], rotate: [0, 180, 360] }}
                        transition={{ duration: 45, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                    />
                </motion.div>

                {/* Stars */}
                {Array.from({ length: starCount }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: Math.random() > 0.8 ? '2px' : '1px',
                            height: Math.random() > 0.8 ? '2px' : '1px',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{ opacity: [0, Math.random() * 0.7 + 0.1, 0] }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Infinity,
                            delay: Math.random() * 6,
                            ease: 'easeInOut',
                        }}
                    />
                ))}
            </div>

            <div className="relative" style={{ zIndex: 1 }}>
                {children}
            </div>
        </div>
    )
}

export default AuroraBackground