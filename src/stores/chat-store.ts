import { create } from 'zustand';
import type { Message } from '@/types';

// 타입 정의
export type ChatInputMode = 'spec' | 'fast';
export type SelectedModel = 'gemini' | 'claude' | 'gpt-4';

interface ChatState {
    messages: Message[];
    isLoading: boolean;
    inputValue: string;
    inputMode: ChatInputMode;
    selectedModel: SelectedModel;

    // Actions
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
    updateMessage: (id: string, content: string) => void;
    setLoading: (loading: boolean) => void;
    setInputValue: (value: string) => void;
    setInputMode: (mode: ChatInputMode) => void;
    setSelectedModel: (model: SelectedModel) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isLoading: false,
    inputValue: '',
    inputMode: 'fast',  // 기본값: Fast 모드
    selectedModel: 'gemini',  // 기본값: Gemini

    addMessage: (message) => set((state) => ({
        messages: [
            ...state.messages,
            {
                ...message,
                id: crypto.randomUUID(),
                timestamp: new Date(),
            },
        ],
    })),

    updateMessage: (id, content) => set((state) => ({
        messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content, isStreaming: false } : msg
        ),
    })),

    setLoading: (loading) => set({ isLoading: loading }),

    setInputValue: (value) => set({ inputValue: value }),

    setInputMode: (mode) => set({ inputMode: mode }),

    setSelectedModel: (model) => set({ selectedModel: model }),

    clearMessages: () => set({ messages: [] }),
}));

