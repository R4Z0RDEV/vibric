'use client';

import { useRef, useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chat-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { ChatInput } from '@/components/chat/ChatInput';
import { SpecWorkflowIndicator } from '@/components/chat/SpecWorkflowIndicator';
import { TaskChecklistPanel } from '@/components/chat/TaskChecklistPanel';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { ActionLogList } from '@/components/chat/ActionLogList';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { StreamingParser } from '@/lib/streaming-parser';
import { addFileToTree, removeFileFromTree } from '@/lib/webcontainer-templates';
import { useWebContainer } from '@/hooks/useWebContainer';
import type { Message } from '@/types';

interface MessageBubbleProps {
    message: Message;
    isLastMessage: boolean;
}

function MessageBubble({ message, isLastMessage }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const { currentResponse } = useChatStore();

    // 스트리밍 중인지 확인 (마지막 AI 메시지에서만 스트리밍 UI 사용)
    const isCurrentlyStreaming = !isUser && isLastMessage && (message.isStreaming || currentResponse.isStreaming);

    // Thinking/Actions 데이터 결정: 스트리밍 중이면 currentResponse, 완료되면 message에서
    const thinkingData = isCurrentlyStreaming
        ? currentResponse.thinking
        : (message.thinking ?? []);

    const actionsData = isCurrentlyStreaming
        ? currentResponse.actions
        : (message.actions ?? []);

    // 경과 시간: 스트리밍 중이면 실시간 계산, 완료되면 저장된 값 사용
    const elapsedSeconds = isCurrentlyStreaming
        ? (currentResponse.thinkingStartTime
            ? Math.floor((Date.now() - currentResponse.thinkingStartTime) / 1000)
            : 0)
        : (message.thinkingDuration ?? 0);

    // 디버그 로그 (개발 중)
    if (!isUser && isLastMessage) {
        console.log('[ThinkingUI Debug]', {
            isCurrentlyStreaming,
            'thinkingData.length': thinkingData.length,
            'actionsData.length': actionsData.length,
            'message.thinking?.length': message.thinking?.length,
        });
    }

    // 메시지 내용 결정
    const getDisplayContent = () => {
        // 스트리밍 중인 마지막 AI 메시지: 파싱된 message 또는 "생각 중..." 표시
        if (isCurrentlyStreaming) {
            if (currentResponse.message) {
                return currentResponse.message;
            }
            // thinking이 있지만 message가 아직 없으면 빈 문자열
            if (thinkingData.length > 0 || actionsData.length > 0) {
                return '';
            }
            return '';
        }
        // 완료된 메시지: 저장된 content 표시
        return message.content;
    };

    const displayContent = getDisplayContent();

    // Thinking UI 표시 여부: AI 메시지이고 thinking/actions 데이터가 있으면 표시
    const showThinkingUI = !isUser && (thinkingData.length > 0 || actionsData.length > 0);

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

            {/* Message Content - min-w-0은 flex에서 축소 허용 */}
            <div className={`flex-1 min-w-0 max-w-[85%] overflow-hidden ${isUser ? 'text-right' : ''}`}>
                {/* Thinking Block - AI 메시지에서 thinking 데이터가 있으면 표시 */}
                {showThinkingUI && thinkingData.length > 0 && (
                    <ThinkingBlock
                        steps={thinkingData}
                        elapsedSeconds={elapsedSeconds}
                        isStreaming={isCurrentlyStreaming}
                    />
                )}

                {/* Action Logs - AI 메시지에서 actions 데이터가 있으면 표시 */}
                {showThinkingUI && actionsData.length > 0 && (
                    <ActionLogList
                        actions={actionsData}
                        isStreaming={isCurrentlyStreaming}
                    />
                )}

                {/* Message Bubble - 내용이 있을 때만 표시 */}
                {(displayContent || isCurrentlyStreaming) && (
                    <div className={`
                        w-fit max-w-full px-4 py-2.5 rounded-2xl overflow-hidden
                        liquid-glass-subtle
                        ${isUser
                            ? 'bg-blue-500/20 rounded-tr-md ml-auto'
                            : 'bg-white/5 rounded-tl-md'
                        }
                    `}>
                        {displayContent ? (
                            isUser ? (
                                // 유저 메시지: 일반 텍스트
                                <p className="text-sm whitespace-pre-wrap break-all text-left text-white relative z-10">
                                    {displayContent}
                                </p>
                            ) : (
                                // AI 메시지: Markdown 렌더링
                                <MarkdownRenderer
                                    content={displayContent}
                                    className="text-sm break-all"
                                />
                            )
                        ) : (
                            <span className="flex items-center gap-2 text-white/50 text-sm">
                                <Loader2 size={14} className="animate-spin" />
                                처리 중...
                            </span>
                        )}
                    </div>
                )}

                <p className="text-xs text-white/50 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

export function AgentChat() {
    const {
        messages,
        addMessage,
        updateMessage,
        inputMode,
        specStage,
        setSpecStage,
        selectedModel,
        isLoading,
        setLoading,
        startStreaming,
        updateStreamingResponse,
        endStreaming,
        currentResponse,
    } = useChatStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const parserRef = useRef<StreamingParser>(new StreamingParser());

    // WebContainer 연동 - 파일 생성/수정/삭제용 (초기화는 Canvas/PagePreview에서 담당)
    const { syncFile, removeFile, status: webContainerStatus } = useWebContainer();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, currentResponse]);

    // Spec 모드 상태 전이 처리
    const handleSpecModeTransition = (content: string) => {
        if (inputMode !== 'spec') return;

        if (specStage === 'idle') {
            setSpecStage('requirements');
        } else if (specStage === 'requirements') {
            if (content.match(/좋아|진행|네|yes|okay|proceed/i)) {
                setSpecStage('plan');
            }
        } else if (specStage === 'plan') {
            if (content.match(/시작|start|go|begin/i)) {
                setSpecStage('task');
            }
        }
    };

    // 메시지 전송 핸들러 - 실제 AI API 호출 + XML 파싱
    const handleSubmit = async (content: string) => {
        // 1. 사용자 메시지 추가
        addMessage({
            role: 'user',
            content,
        });

        // 2. Spec 모드 상태 전이 처리
        handleSpecModeTransition(content);

        // 3. AI 응답 메시지 생성 (스트리밍용)
        addMessage({
            role: 'assistant',
            content: '',
            isStreaming: true,
        });

        // 4. 스트리밍 상태 초기화
        parserRef.current.reset();
        startStreaming();
        setLoading(true);

        try {
            // 5. API 호출
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content }
                    ],
                    mode: inputMode,
                    specStage: useChatStore.getState().specStage,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // 6. 스트리밍 응답 처리 + XML 파싱
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });

                    // XML 파싱
                    const parsed = parserRef.current.addChunk(chunk);

                    // 스트리밍 상태 업데이트
                    updateStreamingResponse({
                        thinking: parsed.thinking,
                        actions: parsed.actions,
                        message: parsed.message,
                    });
                }
            }

            // 7. 스트리밍 완료
            endStreaming();

            const lastMessage = useChatStore.getState().messages.at(-1);
            if (lastMessage) {
                const finalParsed = parserRef.current.getState();
                const { currentResponse } = useChatStore.getState();

                // 경과 시간 계산
                const thinkingDuration = currentResponse.thinkingStartTime
                    ? Math.floor((Date.now() - currentResponse.thinkingStartTime) / 1000)
                    : 0;

                // 최종 메시지 - 파싱된 message 또는 에러
                const finalContent = finalParsed.message || '응답을 파싱하지 못했습니다.';

                // 8. AI Actions 실행 - 파일 생성/수정
                // filesystem-store에 먼저 추가 (FileTree에 즉시 표시)
                let currentFiles = useFileSystemStore.getState().files;
                const { setFiles } = useFileSystemStore.getState();

                for (const action of finalParsed.actions) {
                    if ((action.type === 'create_file' || action.type === 'modify_file') && action.path && action.content) {
                        try {
                            // 1. filesystem-store 업데이트 (addFileToTree로 중첩 구조 지원)
                            currentFiles = addFileToTree(currentFiles, action.path, action.content);
                            setFiles(currentFiles);
                            console.log(`[AgentChat] FileSystem에 파일 추가/업데이트: ${action.path}`);

                            // 2. WebContainer에도 동기화 (running 상태일 때만)
                            if (webContainerStatus === 'running') {
                                await syncFile(action.path, action.content);
                                console.log(`[AgentChat] WebContainer에 파일 동기화: ${action.path}`);
                            }

                            action.status = 'completed';
                        } catch (err) {
                            action.status = 'error';
                            console.error(`[AgentChat] 파일 생성 실패: ${action.path}`, err);
                        }
                    } else if (action.type === 'delete_file' && action.path) {
                        try {
                            // 1. filesystem-store에서 삭제
                            currentFiles = removeFileFromTree(currentFiles, action.path);
                            setFiles(currentFiles);
                            console.log(`[AgentChat] FileSystem에서 파일 삭제: ${action.path}`);

                            // 2. WebContainer에서도 삭제 (running 상태일 때만)
                            if (webContainerStatus === 'running') {
                                await removeFile(action.path);
                                console.log(`[AgentChat] WebContainer에서 파일 삭제: ${action.path}`);
                            }

                            action.status = 'completed';
                        } catch (err) {
                            action.status = 'error';
                            console.error(`[AgentChat] 파일 삭제 실패: ${action.path}`, err);
                        }
                    }
                }

                // thinking/actions를 메시지에 영구 저장
                updateMessage(lastMessage.id, finalContent, {
                    thinking: finalParsed.thinking.map(step => ({
                        title: step.title,
                        content: step.content,
                    })),
                    actions: finalParsed.actions.map(action => ({
                        type: action.type,
                        path: action.path,
                        lines: action.lines,
                        content: action.content,
                        status: action.status,
                    })),
                    thinkingDuration,
                });
            }

        } catch (error) {
            console.error('AI API 호출 실패:', error);
            endStreaming();

            const lastMessage = useChatStore.getState().messages.at(-1);
            if (lastMessage) {
                updateMessage(lastMessage.id, `⚠️ AI 응답 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n.env.local에 GOOGLE_GENERATIVE_AI_API_KEY가 설정되어 있는지 확인해주세요.`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
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
                    {isLoading && (
                        <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                    )}
                </div>
                <span className="text-xs text-white/60 relative z-10">
                    {messages.length} messages
                </span>
            </div>

            {/* Spec Workflow Indicator */}
            <SpecWorkflowIndicator />

            {/* Task Checklist (Only in Task Stage) */}
            <TaskChecklistPanel />

            {/* Messages - min-h-0 ensures flex-1 respects container height */}
            <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
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
                        messages.map((message, index) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isLastMessage={index === messages.length - 1}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* New ChatInput Component */}
            <ChatInput onSubmit={handleSubmit} />
        </div>
    );
}
