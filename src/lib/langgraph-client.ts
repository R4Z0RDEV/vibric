/**
 * LangGraph WebSocket Client
 * 
 * LangGraph 서버와 WebSocket으로 통신하는 클라이언트
 * 실시간 스트리밍, interrupt 처리 지원
 */

import { useChatStore, type AgentConfirmation } from '@/stores/chat-store';

export interface LangGraphMessage {
    type: 'message' | 'interrupt' | 'status' | 'artifact' | 'error';
    agent?: string;
    content?: string;
    confirmation?: AgentConfirmation;
    artifact?: {
        path: string;
        content: string;
    };
    error?: string;
}

export interface LangGraphClientConfig {
    url: string;
    onMessage?: (msg: LangGraphMessage) => void;
    onError?: (error: Error) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

class LangGraphClient {
    private ws: WebSocket | null = null;
    private config: LangGraphClientConfig;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(config: LangGraphClientConfig) {
        this.config = config;
    }

    /**
     * WebSocket 연결
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[LangGraph] Already connected');
            return;
        }

        try {
            this.ws = new WebSocket(this.config.url);

            this.ws.onopen = () => {
                console.log('[LangGraph] Connected');
                this.reconnectAttempts = 0;
                useChatStore.getState().setMultiConnected(true);
                this.config.onConnect?.();
            };

            this.ws.onclose = () => {
                console.log('[LangGraph] Disconnected');
                useChatStore.getState().setMultiConnected(false);
                this.config.onDisconnect?.();
                this.attemptReconnect();
            };

            this.ws.onerror = (event) => {
                console.error('[LangGraph] WebSocket error:', event);
                this.config.onError?.(new Error('WebSocket connection error'));
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: LangGraphMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('[LangGraph] Failed to parse message:', e);
                }
            };
        } catch (error) {
            console.error('[LangGraph] Failed to connect:', error);
            this.config.onError?.(error as Error);
        }
    }

    /**
     * 연결 해제
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * 메시지 전송
     */
    sendMessage(content: string): void {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('[LangGraph] Not connected');
            return;
        }

        const payload = {
            type: 'message',
            content,
            timestamp: new Date().toISOString(),
        };

        this.ws.send(JSON.stringify(payload));
        console.log('[LangGraph] Message sent:', content.substring(0, 50));
    }

    /**
     * 에이전트 확인 응답
     */
    confirmAgent(confirm: boolean, alternativeAgent?: string): void {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('[LangGraph] Not connected');
            return;
        }

        const payload = {
            type: 'confirm',
            confirm,
            alternativeAgent,
        };

        this.ws.send(JSON.stringify(payload));
        console.log('[LangGraph] Confirmation sent:', confirm, alternativeAgent);
    }

    /**
     * 연결 상태 확인
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * 메시지 처리
     */
    private handleMessage(message: LangGraphMessage): void {
        console.log('[LangGraph] Received:', message.type, message.agent);

        switch (message.type) {
            case 'interrupt':
                // 에이전트 확인 요청
                if (message.confirmation) {
                    useChatStore.getState().setPendingAgentConfirmation(message.confirmation);
                }
                break;

            case 'message':
                // 일반 메시지 (스트리밍)
                if (message.content) {
                    useChatStore.getState().updateStreamingResponse({
                        message: message.content,
                    });
                }
                break;

            case 'artifact':
                // 파일 생성/수정
                if (message.artifact) {
                    console.log('[LangGraph] Artifact:', message.artifact.path);
                    // FileSystem store와 연동 필요
                }
                break;

            case 'status':
                // 상태 업데이트
                console.log('[LangGraph] Status:', message.content);
                break;

            case 'error':
                // 에러
                console.error('[LangGraph] Error:', message.error);
                break;
        }

        this.config.onMessage?.(message);
    }

    /**
     * 재연결 시도
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[LangGraph] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`[LangGraph] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }
}

// 싱글톤 인스턴스
let clientInstance: LangGraphClient | null = null;

export function getLangGraphClient(config?: Partial<LangGraphClientConfig>): LangGraphClient {
    if (!clientInstance) {
        const defaultConfig: LangGraphClientConfig = {
            url: process.env.NEXT_PUBLIC_LANGGRAPH_WS_URL || 'ws://localhost:8000/ws',
            ...config,
        };
        clientInstance = new LangGraphClient(defaultConfig);
    }
    return clientInstance;
}

export function disconnectLangGraph(): void {
    if (clientInstance) {
        clientInstance.disconnect();
        clientInstance = null;
    }
}

export { LangGraphClient };
