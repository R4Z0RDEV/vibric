'use client';

import { X, File, Folder, Globe } from 'lucide-react';
import type { MentionItem, CommandItem } from '@/types';

interface MentionPillProps {
    item: MentionItem;
    onRemove: () => void;
}

interface CommandPillProps {
    command: CommandItem;
    onRemove: () => void;
}

// 멘션 타입별 아이콘
const typeIcons = {
    file: <File size={14} className="text-blue-400" />,
    folder: <Folder size={14} className="text-yellow-400" />,
    page: <Globe size={14} className="text-green-400" />,
};

/**
 * 멘션 Pill 컴포넌트
 * 회색 배경 + 아이콘 + 텍스트 스타일
 */
export function MentionPill({ item, onRemove }: MentionPillProps) {
    return (
        <span
            className="
                inline-flex items-center gap-1.5 
                px-2 py-0.5 rounded-md
                bg-white/10 border border-white/20
                text-sm text-white/90
                transition-colors hover:bg-white/15
                group
            "
        >
            {typeIcons[item.type]}
            <span className="max-w-[120px] truncate">{item.name}</span>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="
                    ml-0.5 p-0.5 rounded
                    text-white/40 hover:text-white/80 hover:bg-white/10
                    transition-colors
                    opacity-60 group-hover:opacity-100
                "
                aria-label={`Remove ${item.name}`}
            >
                <X size={12} />
            </button>
        </span>
    );
}

/**
 * 명령어 Pill 컴포넌트
 * 보라색 아웃라인 스타일
 */
export function CommandPill({ command, onRemove }: CommandPillProps) {
    return (
        <span
            className="
                inline-flex items-center gap-1.5
                px-2.5 py-0.5 rounded-md
                bg-transparent border border-purple-500
                text-sm text-purple-400 font-medium
                transition-colors hover:bg-purple-500/10
                group
            "
        >
            <span>/{command.name}</span>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="
                    ml-0.5 p-0.5 rounded
                    text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/20
                    transition-colors
                    opacity-60 group-hover:opacity-100
                "
                aria-label={`Remove ${command.name}`}
            >
                <X size={12} />
            </button>
        </span>
    );
}
