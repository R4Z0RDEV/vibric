'use client';

import { useState } from 'react';
import { useChatStore, type AgentConfirmation as AgentConfirmationType } from '@/stores/chat-store';
import { getLangGraphClient } from '@/lib/langgraph-client';
import { Check, X, RefreshCw, Bot } from 'lucide-react';

const AGENT_DISPLAY_NAMES: Record<string, string> = {
    planner: '기획자',
    coder: '개발자',
    reviewer: '리뷰어',
    tester: '테스터',
    ux_designer: 'UX 디자이너',
    security: '보안 전문가',
    db_agent: 'DB 엔지니어',
};

const AGENT_COLORS: Record<string, string> = {
    planner: 'text-purple-400',
    coder: 'text-blue-400',
    reviewer: 'text-amber-400',
    tester: 'text-green-400',
    ux_designer: 'text-pink-400',
    security: 'text-red-400',
    db_agent: 'text-cyan-400',
};

interface AgentConfirmationProps {
    confirmation?: AgentConfirmationType | null;
}

export function AgentConfirmation({ confirmation }: AgentConfirmationProps) {
    const { pendingAgentConfirmation, setPendingAgentConfirmation } = useChatStore();
    const [showAlternatives, setShowAlternatives] = useState(false);

    const data = confirmation || pendingAgentConfirmation;

    if (!data) return null;

    const agentName = AGENT_DISPLAY_NAMES[data.agent] || data.agent;
    const agentColor = AGENT_COLORS[data.agent] || 'text-white';

    const handleConfirm = () => {
        const client = getLangGraphClient();
        client.confirmAgent(true);
        setPendingAgentConfirmation(null);
        setShowAlternatives(false);
    };

    const handleCancel = () => {
        const client = getLangGraphClient();
        client.confirmAgent(false);
        setPendingAgentConfirmation(null);
        setShowAlternatives(false);
    };

    const handleSelectAlternative = (agent: string) => {
        const client = getLangGraphClient();
        client.confirmAgent(true, agent);
        setPendingAgentConfirmation(null);
        setShowAlternatives(false);
    };

    return (
        <div className="mx-4 mb-3">
            <div className="liquid-glass-card rounded-xl p-4 border border-white/10">
                {/* 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full liquid-glass-button flex items-center justify-center ${agentColor}`}>
                        <Bot size={16} />
                    </div>
                    <div className="flex-1">
                        <span className="text-white/60 text-sm">에이전트 호출</span>
                        <span className={`ml-2 font-medium ${agentColor}`}>
                            {agentName}
                        </span>
                    </div>
                </div>

                {/* 설명 */}
                <p className="text-sm text-white/70 mb-4 pl-10">
                    {data.instruction}
                </p>

                {/* 대상 파일 (있으면) */}
                {data.targetFiles && data.targetFiles.length > 0 && (
                    <div className="text-xs text-white/40 mb-4 pl-10">
                        대상 파일: {data.targetFiles.join(', ')}
                    </div>
                )}

                {/* 버튼들 */}
                <div className="flex items-center gap-2 pl-10">
                    {/* 진행 버튼 */}
                    <button
                        onClick={handleConfirm}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            bg-green-500/20 hover:bg-green-500/30
                            text-green-300 text-sm font-medium
                            border border-green-500/30
                            transition-colors
                        "
                    >
                        <Check size={14} />
                        진행
                    </button>

                    {/* 취소 버튼 */}
                    <button
                        onClick={handleCancel}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            bg-red-500/20 hover:bg-red-500/30
                            text-red-300 text-sm font-medium
                            border border-red-500/30
                            transition-colors
                        "
                    >
                        <X size={14} />
                        취소
                    </button>

                    {/* 다른 에이전트 버튼 */}
                    {data.alternatives && data.alternatives.length > 0 && (
                        <button
                            onClick={() => setShowAlternatives(!showAlternatives)}
                            className="
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                bg-white/5 hover:bg-white/10
                                text-white/60 text-sm
                                border border-white/10
                                transition-colors
                            "
                        >
                            <RefreshCw size={14} />
                            다른 에이전트
                        </button>
                    )}
                </div>

                {/* 대안 에이전트 목록 */}
                {showAlternatives && data.alternatives && (
                    <div className="mt-3 pl-10 flex flex-wrap gap-2">
                        {data.alternatives
                            .filter(a => a !== data.agent)
                            .map(agent => (
                                <button
                                    key={agent}
                                    onClick={() => handleSelectAlternative(agent)}
                                    className={`
                                        px-2 py-1 rounded-md text-xs
                                        bg-white/5 hover:bg-white/10
                                        border border-white/10
                                        transition-colors
                                        ${AGENT_COLORS[agent] || 'text-white/70'}
                                    `}
                                >
                                    {AGENT_DISPLAY_NAMES[agent] || agent}
                                </button>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
