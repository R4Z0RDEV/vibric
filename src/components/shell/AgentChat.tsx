'use client';

import { useRef, useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chat-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { usePageStore } from '@/stores/page-store';
import { ChatInput } from '@/components/chat/ChatInput';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { ActionLogList } from '@/components/chat/ActionLogList';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { AgentConfirmation } from '@/components/chat/AgentConfirmation';
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

    // 실시간 타이머: 스트리밍 중에는 1초마다 업데이트
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [finalElapsedSeconds, setFinalElapsedSeconds] = useState<number | null>(null);

    useEffect(() => {
        if (isCurrentlyStreaming && currentResponse.thinkingStartTime) {
            // 스트리밍 시작: 최종값 리셋
            setFinalElapsedSeconds(null);

            // 1초마다 타이머 업데이트
            const interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - currentResponse.thinkingStartTime!) / 1000);
                setElapsedSeconds(elapsed);
            }, 1000);

            // 초기값 설정
            setElapsedSeconds(Math.floor((Date.now() - currentResponse.thinkingStartTime) / 1000));

            return () => {
                // cleanup 시 최종값 캡처
                const final = Math.floor((Date.now() - currentResponse.thinkingStartTime!) / 1000);
                setFinalElapsedSeconds(final);
                clearInterval(interval);
            };
        }
    }, [isCurrentlyStreaming, currentResponse.thinkingStartTime]);

    // 저장된 thinkingDuration이 있으면 사용 (이전 메시지들)
    useEffect(() => {
        if (!isCurrentlyStreaming && message.thinkingDuration && message.thinkingDuration > 0) {
            setElapsedSeconds(message.thinkingDuration);
        }
    }, [isCurrentlyStreaming, message.thinkingDuration]);

    // 실제 표시할 시간
    const displaySeconds = finalElapsedSeconds ?? elapsedSeconds;

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

    // Spec 모드에서 스트리밍 중일 때 간단한 타이머 표시
    const showSpecStreamingIndicator = !isUser && isCurrentlyStreaming && thinkingData.length === 0 && actionsData.length === 0;

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
                {/* Spec 모드 스트리밍 인디케이터 - XML 파싱 없이도 타이머 표시 */}
                {showSpecStreamingIndicator && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-white/5 text-white/70 text-sm">
                        <Loader2 size={14} className="animate-spin text-purple-400" />
                        <span>응답 생성 중...</span>
                        <span className="text-white/50">({displaySeconds}s)</span>
                    </div>
                )}

                {/* Thinking Block - AI 메시지에서 thinking 데이터가 있으면 표시 */}
                {showThinkingUI && thinkingData.length > 0 && (
                    <ThinkingBlock
                        steps={thinkingData}
                        elapsedSeconds={displaySeconds}
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
        multiConnected,
        setMultiConnected,
        selectedModel,
        isLoading,
        setLoading,
        startStreaming,
        updateStreamingResponse,
        endStreaming,
        currentResponse,
        pendingAutoSend,
        setPendingAutoSend,
    } = useChatStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const parserRef = useRef<StreamingParser>(new StreamingParser());

    // WebContainer 연동 - 파일 생성/수정/삭제/명령 실행
    const { syncFile, removeFile, runCommand, status: webContainerStatus } = useWebContainer();

    // 스크롤을 맨 아래로 이동하는 함수
    const scrollToBottom = () => {
        // Radix ScrollArea의 Viewport 찾기
        const viewport = scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    };

    // Auto-scroll to bottom when new messages arrive or streaming updates
    useEffect(() => {
        // requestAnimationFrame으로 렌더링 완료 후 스크롤
        requestAnimationFrame(() => {
            scrollToBottom();
        });
    }, [messages.length, currentResponse.message]);

    // Auto-send Trigger
    useEffect(() => {
        if (pendingAutoSend && !isLoading) {
            console.log('[AgentChat] Auto-sending message:', pendingAutoSend);
            // 메시지 전송
            handleSubmit(pendingAutoSend);
            // 상태 초기화
            setPendingAutoSend(null);
        }
    }, [pendingAutoSend, isLoading]);

    // Multi 모드 상태 전이 처리 (간소화)
    const handleMultiModeTransition = (content: string) => {
        // Multi 모드에서는 WebSocket을 통해 백엔드에서 처리
        // 프론트엔드에서는 단순히 로깅만
        if (inputMode !== 'multi') return;
        console.log('[Multi Mode] User input:', content.substring(0, 50));
    };

    // 메시지 전송 핸들러 - 실제 AI API 호출 + XML 파싱
    const handleSubmit = async (content: string) => {
        // 1. 사용자 메시지 추가
        addMessage({
            role: 'user',
            content,
        });

        // 2. Multi 모드 상태 처리
        handleMultiModeTransition(content);

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
                    multiConnected: useChatStore.getState().multiConnected,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // 6. 스트리밍 응답 처리
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let rawText = ''; // Spec 모드용 원본 텍스트
            let lastUpdateTime = 0;
            const THROTTLE_MS = 50; // 50ms throttle로 렉 방지

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    rawText += chunk; // 원본 텍스트 누적

                    // XML 파싱 모드에서는 항상 parser에 chunk 추가 (데이터 손실 방지)
                    // 현재 multiConnected 읽기 (클로저 캡처 방지)
                    const currentSpecStage = useChatStore.getState().multiConnected;

                    // 모든 모드에서 XML 파싱 수행 (새 프롬프트는 항상 XML 형식)
                    parserRef.current.addChunk(chunk);

                    // Throttle: UI 업데이트만 제어 (데이터 파싱은 계속 진행)
                    const now = Date.now();
                    if (now - lastUpdateTime < THROTTLE_MS) continue;
                    lastUpdateTime = now;

                    // 파싱 결과로 UI 업데이트
                    const parsed = parserRef.current.getState();

                    if (inputMode === 'fast' || (inputMode === 'multi' && currentSpecStage)) {
                        // Fast 모드 또는 Spec task 단계: Thinking/Actions 포함
                        updateStreamingResponse({
                            thinking: parsed.thinking,
                            actions: parsed.actions,
                            message: parsed.message,
                        });
                    } else {
                        // Spec requirements/plan 단계: message만 표시 (XML 파싱된 결과)
                        updateStreamingResponse({
                            thinking: [],
                            actions: [],
                            message: parsed.message || rawText, // 파싱 실패 시 fallback
                        });
                    }
                }

                // 마지막 청크 업데이트 보장
                const finalParsedState = parserRef.current.getState();
                const finalSpecStage = useChatStore.getState().multiConnected;

                if (inputMode === 'fast' || (inputMode === 'multi' && finalSpecStage)) {
                    updateStreamingResponse({
                        thinking: finalParsedState.thinking,
                        actions: finalParsedState.actions,
                        message: finalParsedState.message,
                    });
                } else {
                    updateStreamingResponse({
                        thinking: [],
                        actions: [],
                        message: finalParsedState.message || rawText,
                    });
                }
            }

            // 7. 최종 메시지 처리 및 액션 실행
            const lastMessage = useChatStore.getState().messages.at(-1);
            if (lastMessage) {
                const finalParsed = parserRef.current.getState();
                const { currentResponse } = useChatStore.getState();

                // 경과 시간 계산
                const thinkingDuration = currentResponse.thinkingStartTime
                    ? Math.floor((Date.now() - currentResponse.thinkingStartTime) / 1000)
                    : 0;

                // 최종 메시지 결정 (모드에 따라 다름)
                let finalContent: string;
                // 최종 메시지 결정 (실시간 multiConnected 확인)
                const messageSpecStage = useChatStore.getState().multiConnected;
                console.log('[DEBUG] messageSpecStage:', messageSpecStage, 'inputMode:', inputMode);

                if (inputMode === 'fast' || (inputMode === 'multi' && messageSpecStage)) {
                    // Fast 모드 또는 Spec task 단계: XML 파싱 결과 사용
                    finalContent = finalParsed.message || '응답을 파싱하지 못했습니다.';
                    console.log('[DEBUG] XML Parse Mode - finalParsed.message:', finalParsed.message?.substring(0, 200));
                    console.log('[DEBUG] XML Parse Mode - finalParsed.actions:', finalParsed.actions.length);
                } else {
                    // Spec requirements/plan 단계: 파싱된 message 사용 (fallback: rawText)
                    finalContent = finalParsed.message || rawText.trim() || '응답을 받지 못했습니다.';
                    console.log('[DEBUG] Multi Mode - finalParsed.message:', finalParsed.message?.substring(0, 200));
                }
                console.log('[DEBUG] Final Content to save:', finalContent.substring(0, 200));

                // 7.5. (삭제됨 - spec-store 제거됨)

                // 8. AI Actions 실행 - 모든 액션 타입 지원
                // filesystem-store에 먼저 추가 (FileTree에 즉시 표시)
                let currentFiles = useFileSystemStore.getState().files;
                const { setFiles } = useFileSystemStore.getState();

                for (const action of finalParsed.actions) {
                    try {
                        switch (action.type) {
                            case 'create_file':
                            case 'modify_file':
                                if (action.path && action.content) {
                                    // 1. WebContainer에 먼저 파일 동기화 (서버 시작 race condition 방지)
                                    if (webContainerStatus === 'running' || webContainerStatus === 'ready') {
                                        await syncFile(action.path, action.content);
                                        console.log(`[AgentChat] WebContainer에 파일 동기화: ${action.path}`);
                                    }

                                    // 2. 그 다음 Store 업데이트 (UI 반영 & 서버 시작 트리거)
                                    currentFiles = addFileToTree(currentFiles, action.path, action.content);
                                    setFiles(currentFiles);
                                    console.log(`[AgentChat] FileSystem에 파일 추가/업데이트: ${action.path}`);
                                    action.status = 'completed';
                                }
                                break;

                            case 'delete_file':
                                if (action.path) {
                                    currentFiles = removeFileFromTree(currentFiles, action.path);
                                    setFiles(currentFiles);
                                    console.log(`[AgentChat] FileSystem에서 파일 삭제: ${action.path}`);

                                    if (webContainerStatus === 'running' || webContainerStatus === 'ready') {
                                        await removeFile(action.path);
                                        console.log(`[AgentChat] WebContainer에서 파일 삭제: ${action.path}`);
                                    }
                                    action.status = 'completed';
                                }
                                break;

                            case 'run_command':
                                if (action.command && webContainerStatus === 'running') {
                                    const commandParts = action.command.split(' ');
                                    console.log(`[AgentChat] 커맨드 실행: ${action.command}`);
                                    const result = await runCommand(commandParts);
                                    if (result.exitCode === 0) {
                                        console.log(`[AgentChat] 커맨드 완료:`, result.output);
                                        action.status = 'completed';
                                    } else {
                                        console.error(`[AgentChat] 커맨드 실패 (exit ${result.exitCode}):`, result.output);
                                        action.status = 'error';
                                    }
                                } else {
                                    console.warn('[AgentChat] WebContainer not running or no command');
                                    action.status = 'error';
                                }
                                break;

                            case 'read_file':
                            case 'list_files':
                            case 'analyze_code':
                                // 분석 액션은 로그만 기록 (결과는 AI에게 전달 필요)
                                console.log(`[AgentChat] 분석 액션: ${action.type}`, action.path);
                                action.status = 'completed';
                                break;

                            case 'get_logs':
                            case 'get_errors':
                                // 디버깅 액션
                                console.log(`[AgentChat] 디버깅 액션: ${action.type}`);
                                action.status = 'completed';
                                break;

                            case 'refresh_preview':
                            case 'navigate_to':
                                // 브라우저 액션
                                console.log(`[AgentChat] 브라우저 액션: ${action.type}`, action.url);
                                action.status = 'completed';
                                break;

                            case 'web_search':
                                // 웹 검색 액션
                                console.log(`[AgentChat] 웹 검색: ${action.query}`);
                                action.status = 'completed';
                                break;

                            case 'git_checkpoint':
                                // Git 체크포인트 생성
                                if (webContainerStatus === 'running') {
                                    const message = action.message || `Checkpoint at ${new Date().toISOString()}`;
                                    console.log(`[AgentChat] Git 체크포인트: ${message}`);
                                    // git add . && git commit -m "message"
                                    await runCommand(['git', 'add', '.']);
                                    await runCommand(['git', 'commit', '-m', message]);
                                    action.status = 'completed';
                                } else {
                                    action.status = 'error';
                                }
                                break;

                            case 'git_revert':
                                // Git 롤백
                                if (webContainerStatus === 'running') {
                                    const steps = action.steps || 1;
                                    console.log(`[AgentChat] Git 롤백: ${steps} step(s)`);
                                    await runCommand(['git', 'reset', '--hard', `HEAD~${steps}`]);
                                    action.status = 'completed';
                                } else {
                                    action.status = 'error';
                                }
                                break;

                            case 'git_status':
                            case 'git_diff':
                                // Git 상태 확인 (읽기 전용)
                                console.log(`[AgentChat] Git ${action.type}`);
                                action.status = 'completed';
                                break;

                            default:
                                console.warn(`[AgentChat] 알 수 없는 액션 타입: ${action.type}`);
                                break;
                        }
                    } catch (err) {
                        action.status = 'error';
                        console.error(`[AgentChat] 액션 실행 실패: ${action.type}`, err);
                    }
                }

                // 8.5. 파일 변경 후 페이지 목록 자동 동기화
                const updatedFiles = useFileSystemStore.getState().files;
                usePageStore.getState().syncFromFileSystem(updatedFiles);
                console.log('[AgentChat] 페이지 목록 동기화 완료');

                // 9. thinking/actions를 메시지에 영구 저장 (endStreaming 전에!)
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
                        command: action.command,
                        query: action.query,
                        url: action.url,
                        status: action.status,
                    })),
                    thinkingDuration,
                });
            }

            // 10. 스트리밍 완료 (메시지 업데이트 후!)
            endStreaming();

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
                        ${inputMode === 'multi'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }
                    `}>
                        {inputMode === 'multi' ? 'Multi Mode' : 'Fast Mode'}
                    </span>
                    {isLoading && (
                        <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                    )}
                </div>
                <span className="text-xs text-white/60 relative z-10">
                    {messages.length} messages
                </span>
            </div>

            {/* Multi Mode - 에이전트 확인 UI */}
            <AgentConfirmation />

            {/* Messages - min-h-0 ensures flex-1 respects container height */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 p-4">
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center">
                            <div className="w-20 h-20 rounded-2xl liquid-glass flex items-center justify-center mb-4">
                                <Sparkles className="w-8 h-8 text-white relative z-10" />
                            </div>
                            <h3 className="font-medium text-white mb-2">
                                {inputMode === 'multi'
                                    ? 'What do you want to build?'
                                    : '무엇을 만들어 드릴까요?'
                                }
                            </h3>
                            <p className="text-sm text-white/60 max-w-[250px]">
                                {inputMode === 'multi'
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
                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* New ChatInput Component */}
            <ChatInput onSubmit={handleSubmit} />
        </div>
    );
}
