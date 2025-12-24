// Vibric Type Definitions

export type TabType = 'canvas' | 'code' | 'assets' | 'dashboard';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    // AI Thinking UI용 필드 (영구 저장)
    thinking?: { title: string; content: string }[];
    actions?: {
        type: 'create_file' | 'modify_file' | 'delete_file';
        path: string;
        lines?: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed' | 'error';
    }[];
    thinkingDuration?: number; // 초 단위
}

export interface CanvasElement {
    id: string;
    type: 'page' | 'component' | 'image' | 'text' | 'frame';
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    content?: string;
    filePath?: string;
    locked?: boolean;
    visible?: boolean;
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    content?: string;
    isOpen?: boolean;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

// 멘션 시스템 타입
export type MentionType = 'file' | 'folder' | 'page';

export interface MentionItem {
    id: string;
    type: MentionType;
    name: string;
    path: string;
    icon: '📄' | '📁' | '🌐';
}

// 명령어 팔레트 타입
export interface CommandItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    action: () => void;
}
