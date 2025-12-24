'use client';

import { useState } from 'react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { FileTreeItem } from './FileTreeItem';
import { FilePlus, FolderPlus, RefreshCw } from 'lucide-react';
import type { FileNode } from '@/types';

interface FileTreeProps {
    className?: string;
}

export function FileTree({ className = '' }: FileTreeProps) {
    const { files, addFile } = useFileSystemStore();
    const [isCreating, setIsCreating] = useState<'file' | 'directory' | null>(null);
    const [newName, setNewName] = useState('');

    // 새 파일/폴더 생성
    const handleCreate = () => {
        if (!newName.trim() || !isCreating) return;
        addFile('', newName.trim(), isCreating);
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

    return (
        <div className={`h-full flex flex-col bg-zinc-900 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Explorer
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsCreating('file')}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                        title="새 파일"
                    >
                        <FilePlus size={14} />
                    </button>
                    <button
                        onClick={() => setIsCreating('directory')}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                        title="새 폴더"
                    >
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            {/* 새 파일/폴더 입력 */}
            {isCreating && (
                <div className="px-2 py-1 border-b border-zinc-800">
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
                        className="w-full px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                </div>
            )}

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-1">
                {files.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                        <p className="text-sm text-zinc-500">파일이 없습니다</p>
                        <p className="text-xs text-zinc-600 mt-1">
                            위 버튼으로 파일을 추가하세요
                        </p>
                    </div>
                ) : (
                    files.map((file) => (
                        <FileTreeItem key={file.path} node={file} depth={0} />
                    ))
                )}
            </div>
        </div>
    );
}
