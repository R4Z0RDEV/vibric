'use client';

import { useState } from 'react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { ChevronRight, File, Folder, FolderOpen, Trash2, FilePlus, FolderPlus } from 'lucide-react';
import type { FileNode } from '@/types';

// react-icons - Devicons, Simple Icons, VS Code Icons
import {
    SiTypescript,
    SiJavascript,
    SiReact,
    SiHtml5,
    SiCss3,
    SiJson,
    SiMarkdown,
    SiYaml,
    SiNodedotjs,
    SiGit,
    SiNpm,
    SiPython,
    SiDocker,
} from 'react-icons/si';
import { VscFile, VscSettingsGear, VscLock } from 'react-icons/vsc';

// 파일 확장자 → 아이콘 매핑
function getFileIconByExtension(fileName: string): React.ReactNode {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const name = fileName.toLowerCase();

    // 특수 파일명 체크
    if (name === 'package.json') return <SiNpm size={14} className="text-red-400" />;
    if (name === 'package-lock.json') return <SiNpm size={14} className="text-red-300" />;
    if (name === 'tsconfig.json') return <SiTypescript size={14} className="text-blue-400" />;
    if (name === '.gitignore' || name === '.git') return <SiGit size={14} className="text-orange-400" />;
    if (name === 'dockerfile') return <SiDocker size={14} className="text-blue-500" />;
    if (name === '.env' || name.startsWith('.env.')) return <VscLock size={14} className="text-yellow-400" />;
    if (name.endsWith('.config.js') || name.endsWith('.config.ts')) return <VscSettingsGear size={14} className="text-zinc-400" />;

    // 확장자별 아이콘
    switch (ext) {
        // TypeScript
        case 'ts':
            return <SiTypescript size={14} className="text-blue-400" />;
        case 'tsx':
            return <SiReact size={14} className="text-cyan-400" />;
        // JavaScript
        case 'js':
            return <SiJavascript size={14} className="text-yellow-400" />;
        case 'jsx':
            return <SiReact size={14} className="text-cyan-400" />;
        case 'mjs':
        case 'cjs':
            return <SiNodedotjs size={14} className="text-green-500" />;
        // Web
        case 'html':
            return <SiHtml5 size={14} className="text-orange-500" />;
        case 'css':
            return <SiCss3 size={14} className="text-blue-500" />;
        case 'scss':
        case 'sass':
            return <SiCss3 size={14} className="text-pink-400" />;
        // Data
        case 'json':
            return <SiJson size={14} className="text-yellow-500" />;
        case 'yaml':
        case 'yml':
            return <SiYaml size={14} className="text-red-400" />;
        // Docs
        case 'md':
        case 'mdx':
            return <SiMarkdown size={14} className="text-white" />;
        // Python
        case 'py':
            return <SiPython size={14} className="text-yellow-300" />;
        // Default
        default:
            return <VscFile size={14} className="text-zinc-400" />;
    }
}

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

    // 파일/폴더 아이콘 선택
    const getFileIcon = () => {
        if (isDirectory) {
            return node.isOpen ? (
                <FolderOpen size={14} className="text-amber-400" />
            ) : (
                <Folder size={14} className="text-amber-400" />
            );
        }
        return getFileIconByExtension(node.name);
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
