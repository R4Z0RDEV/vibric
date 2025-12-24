'use client';

import { useFileSystemStore } from '@/stores/filesystem-store';
import { File, X } from 'lucide-react';

interface EditorTabsProps {
    className?: string;
}

export function EditorTabs({ className = '' }: EditorTabsProps) {
    const { openFiles, activeFilePath, setActiveFile, closeFile } = useFileSystemStore();

    if (openFiles.length === 0) {
        return null;
    }

    // 파일명 추출
    const getFileName = (path: string) => {
        return path.split('/').pop() || path;
    };

    // 파일 확장자에 따른 아이콘 색상
    const getTabColor = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase();
        const colors: Record<string, string> = {
            'tsx': 'text-blue-400',
            'ts': 'text-blue-400',
            'jsx': 'text-yellow-400',
            'js': 'text-yellow-400',
            'css': 'text-purple-400',
            'json': 'text-green-400',
            'md': 'text-zinc-400',
            'html': 'text-orange-400',
        };
        return colors[ext || ''] || 'text-zinc-400';
    };

    return (
        <div className={`flex items-center gap-0.5 bg-zinc-900 border-b border-zinc-800 overflow-x-auto ${className}`}>
            {openFiles.map((path) => {
                const isActive = path === activeFilePath;
                const fileName = getFileName(path);

                return (
                    <div
                        key={path}
                        className={`
                            group flex items-center gap-2 px-3 py-1.5 cursor-pointer 
                            border-r border-zinc-800 shrink-0 max-w-[160px]
                            ${isActive
                                ? 'bg-zinc-800 text-white border-t-2 border-t-blue-500'
                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                            }
                        `}
                        onClick={() => setActiveFile(path)}
                    >
                        <File size={14} className={getTabColor(path)} />
                        <span className="text-sm truncate">{fileName}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(path);
                            }}
                            className={`
                                p-0.5 rounded 
                                ${isActive
                                    ? 'hover:bg-zinc-700'
                                    : 'opacity-0 group-hover:opacity-100 hover:bg-zinc-600'
                                }
                            `}
                        >
                            <X size={12} className="text-zinc-400 hover:text-zinc-200" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
