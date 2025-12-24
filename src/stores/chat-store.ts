import { create } from 'zustand';
import type { Message } from '@/types';
import type { ThinkingStep, ActionItem } from '@/lib/streaming-parser';

// 타입 정의
export type ChatInputMode = 'spec' | 'fast';
export type SelectedModel = 'gemini' | 'claude' | 'gpt-4';
export type SpecStage = 'idle' | 'requirements' | 'plan' | 'task';

export interface TaskPhase {
    title: string;
    tasks: { id: string; text: string; completed: boolean }[];
}

// 현재 스트리밍 중인 AI 응답 상태
export interface StreamingResponseState {
    thinking: ThinkingStep[];
    actions: ActionItem[];
    message: string;
    thinkingStartTime: number | null;
    isStreaming: boolean;
}

interface ChatState {
    messages: Message[];
    isLoading: boolean;
    inputValue: string;
    inputMode: ChatInputMode;
    selectedModel: SelectedModel;

    // Spec Mode States
    specStage: SpecStage;
    taskPhases: TaskPhase[];

    // Streaming Response State (Thinking UI용)
    currentResponse: StreamingResponseState;

    // Actions
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
    updateMessage: (id: string, content: string, meta?: {
        thinking?: Message['thinking'];
        actions?: Message['actions'];
        thinkingDuration?: number;
    }) => void;
    setLoading: (loading: boolean) => void;
    setInputValue: (value: string) => void;
    setInputMode: (mode: ChatInputMode) => void;
    setSelectedModel: (model: SelectedModel) => void;
    setSpecStage: (stage: SpecStage) => void;
    setTaskPhases: (phases: TaskPhase[]) => void;
    clearMessages: () => void;

    // Streaming Response Actions
    startStreaming: () => void;
    updateStreamingResponse: (response: Partial<StreamingResponseState>) => void;
    endStreaming: () => void;
}

const initialStreamingState: StreamingResponseState = {
    thinking: [],
    actions: [],
    message: '',
    thinkingStartTime: null,
    isStreaming: false,
};

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isLoading: false,
    inputValue: '',
    inputMode: 'fast',  // 기본값: Fast 모드
    selectedModel: 'gemini',  // 기본값: Gemini

    // Spec Mode States
    specStage: 'idle',
    taskPhases: [],

    // Streaming Response State
    currentResponse: { ...initialStreamingState },

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

    updateMessage: (id, content, meta) => set((state) => ({
        messages: state.messages.map((msg) =>
            msg.id === id ? {
                ...msg,
                content,
                isStreaming: false,
                // 영구 저장할 메타데이터
                thinking: meta?.thinking ?? msg.thinking,
                actions: meta?.actions ?? msg.actions,
                thinkingDuration: meta?.thinkingDuration ?? msg.thinkingDuration,
            } : msg
        ),
    })),

    setLoading: (loading) => set({ isLoading: loading }),

    setInputValue: (value) => set({ inputValue: value }),

    setInputMode: (mode) => set({ inputMode: mode }),

    setSelectedModel: (model) => set({ selectedModel: model }),

    clearMessages: () => set({ messages: [] }),

    setSpecStage: (stage) => set({ specStage: stage }),
    setTaskPhases: (phases) => set({ taskPhases: phases }),

    // Streaming Response Actions
    startStreaming: () => set({
        currentResponse: {
            ...initialStreamingState,
            thinkingStartTime: Date.now(),
            isStreaming: true,
        },
    }),

    updateStreamingResponse: (response) => set((state) => ({
        currentResponse: {
            ...state.currentResponse,
            ...response,
        },
    })),

    endStreaming: () => set((state) => ({
        currentResponse: {
            ...state.currentResponse,
            isStreaming: false,
        },
    })),
}));
