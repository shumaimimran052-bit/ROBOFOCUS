"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ImageIcon, FileUp, MonitorIcon, CircleUserRound,
    ArrowUpIcon, Paperclip, Code2, Palette, Layers, Rocket,
} from "lucide-react";
import WarpBackground from "@/components/ui/warp-background";

interface AutoResizeProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            if (reset) { textarea.style.height = `${minHeight}px`; return; }
            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
    }, [minHeight]);

    return { textareaRef, adjustHeight };
}

export default function RuixenMoonChat() {
    const [message, setMessage] = useState("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 48, maxHeight: 150 });

    return (
        <WarpBackground>
            <div className="relative w-full h-screen flex flex-col items-center">

                <div className="flex-1 w-full flex flex-col items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-4xl font-semibold text-white drop-shadow-sm">
                            Ruixen AI
                        </h1>
                        <p className="mt-2" style={{ color: 'rgba(200,180,255,0.6)' }}>
                            Build something amazing — just start typing below.
                        </p>
                    </div>
                </div>

                <div className="w-full max-w-3xl mb-[20vh]">
                    <div className="relative rounded-xl border"
                        style={{
                            background: 'rgba(5,2,20,0.75)',
                            backdropFilter: 'blur(20px)',
                            borderColor: 'rgba(90,40,170,0.3)',
                        }}
                    >
                        <Textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => { setMessage(e.target.value); adjustHeight(); }}
                            placeholder="Type your request..."
                            className={cn(
                                "w-full px-4 py-3 resize-none border-none",
                                "bg-transparent text-white text-sm",
                                "focus-visible:ring-0 focus-visible:ring-offset-0",
                                "min-h-[48px]"
                            )}
                            style={{ overflow: "hidden", color: 'rgba(210,190,255,0.85)', caretColor: '#a070e0' }}
                        />

                        <div className="flex items-center justify-between p-3">
                            <Button variant="ghost" size="icon"
                                style={{ color: 'rgba(140,90,220,0.5)' }}
                                className="hover:bg-purple-950/30"
                            >
                                <Paperclip className="w-4 h-4" />
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    disabled
                                    className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-not-allowed"
                                    style={{
                                        background: 'rgba(60,20,120,0.3)',
                                        border: '1px solid rgba(90,40,160,0.25)',
                                        color: 'rgba(130,80,200,0.4)',
                                    }}
                                >
                                    <ArrowUpIcon className="w-4 h-4" />
                                    <span className="sr-only">Send</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center flex-wrap gap-3 mt-6">
                        <QuickAction icon={<Code2 className="w-4 h-4" />} label="Generate Code" />
                        <QuickAction icon={<Rocket className="w-4 h-4" />} label="Launch App" />
                        <QuickAction icon={<Layers className="w-4 h-4" />} label="UI Components" />
                        <QuickAction icon={<Palette className="w-4 h-4" />} label="Theme Ideas" />
                        <QuickAction icon={<CircleUserRound className="w-4 h-4" />} label="User Dashboard" />
                        <QuickAction icon={<MonitorIcon className="w-4 h-4" />} label="Landing Page" />
                        <QuickAction icon={<FileUp className="w-4 h-4" />} label="Upload Docs" />
                        <QuickAction icon={<ImageIcon className="w-4 h-4" />} label="Image Assets" />
                    </div>
                </div>
            </div>
        </WarpBackground>
    );
}

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
}

function QuickAction({ icon, label }: QuickActionProps) {
    return (
        <Button
            variant="outline"
            className="flex items-center gap-2 rounded-full transition-all"
            style={{
                background: 'rgba(5,2,20,0.6)',
                border: '1px solid rgba(90,40,160,0.3)',
                color: 'rgba(170,130,240,0.6)',
                backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(50,15,120,0.35)'
                    ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,170,255,0.9)'
                    ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(130,70,220,0.5)'
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(5,2,20,0.6)'
                    ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(170,130,240,0.6)'
                    ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(90,40,160,0.3)'
            }}
        >
            {icon}
            <span className="text-xs">{label}</span>
        </Button>
    );
}