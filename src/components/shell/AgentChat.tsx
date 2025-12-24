'use client';

import { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chat-store';
import { ChatInput } from '@/components/chat/ChatInput';
import type { Message } from '@/types';

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`
        w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
        liquid-glass-button
        ${isUser
                    ? 'bg-gradient-to-br from-blue-400/30 to-purple-500/30'
                    : 'bg-gradient-to-br from-emerald-400/30 to-cyan-500/30'
                }
      `}>
                {isUser ? (
                    <span className="text-white text-sm font-medium relative z-10">U</span>
                ) : (
                    <Sparkles className="w-4 h-4 text-white relative z-10" />
                )}
            </div>

            {/* Message Content */}
            <div className={`
        flex-1 max-w-[85%]
        ${isUser ? 'text-right' : ''}
      `}>
                <div className={`
          inline-block px-4 py-2.5 rounded-2xl
          liquid-glass-subtle
          ${isUser
                        ? 'bg-blue-500/20 rounded-tr-md'
                        : 'bg-white/5 rounded-tl-md'
                    }
        `}>
                    <p className="text-sm whitespace-pre-wrap text-left text-white relative z-10">
                        {message.content}
                        {message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-white/50 animate-pulse" />
                        )}
                    </p>
                </div>
                <p className="text-xs text-white/50 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

export function AgentChat() {
    const { messages, addMessage, inputMode } = useChatStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // 메시지 전송 핸들러
    const handleSubmit = (content: string) => {
        addMessage({
            role: 'user',
            content,
        });

        // Simulate AI response (to be replaced with actual API call)
        setTimeout(() => {
            if (inputMode === 'spec') {
                addMessage({
                    role: 'assistant',
                    content: '좋습니다! 요구사항을 수집하겠습니다.\n\n먼저, 어떤 종류의 프로젝트를 만들고 싶으신가요?\n\n1. 랜딩 페이지\n2. 웹 애플리케이션\n3. 대시보드\n4. 기타 (직접 설명)',
                });
            } else {
                addMessage({
                    role: 'assistant',
                    content: '안녕하세요! 무엇을 도와드릴까요? 웹 페이지나 컴포넌트를 만들어 드릴 수 있습니다.',
                });
            }
        }, 1000);
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header with Liquid Glass */}
            <div className="flex items-center justify-between px-4 py-3 liquid-glass-subtle rounded-none border-x-0 border-t-0">
                <div className="flex items-center gap-2 relative z-10">
                    <div className="w-6 h-6 rounded-full liquid-glass-button flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-sm text-white">AI Assistant</span>
                    {/* Mode Badge */}
                    <span className={`
                        px-2 py-0.5 rounded-full text-xs font-medium
                        ${inputMode === 'spec'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }
                    `}>
                        {inputMode === 'spec' ? 'Spec Mode' : 'Fast Mode'}
                    </span>
                </div>
                <span className="text-xs text-white/60 relative z-10">
                    {messages.length} messages
                </span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center">
                            <div className="w-20 h-20 rounded-2xl liquid-glass flex items-center justify-center mb-4">
                                <Sparkles className="w-8 h-8 text-white relative z-10" />
                            </div>
                            <h3 className="font-medium text-white mb-2">
                                {inputMode === 'spec'
                                    ? 'What do you want to build?'
                                    : '무엇을 만들어 드릴까요?'
                                }
                            </h3>
                            <p className="text-sm text-white/60 max-w-[250px]">
                                {inputMode === 'spec'
                                    ? 'Describe your project and I\'ll help you plan it step by step.'
                                    : '원하는 웹 페이지나 기능을 설명해주세요. AI가 코드를 생성해 드립니다.'
                                }
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* New ChatInput Component */}
            <ChatInput onSubmit={handleSubmit} />
        </div>
    );
}

