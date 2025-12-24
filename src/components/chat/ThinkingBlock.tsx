'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import type { ThinkingStep } from '@/lib/streaming-parser';

interface ThinkingBlockProps {
    steps: ThinkingStep[];
    elapsedSeconds: number;
    isStreaming?: boolean;
}

export function ThinkingBlock({ steps, elapsedSeconds, isStreaming = false }: ThinkingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (steps.length === 0) return null;

    return (
        <div className="mb-4">
            {/* Header - Clickable to expand/collapse */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors group"
            >
                <Brain size={14} className="text-purple-400" />
                <span>
                    Thought for {elapsedSeconds}s
                    {isStreaming && <span className="ml-1 animate-pulse">...</span>}
                </span>
                {isExpanded ? (
                    <ChevronDown size={14} className="text-white/40" />
                ) : (
                    <ChevronRight size={14} className="text-white/40" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-3 pl-5 border-l-2 border-purple-500/30 space-y-4">
                    {steps.map((step, index) => (
                        <div key={index} className="animate-fade-in">
                            <h4 className="text-sm font-semibold text-white/90 mb-1">
                                {step.title}
                            </h4>
                            <p className="text-sm text-white/60 leading-relaxed">
                                {step.content}
                            </p>
                        </div>
                    ))}

                    {isStreaming && (
                        <div className="flex items-center gap-2 text-sm text-white/40">
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            <span>Thinking...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
