'use client';

import { usePageStore } from '@/stores/page-store';
import { useWebContainerStore } from '@/stores/webcontainer-store';
import { X, ExternalLink } from 'lucide-react';
import { useEffect, useCallback } from 'react';

export function MissionControlView() {
    const {
        pages,
        activePageId,
        isMissionControlOpen,
        setActivePage,
        setMissionControlOpen
    } = usePageStore();

    const { previewUrl } = useWebContainerStore();

    // ESC 키로 닫기
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setMissionControlOpen(false);
        }
    }, [setMissionControlOpen]);

    useEffect(() => {
        if (isMissionControlOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isMissionControlOpen, handleKeyDown]);

    // 페이지 선택 및 뷰 닫기
    const handlePageSelect = (pageId: string) => {
        setActivePage(pageId);
        setMissionControlOpen(false);
    };

    // 페이지별 프리뷰 URL 가져오기
    const getPagePreviewUrl = (path: string): string | null => {
        if (!previewUrl) return null;
        // 루트는 그대로, 다른 경로는 .html 확장자 추가
        if (path === '/') {
            return previewUrl;
        }
        return `${previewUrl}${path}.html`;
    };

    // 페이지 색상 (그라데이션)
    const getPageGradient = (index: number) => {
        const gradients = [
            'from-blue-500/40 to-purple-500/40',
            'from-green-500/40 to-teal-500/40',
            'from-orange-500/40 to-red-500/40',
            'from-pink-500/40 to-rose-500/40',
            'from-indigo-500/40 to-blue-500/40',
            'from-cyan-500/40 to-blue-500/40',
        ];
        return gradients[index % gradients.length];
    };

    if (!isMissionControlOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
            style={{
                background: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(24px)',
            }}
        >
            {/* 닫기 버튼 */}
            <button
                onClick={() => setMissionControlOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
                <X size={24} className="text-white" />
            </button>

            {/* 헤더 */}
            <div className="absolute top-6 left-6 z-10">
                <h2 className="text-2xl font-semibold text-white">Mission Control</h2>
                <p className="text-sm text-white/60 mt-1">
                    페이지를 선택하여 전환하세요 • ESC로 닫기
                </p>
            </div>

            {/* 페이지 그리드 */}
            <div className="w-full max-w-6xl px-8">
                <div
                    className="grid gap-8"
                    style={{
                        gridTemplateColumns: `repeat(${Math.min(pages.length, 3)}, 1fr)`,
                    }}
                >
                    {pages.map((page, index) => {
                        const isActive = page.id === activePageId;
                        const previewUrl = getPagePreviewUrl(page.path);

                        return (
                            <div
                                key={page.id}
                                onClick={() => handlePageSelect(page.id)}
                                className={`
                                    group relative cursor-pointer
                                    transform transition-all duration-300 ease-out
                                    hover:scale-105 hover:z-10
                                    ${isActive ? 'ring-4 ring-blue-500 ring-offset-4 ring-offset-zinc-900' : ''}
                                    animate-scale-in
                                `}
                                style={{
                                    animationDelay: `${index * 80}ms`,
                                }}
                            >
                                {/* 카드 컨테이너 */}
                                <div
                                    className={`
                                        aspect-[16/10] rounded-2xl overflow-hidden
                                        border-2 ${isActive ? 'border-blue-500' : 'border-white/20'}
                                        shadow-2xl
                                        relative
                                    `}
                                >
                                    {/* 실제 페이지 프리뷰 iframe */}
                                    {previewUrl ? (
                                        <iframe
                                            src={previewUrl}
                                            className="w-full h-full border-0 pointer-events-none"
                                            style={{
                                                transform: 'scale(0.5)',
                                                transformOrigin: 'top left',
                                                width: '200%',
                                                height: '200%',
                                            }}
                                            sandbox="allow-scripts allow-same-origin"
                                            title={`Preview: ${page.name}`}
                                        />
                                    ) : (
                                        /* 프리뷰 없을 때 플레이스홀더 */
                                        <div className={`w-full h-full bg-gradient-to-br ${getPageGradient(index)} flex items-center justify-center`}>
                                            <span className="text-white/50 text-sm">프리뷰 로딩 중...</span>
                                        </div>
                                    )}

                                    {/* 페이지 이름 오버레이 (상단) */}
                                    <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-medium text-sm">
                                                {page.name}
                                            </span>
                                            <span className="text-white/60 text-xs">
                                                {page.path}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 활성 표시 배지 */}
                                    {isActive && (
                                        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-blue-500 text-xs text-white font-medium shadow-lg">
                                            현재 페이지
                                        </div>
                                    )}

                                    {/* 호버 오버레이 */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                                            <ExternalLink size={18} className="text-white" />
                                            <span className="text-sm font-medium text-white">열기</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 카드 그림자 */}
                                <div
                                    className="absolute inset-0 -z-10 rounded-2xl bg-black/60 blur-2xl transform translate-y-6 scale-95 opacity-60"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 하단 힌트 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/70 font-mono">ESC</kbd>
                        <span className="text-sm text-white/50">닫기</span>
                    </div>
                    <div className="w-px h-4 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/70 font-mono">Click</kbd>
                        <span className="text-sm text-white/50">페이지 선택</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
