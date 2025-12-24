'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { usePageStore } from '@/stores/page-store';
import { useWebContainer } from '@/hooks/useWebContainer';
import { SelectionOverlay } from './SelectionOverlay';
import { FloatingAIInput } from './FloatingAIInput';
import { Loader2, RefreshCw, Terminal } from 'lucide-react';

interface PagePreviewProps {
    className?: string;
}

export function PagePreview({ className = '' }: PagePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showTerminal, setShowTerminal] = useState(false);

    const {
        setHoveredElement,
        setSelectedElement,
        selectedElement,
        hoveredElement,
        isSelectionModeEnabled
    } = useCanvasStore();

    const { activePageId, pages } = usePageStore();

    const {
        status,
        previewUrl,
        error,
        terminalOutput,
        initialize
    } = useWebContainer();

    // 활성 페이지에 따른 전체 프리뷰 URL 계산
    const fullPreviewUrl = useMemo(() => {
        if (!previewUrl) return null;

        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return previewUrl;

        // 루트 페이지는 그대로, 다른 페이지는 경로 추가
        if (activePage.path === '/') {
            return previewUrl;
        }
        // /about -> /about.html
        return `${previewUrl}${activePage.path}.html`;
    }, [previewUrl, activePageId, pages]);

    // Canvas 탭이 열리면 자동으로 WebContainer 시작
    useEffect(() => {
        if (status === 'idle') {
            initialize();
        }
    }, [status, initialize]);

    // 빈 영역 클릭 시 선택 해제
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedElement(null);
        }
    }, [setSelectedElement]);

    // iframe 로드 완료 핸들러
    const handleIframeLoad = () => {
        // postMessage 리스너 설정 (추후 IframeInjector와 통신용)
        window.addEventListener('message', handleIframeMessage);
    };

    // iframe으로부터 메시지 수신
    const handleIframeMessage = useCallback((event: MessageEvent) => {
        const { type, data } = event.data;

        // iframe의 컨테이너 내 오프셋 계산하여 좌표 보정
        const iframe = iframeRef.current;
        const container = containerRef.current;

        let adjustedData = data;

        if (iframe && container && data?.rect) {
            const iframeRect = iframe.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // 프레임 헤더 높이만큼 좌표 보정
            const offsetY = iframeRect.top - containerRect.top;
            const offsetX = iframeRect.left - containerRect.left;

            adjustedData = {
                ...data,
                rect: {
                    ...data.rect,
                    x: data.rect.x + offsetX,
                    y: data.rect.y + offsetY,
                },
            };
        }

        switch (type) {
            case 'element-hover':
                setHoveredElement(adjustedData);
                break;
            case 'element-select':
                setSelectedElement(adjustedData);
                break;
            case 'element-leave':
                setHoveredElement(null);
                break;
        }
    }, [setHoveredElement, setSelectedElement]);

    useEffect(() => {
        window.addEventListener('message', handleIframeMessage);
        return () => {
            window.removeEventListener('message', handleIframeMessage);
        };
    }, [handleIframeMessage]);

    const isLoading = status === 'booting' || status === 'installing';
    const isRunning = status === 'running';

    // 상태 메시지
    const getStatusMessage = () => {
        switch (status) {
            case 'booting': return 'WebContainer 부팅 중...';
            case 'installing': return '패키지 설치 중...';
            case 'running': return previewUrl ? '실행 중' : '서버 시작 중...';
            case 'error': return `오류: ${error}`;
            default: return '대기 중';
        }
    };

    return (
        <div
            ref={containerRef}
            data-preview-container
            className={`relative w-full h-full bg-zinc-950 overflow-hidden ${className}`}
            onClick={handleContainerClick}
        >
            {/* 브라우저 프레임 */}
            <div className="absolute inset-0 flex flex-col">
                {/* 브라우저 헤더 */}
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/70" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                        <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    </div>
                    <div className="flex-1 mx-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-md">
                            {isLoading && (
                                <Loader2 size={12} className="text-blue-400 animate-spin" />
                            )}
                            <span className="text-xs text-zinc-500">
                                {fullPreviewUrl || 'localhost:3001'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* 상태 표시 */}
                        <span className="text-xs text-zinc-500">{getStatusMessage()}</span>
                        {/* 터미널 토글 */}
                        <button
                            onClick={() => setShowTerminal(!showTerminal)}
                            className="liquid-glass-button p-1.5 rounded-lg"
                        >
                            <Terminal size={14} className={`relative z-10 ${showTerminal ? 'text-blue-400' : 'text-white/70'}`} />
                        </button>
                        {/* 새로고침 */}
                        {previewUrl && (
                            <button
                                onClick={() => iframeRef.current?.contentWindow?.location.reload()}
                                className="liquid-glass-button p-1.5 rounded-lg"
                            >
                                <RefreshCw size={14} className="text-white/70 relative z-10" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 에러 표시 */}
                {error && (
                    <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
                        <p className="text-xs text-red-400">{error}</p>
                    </div>
                )}

                {/* 메인 컨텐츠 영역 */}
                <div className="flex-1 relative">
                    {/* 로딩 상태 */}
                    {(isLoading || (isRunning && !previewUrl)) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 size={32} className="text-blue-500 animate-spin" />
                                <p className="text-sm text-zinc-400">{getStatusMessage()}</p>
                            </div>
                        </div>
                    )}

                    {/* iframe 프리뷰 */}
                    {fullPreviewUrl && (
                        <iframe
                            ref={iframeRef}
                            src={fullPreviewUrl}
                            className="w-full h-full border-0"
                            onLoad={handleIframeLoad}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                    )}

                    {/* 터미널 출력 */}
                    {showTerminal && (
                        <div className="absolute bottom-0 left-0 right-0 h-48 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-sm">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
                                <span className="text-xs font-medium text-zinc-400">Terminal</span>
                                <button
                                    onClick={() => setShowTerminal(false)}
                                    className="text-xs text-zinc-500 hover:text-white"
                                >
                                    닫기
                                </button>
                            </div>
                            <div className="h-[calc(100%-32px)] overflow-auto p-3 font-mono text-xs text-zinc-300">
                                {terminalOutput.map((line, i) => (
                                    <pre key={i} className="whitespace-pre-wrap">{line}</pre>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Selection Overlay - 선택 모드일 때만 표시 */}
            {isSelectionModeEnabled && (
                <SelectionOverlay
                    containerRef={containerRef}
                    selectedElement={selectedElement}
                    hoveredElement={hoveredElement}
                />
            )}

            {/* Floating AI Input - 선택 모드 + 선택된 요소가 있을 때만 표시 */}
            {isSelectionModeEnabled && selectedElement && (
                <FloatingAIInput
                    containerRef={containerRef}
                    selectedElement={selectedElement}
                />
            )}
        </div>
    );
}
