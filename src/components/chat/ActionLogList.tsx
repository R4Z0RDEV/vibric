'use client';

import { ActionLog } from './ActionLog';
import type { ActionItem } from '@/lib/streaming-parser';

interface ActionLogListProps {
    actions: ActionItem[];
    isStreaming?: boolean;
}

/**
 * 액션 로그 리스트 컨테이너
 */
export function ActionLogList({ actions, isStreaming = false }: ActionLogListProps) {
    if (actions.length === 0) return null;

    return (
        <div className="mb-4 space-y-2">
            {actions.map((action, index) => (
                <div
                    key={`${action.path}-${index}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <ActionLog action={action} />
                </div>
            ))}

            {isStreaming && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/40">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>Processing...</span>
                </div>
            )}
        </div>
    );
}
