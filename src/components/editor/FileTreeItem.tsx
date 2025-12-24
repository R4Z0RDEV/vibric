'use client';

import { useState } from 'react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { ChevronRight, File, Folder, FolderOpen, Trash2, FilePlus, FolderPlus } from 'lucide-react';
import type { FileNode } from '@/types';

interface FileTreeItemProps {
    node: FileNode;
    depth: number;
}

export function FileTreeItem({ node, depth }: FileTreeItemProps) {
    const { openFile, activeFilePath, toggleDirectory, deleteFile, addFile } = useFileSystemStore();
    const [isCreating, setIsCreating] = useState<'file' | 'directory' | null>(null);
    const [newName, setNewName] = useState('');

    const isActive = activeFilePath === node.path;
    const isDirectory = node.type === 'directory';

    const handleClick = () => {
        if (isDirectory) {
            toggleDirectory(node.path);
        } else {
            openFile(node.path);
        }
    };

    const handleCreate = () => {
        if (!newName.trim() || !isCreating) return;
        addFile(node.path, newName.trim(), isCreating);
        setNewName('');
        setIsCreating(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            setIsCreating(null);
            setNewName('');
        }
    };

    // 파일 아이콘 선택
    const getFileIcon = () => {
        if (isDirectory) {
            return node.isOpen ? (
                <FolderOpen size={14} className="text-amber-400" />
            ) : (
                <Folder size={14} className="text-amber-400" />
            );
        }

        const ext = node.name.split('.').pop()?.toLowerCase();
        const iconColors: Record<string, string> = {
            'tsx': 'text-blue-400',
            'ts': 'text-blue-400',
            'jsx': 'text-yellow-400',
            'js': 'text-yellow-400',
            'css': 'text-purple-400',
            'json': 'text-green-400',
            'md': 'text-zinc-400',
            'html': 'text-orange-400',
        };

        return <File size={14} className={iconColors[ext || ''] || 'text-zinc-400'} />;
    };

    return (
        <div>
            <div
                className={`
                    group flex items-center gap-1 px-2 py-1 cursor-pointer
                    hover:bg-zinc-800/50
                    ${isActive ? 'bg-blue-500/20 text-white' : 'text-zinc-300'}
                `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
            >
                {/* Chevron for directories */}
                {isDirectory && (
                    <ChevronRight
                        size={14}
                        className={`transition-transform ${node.isOpen ? 'rotate-90' : ''}`}
                    />
                )}
                {!isDirectory && <span className="w-[14px]" />}

                {/* Icon */}
                {getFileIcon()}

                {/* Name */}
                <span className="flex-1 text-sm truncate">{node.name}</span>

                {/* Actions (show on hover) */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                    {isDirectory && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCreating('file');
                                }}
                                className="p-0.5 rounded hover:bg-zinc-700"
                                title="새 파일"
                            >
                                <FilePlus size={12} className="text-zinc-400" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCreating('directory');
                                }}
                                className="p-0.5 rounded hover:bg-zinc-700"
                                title="새 폴더"
                            >
                                <FolderPlus size={12} className="text-zinc-400" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(node.path);
                        }}
                        className="p-0.5 rounded hover:bg-red-500/20"
                        title="삭제"
                    >
                        <Trash2 size={12} className="text-zinc-400 hover:text-red-400" />
                    </button>
                </div>
            </div>

            {/* 새 파일/폴더 입력 (디렉토리 내부) */}
            {isCreating && (
                <div style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }} className="pr-2 py-1">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            if (newName.trim()) handleCreate();
                            else {
                                setIsCreating(null);
                                setNewName('');
                            }
                        }}
                        placeholder={isCreating === 'file' ? '파일명.tsx' : '폴더명'}
                        className="w-full px-2 py-0.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                </div>
            )}

            {/* Children */}
            {isDirectory && node.isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTreeItem key={child.path} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
