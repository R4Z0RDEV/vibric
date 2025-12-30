import { create } from 'zustand';
import type { Message } from '@/types';
import type { ThinkingStep, ActionItem } from '@/lib/streaming-parser';

// 타입 정의
export type ChatInputMode = 'multi' | 'fast';
export type SelectedModel = 'gemini' | 'claude' | 'gpt-4';

// Multi 모드 에이전트 확인 요청
export interface AgentConfirmation {
    agent: string;           // 호출 예정 에이전트
    instruction: string;     // 수행할 작업 설명
    targetFiles?: string[];  // 영향받는 파일들
    alternatives?: string[]; // 대안 에이전트 목록
}

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

    // Multi Mode States
    multiConnected: boolean;
    pendingAgentConfirmation: AgentConfirmation | null;
    taskPhases: TaskPhase[];

    // Auto-send trigger (외부에서 자동 전송 트리거)
    pendingAutoSend: string | null;

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
    setMultiConnected: (connected: boolean) => void;
    setPendingAgentConfirmation: (confirmation: AgentConfirmation | null) => void;
    confirmAgent: (confirm: boolean, alternativeAgent?: string) => void;
    setTaskPhases: (phases: TaskPhase[]) => void;
    setPendingAutoSend: (message: string | null) => void;
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

    // Multi Mode States
    multiConnected: false,
    pendingAgentConfirmation: null,
    taskPhases: [],

    // Auto-send trigger
    pendingAutoSend: null,

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

    setMultiConnected: (connected) => set({ multiConnected: connected }),
    setPendingAgentConfirmation: (confirmation) => set({ pendingAgentConfirmation: confirmation }),
    confirmAgent: (confirm, alternativeAgent) => {
        // WebSocket으로 확인 응답 전송 (후속 구현)
        set({ pendingAgentConfirmation: null });
    },
    setTaskPhases: (phases) => set({ taskPhases: phases }),
    setPendingAutoSend: (message) => set({ pendingAutoSend: message }),

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
            thinkingStartTime: null, // 리셋하여 이전 세션 시간 방지
        },
    })),
}));
