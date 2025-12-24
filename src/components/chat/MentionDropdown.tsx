'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, File, Folder, Globe } from 'lucide-react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { usePageStore } from '@/stores/page-store';
import type { MentionItem, FileNode } from '@/types';

interface MentionDropdownProps {
    isOpen: boolean;
    searchQuery: string;
    onSelect: (item: MentionItem) => void;
    onClose: () => void;
    anchorRef?: React.RefObject<HTMLElement | null>;
}

// 파일 트리를 평탄화하여 MentionItem 배열로 변환
function flattenFilesToMentions(nodes: FileNode[], prefix = ''): MentionItem[] {
    const items: MentionItem[] = [];

    for (const node of nodes) {
        const path = prefix ? `${prefix}/${node.name}` : node.name;

        if (node.type === 'directory') {
            items.push({
                id: `folder-${path}`,
                type: 'folder',
                name: node.name,
                path,
                icon: '📁',
            });
            if (node.children) {
                items.push(...flattenFilesToMentions(node.children, path));
            }
        } else {
            items.push({
                id: `file-${path}`,
                type: 'file',
                name: node.name,
                path,
                icon: '📄',
            });
        }
    }

    return items;
}

export function MentionDropdown({
    isOpen,
    searchQuery,
    onSelect,
    onClose,
    anchorRef,
}: MentionDropdownProps) {
    const { files } = useFileSystemStore();
    const { pages } = usePageStore();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // 클라이언트 마운트 확인
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 위치 계산 - 패널 바로 위에 고정
    useEffect(() => {
        if (isOpen && anchorRef?.current) {
            // liquid-glass 패널 찾기
            const chatPanel = anchorRef.current.closest('.liquid-glass');
            const panelRect = chatPanel?.getBoundingClientRect();

            if (panelRect) {
                const gap = 8;
                // 패널 TOP 바로 위에 위치 (bottom = panelRect.top - gap)
                setPosition({
                    top: Math.max(gap, panelRect.top - gap),
                    left: panelRect.left,
                });
            }
        }
    }, [isOpen, anchorRef]);

    // 파일과 페이지를 MentionItem으로 변환
    const allItems = useMemo(() => {
        const fileItems = flattenFilesToMentions(files);

        const pageItems: MentionItem[] = pages.map((page) => ({
            id: `page-${page.id}`,
            type: 'page' as const,
            name: page.name,
            path: page.path,
            icon: '🌐' as const,
        }));

        return [...pageItems, ...fileItems];
    }, [files, pages]);

    // 검색 필터링
    const filteredItems = useMemo(() => {
        if (!searchQuery) return allItems.slice(0, 10);

        const query = searchQuery.toLowerCase();
        return allItems
            .filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.path.toLowerCase().includes(query)
            )
            .slice(0, 10);
    }, [allItems, searchQuery]);

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
                        Math.min(prev + 1, filteredItems.length - 1)
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredItems[selectedIndex]) {
                        onSelect(filteredItems[selectedIndex]);
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
    }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

    // 선택된 항목 스크롤
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[
                selectedIndex
            ] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // 외부 클릭 감지
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-mention-dropdown]')) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !isMounted) return null;

    const iconMap = {
        file: <File size={16} className="text-blue-400" />,
        folder: <Folder size={16} className="text-yellow-400" />,
        page: <Globe size={16} className="text-green-400" />,
    };

    return createPortal(
        <div
            data-mention-dropdown
            className="
                w-72 max-h-64 overflow-hidden
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
            {/* 검색 헤더 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                <Search size={14} className="text-white/40" />
                <span className="text-xs text-white/40">
                    Search files & pages...
                </span>
            </div>

            {/* 항목 목록 */}
            <div ref={listRef} className="max-h-48 overflow-y-auto">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2
                                text-sm text-left transition-colors
                                ${index === selectedIndex
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }
                            `}
                        >
                            {iconMap[item.type]}
                            <span className="flex-1 truncate">{item.name}</span>
                            <span className="text-xs text-white/30 truncate max-w-[100px]">
                                {item.path}
                            </span>
                        </button>
                    ))
                ) : (
                    <div className="px-3 py-4 text-center text-sm text-white/40">
                        No results found
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
