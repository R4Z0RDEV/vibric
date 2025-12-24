'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CommandItem } from '@/types';

interface CommandPaletteProps {
    isOpen: boolean;
    searchQuery: string;
    onSelect: (command: CommandItem) => void;
    onClose: () => void;
    commands: CommandItem[];
    anchorRef?: React.RefObject<HTMLElement | null>;
}

export function CommandPalette({
    isOpen,
    searchQuery,
    onSelect,
    onClose,
    commands,
    anchorRef,
}: CommandPaletteProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // 클라이언트 마운트 확인
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 위치 계산
    useEffect(() => {
        if (isOpen && anchorRef?.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 8,
                left: rect.left,
            });
        }
    }, [isOpen, anchorRef]);

    // 검색 필터링
    const filteredCommands = commands.filter((cmd) =>
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 선택 인덱스 리셋
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // 키보드 네비게이션
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        Math.min(prev + 1, filteredCommands.length - 1)
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        onSelect(filteredCommands[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose]);

    // 외부 클릭 감지
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-command-palette]')) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !isMounted) return null;

    return createPortal(
        <div
            data-command-palette
            className="
                w-64 overflow-hidden
                liquid-glass-card rounded-lg
                animate-fade-in
            "
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translateY(-100%)',
                zIndex: 9999,
            }}
        >
            {filteredCommands.length > 0 ? (
                <div ref={listRef}>
                    {filteredCommands.map((cmd, index) => (
                        <button
                            key={cmd.id}
                            onClick={() => onSelect(cmd)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-3
                                text-left transition-colors
                                ${index === selectedIndex
                                    ? 'bg-white/10'
                                    : 'hover:bg-white/5'
                                }
                            `}
                        >
                            <span className="text-lg">{cmd.icon}</span>
                            <div className="flex-1">
                                <div className="text-sm text-white font-medium">
                                    /{cmd.name}
                                </div>
                                <div className="text-xs text-white/50">
                                    {cmd.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="px-3 py-4 text-center text-sm text-white/40">
                    No commands found
                </div>
            )}
        </div>,
        document.body
    );
}

// 기본 명령어 목록
export const DEFAULT_COMMANDS: Omit<CommandItem, 'action'>[] = [
    {
        id: 'image',
        name: 'image',
        description: '이미지를 생성합니다',
        icon: '🖼️',
    },
];
