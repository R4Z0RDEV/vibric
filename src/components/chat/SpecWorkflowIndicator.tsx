'use client';

import { Check, Circle } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import type { SpecStage } from '@/stores/chat-store';

const stages: { id: SpecStage; label: string }[] = [
    { id: 'requirements', label: 'Requirements' },
    { id: 'plan', label: 'Plan' },
    { id: 'task', label: 'Task' },
];

export function SpecWorkflowIndicator() {
    const { specStage, inputMode } = useChatStore();

    if (inputMode !== 'spec' || specStage === 'idle') return null;

    const getStageStatus = (stageId: SpecStage) => {
        const stageOrder = ['idle', 'requirements', 'plan', 'task'];
        const currentIndex = stageOrder.indexOf(specStage);
        const thisIndex = stageOrder.indexOf(stageId);

        if (currentIndex > thisIndex) return 'completed';
        if (currentIndex === thisIndex) return 'current';
        return 'pending';
    };

    return (
        <div className="w-full px-4 py-2 border-b border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-between max-w-sm mx-auto">
                {stages.map((stage, index) => {
                    const status = getStageStatus(stage.id);
                    const isLast = index === stages.length - 1;

                    return (
                        <div key={stage.id} className="flex items-center flex-1">
                            {/* Step Indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center border
                                    transition-colors duration-300
                                    ${status === 'completed'
                                        ? 'bg-purple-500 border-purple-500 text-white'
                                        : status === 'current'
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                            : 'bg-transparent border-white/20 text-white/20'
                                    }
                                `}>
                                    {status === 'completed' ? (
                                        <Check size={12} strokeWidth={3} />
                                    ) : (
                                        <div className={`
                                            w-2 h-2 rounded-full
                                            ${status === 'current' ? 'bg-purple-500 animate-pulse' : 'bg-transparent'}
                                        `} />
                                    )}
                                </div>
                                <span className={`
                                    text-xs font-medium uppercase tracking-wider
                                    transition-colors duration-300
                                    ${status === 'current' ? 'text-purple-300' : 'text-white/40'}
                                `}>
                                    {stage.label}
                                </span>
                            </div>

                            {/* Connecting Line */}
                            {!isLast && (
                                <div className="flex-1 mx-3 h-[1px] bg-white/10 relative">
                                    <div
                                        className={`absolute inset-0 bg-purple-500/50 transition-all duration-500 origin-left`}
                                        style={{
                                            transform: status === 'completed' ? 'scaleX(1)' : 'scaleX(0)'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
