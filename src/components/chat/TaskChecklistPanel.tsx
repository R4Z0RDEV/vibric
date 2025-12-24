'use client';

import { useChatStore } from '@/stores/chat-store';
import { CheckCircle2, Circle, Play } from 'lucide-react';
import type { TaskPhase } from '@/stores/chat-store';

// Mock Data for Task Mode Preview
const MOCK_PHASES: TaskPhase[] = [
    {
        title: 'Phase 1: Project Setup',
        tasks: [
            { id: 't1', text: 'Initialize Next.js project with TypeScript', completed: true },
            { id: 't2', text: 'Install Tailwind CSS and shadcn/ui', completed: true },
            { id: 't3', text: 'Setup project folder structure', completed: false },
        ]
    },
    {
        title: 'Phase 2: Core Components',
        tasks: [
            { id: 't4', text: 'Create AppShell layout', completed: false },
            { id: 't5', text: 'Implement Navigation Bar', completed: false },
        ]
    }
];

export function TaskChecklistPanel() {
    const { specStage, inputMode, taskPhases, setTaskPhases } = useChatStore();

    // Task 모드가 아니면 렌더링 안함
    if (inputMode !== 'spec' || specStage !== 'task') return null;

    // 데모용 데이터 주입 (실제로는 Store에 이미 있어야 함)
    const phases = taskPhases.length > 0 ? taskPhases : MOCK_PHASES;

    return (
        <div className="mx-4 mt-4 mb-2">
            <div className="liquid-glass-card rounded-xl overflow-hidden border border-white/10">
                <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        Implementation Tasks
                    </h3>
                    <span className="text-xs text-white/40">Autopilot Ready</span>
                </div>

                <div className="p-4 space-y-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {phases.map((phase, pIndex) => (
                        <div key={pIndex} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                                    {phase.title}
                                </h4>
                                <button className="
                                    flex items-center gap-1.5 px-2 py-1 rounded-md
                                    bg-purple-500/20 hover:bg-purple-500/30
                                    text-purple-300 text-xs transition-colors
                                    border border-purple-500/30
                                ">
                                    <Play size={10} fill="currentColor" />
                                    Start Phase
                                </button>
                            </div>

                            <div className="space-y-2">
                                {phase.tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`
                                            flex items-start gap-3 p-2 rounded-lg
                                            ${task.completed ? 'bg-white/5' : 'bg-transparent'}
                                            transition-colors
                                        `}
                                    >
                                        {task.completed ? (
                                            <CheckCircle2 size={16} className="text-green-400 mt-0.5" />
                                        ) : (
                                            <Circle size={16} className="text-white/20 mt-0.5 dashed-circle" />
                                        )}
                                        <span className={`text-sm ${task.completed ? 'text-white/40 line-through' : 'text-white/80'}`}>
                                            {task.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
