'use client';

import { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { FileTree } from './FileTree';
import { Terminal } from './Terminal';
import { EditorTabs } from './EditorTabs';
import type { FileNode } from '@/types';

// Liquid Glass 테마 정의
const defineTheme = (monaco: typeof import('monaco-editor')) => {
    monaco.editor.defineTheme('liquid-glass', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'c084fc' },
            { token: 'string', foreground: '4ade80' },
            { token: 'number', foreground: 'fb923c' },
            { token: 'type', foreground: '60a5fa' },
            { token: 'function', foreground: 'fbbf24' },
            { token: 'variable', foreground: 'f472b6' },
        ],
        colors: {
            'editor.background': '#18181b',
            'editor.foreground': '#fafafa',
            'editor.lineHighlightBackground': '#27272a',
            'editor.selectionBackground': 'rgba(59, 130, 246, 0.3)',
            'editor.inactiveSelectionBackground': 'rgba(59, 130, 246, 0.15)',
            'editorCursor.foreground': '#fafafa',
            'editorLineNumber.foreground': '#52525b',
            'editorLineNumber.activeForeground': '#a1a1aa',
            'editor.selectionHighlightBackground': 'rgba(59, 130, 246, 0.2)',
            'editorIndentGuide.background': '#27272a',
            'editorIndentGuide.activeBackground': '#3f3f46',
            'editorWidget.background': '#18181b',
            'editorWidget.border': '#27272a',
            'editorHoverWidget.background': '#18181b',
            'editorHoverWidget.border': '#27272a',
            'editorSuggestWidget.background': '#18181b',
            'editorSuggestWidget.border': '#27272a',
            'editorSuggestWidget.selectedBackground': '#27272a',
            'scrollbar.shadow': '#00000000',
            'scrollbarSlider.background': 'rgba(161, 161, 170, 0.2)',
            'scrollbarSlider.hoverBackground': 'rgba(161, 161, 170, 0.3)',
            'scrollbarSlider.activeBackground': 'rgba(161, 161, 170, 0.4)',
        },
    });
};

// 파일 트리에서 파일 찾기
const findFileContent = (nodes: FileNode[], path: string): string | undefined => {
    for (const node of nodes) {
        if (node.path === path && node.type === 'file') {
            return node.content;
        }
        if (node.children) {
            const found = findFileContent(node.children, path);
            if (found !== undefined) return found;
        }
    }
    return undefined;
};

interface CodeEditorProps {
    className?: string;
}

export function CodeEditor({ className = '' }: CodeEditorProps) {
    const { activeFilePath, files, updateFile } = useFileSystemStore();
    const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

    // 활성 파일 내용 가져오기
    const content = activeFilePath ? findFileContent(files, activeFilePath) || '' : '';
    const language = getLanguageFromPath(activeFilePath || '');

    // 에디터 마운트 시 테마 정의
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        defineTheme(monaco);
        monaco.editor.setTheme('liquid-glass');

        // 에디터 옵션 설정
        editor.updateOptions({
            fontSize: 14,
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            lineHeight: 22,
            minimap: { enabled: true, scale: 0.75 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            padding: { top: 16, bottom: 16 },
            bracketPairColorization: { enabled: true },
        });
    };

    // 파일 내용 변경 핸들러
    const handleEditorChange = (value: string | undefined) => {
        if (activeFilePath && value !== undefined) {
            updateFile(activeFilePath, value);
        }
    };

    return (
        <div className={`h-full flex ${className}`}>
            {/* File Tree Sidebar */}
            <div className="w-60 border-r border-zinc-800 flex-shrink-0">
                <FileTree />
            </div>

            {/* Editor + Terminal Area */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Editor Tabs */}
                <EditorTabs />

                {/* Editor */}
                <div className="flex-1 min-h-0">
                    {activeFilePath ? (
                        <Editor
                            height="100%"
                            language={language}
                            value={content}
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            loading={
                                <div className="h-full flex items-center justify-center bg-zinc-900">
                                    <div className="animate-pulse text-zinc-500">에디터 로딩 중...</div>
                                </div>
                            }
                            options={{
                                readOnly: false,
                                automaticLayout: true,
                            }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center bg-zinc-900">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                </div>
                                <p className="text-zinc-500 text-sm">파일을 선택하여 편집을 시작하세요</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Terminal */}
                <Terminal />
            </div>
        </div>
    );
}

// 파일 경로에서 언어 추론
function getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'json': 'json',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'md': 'markdown',
        'yaml': 'yaml',
        'yml': 'yaml',
    };
    return languageMap[ext || ''] || 'plaintext';
}
