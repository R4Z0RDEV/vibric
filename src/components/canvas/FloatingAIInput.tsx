'use client';

import { useState, useRef, RefObject, useEffect } from 'react';
import { useCanvasStore, type SelectedElementInfo } from '@/stores/canvas-store';
import { useChatStore } from '@/stores/chat-store';
import { Send, Sparkles, X, Loader2 } from 'lucide-react';

interface FloatingAIInputProps {
    containerRef: RefObject<HTMLDivElement | null>;
    selectedElement: SelectedElementInfo;
}

export function FloatingAIInput({ containerRef, selectedElement }: FloatingAIInputProps) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { isAIProcessing, setAIProcessing, setSelectedElement } = useCanvasStore();
    const { addMessage } = useChatStore();

    // 자동 포커스
    useEffect(() => {
        inputRef.current?.focus();
    }, [selectedElement]);

    // AI 수정 요청 처리
    const handleSubmit = async () => {
        if (!input.trim() || isAIProcessing) return;

        setAIProcessing(true);

        // 1. 사용자 메시지 추가 (ChatStore)
        const contextPrefix = `[Context: ${selectedElement.tagName}] `;
        const userContent = contextPrefix + input.trim();
        addMessage({
            role: 'user',
            content: userContent,
        });

        // 2. AI 응답 메시지 생성 (스트리밍용)
        addMessage({
            role: 'assistant',
            content: '',
            isStreaming: true,
        });

        try {
            // 3. 실제 AI API 호출
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: userContent }],
                    mode: 'fast',
                    specStage: 'idle',
                    model: 'gemini-2.0-flash',
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // 4. 스트리밍 응답 처리
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    fullContent += chunk;

                    // 마지막 AI 메시지 업데이트
                    const messages = useChatStore.getState().messages;
                    const lastMessage = messages.at(-1);
                    if (lastMessage && lastMessage.role === 'assistant') {
                        useChatStore.getState().updateMessage(lastMessage.id, fullContent);
                    }
                }
            }

            // 성공 후 입력창 닫기
            setInput('');
            setSelectedElement(null);
        } catch (error) {
            console.error('AI 수정 실패:', error);
            // 마지막 AI 메시지를 에러로 업데이트
            const messages = useChatStore.getState().messages;
            const lastMessage = messages.at(-1);
            if (lastMessage && lastMessage.role === 'assistant') {
                useChatStore.getState().updateMessage(
                    lastMessage.id,
                    `⚠️ AI 수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
                );
            }
        } finally {
            setAIProcessing(false);
        }
    };

    // Enter 키 핸들러
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            setSelectedElement(null);
        }
    };

    // 위치 계산 (선택된 요소 아래)
    const top = selectedElement.rect.y + selectedElement.rect.height + 12;
    const left = selectedElement.rect.x;

    return (
        <div
            className="absolute z-20 pointer-events-auto animate-fade-in"
            style={{
                top,
                left,
                minWidth: 320,
                maxWidth: 480,
            }}
        >
            {/* Glass Morphism Container */}
            <div
                className="liquid-glass-card rounded-2xl overflow-hidden"
                style={{ background: 'rgba(0, 0, 0, 0.75)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Sparkles size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">AI 수정</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-white/50">
                            {selectedElement.filePath?.split('/').pop()}:{selectedElement.lineNumber}
                        </span>
                        <button
                            onClick={() => setSelectedElement(null)}
                            className="liquid-glass-button p-1.5 rounded-lg"
                        >
                            <X size={14} className="text-white/70 relative z-10" />
                        </button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="이 요소를 어떻게 수정할까요?"
                            disabled={isAIProcessing}
                            className="liquid-glass-input flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/40 disabled:opacity-50"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isAIProcessing}
                            className="liquid-glass-button p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAIProcessing ? (
                                <Loader2 size={18} className="text-white relative z-10 animate-spin" />
                            ) : (
                                <Send size={18} className="text-white relative z-10" />
                            )}
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {['색상 변경', '크기 조절', '텍스트 수정', '스타일 개선'].map((action) => (
                            <button
                                key={action}
                                onClick={() => setInput(input ? `${input}, ${action}` : action)}
                                disabled={isAIProcessing}
                                className="liquid-glass-pill px-3 py-1.5 text-xs text-white/70 hover:text-white disabled:opacity-50 transition-colors"
                            >
                                <span className="relative z-10">{action}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Processing State */}
                {isAIProcessing && (
                    <div className="px-4 pb-4">
                        <div className="flex items-center gap-3 px-4 py-3 liquid-glass-subtle rounded-xl">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Loader2 size={12} className="text-blue-400 animate-spin" />
                            </div>
                            <span className="text-xs text-white/60">AI가 코드를 수정하고 있습니다...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
