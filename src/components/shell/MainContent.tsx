'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { PagePreview, PagePanel, MissionControlView, FloatingToolbar } from '@/components/canvas';
import { CodeEditor } from '@/components/editor';
import { PanelRightClose } from 'lucide-react';

// Placeholder components for non-canvas tabs

import { PageContainer } from '@/components/layout/PageContainer';

function AssetsView() {
    return (
        <PageContainer className="flex items-center justify-center">
            <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 liquid-glass-card rounded-2xl flex items-center justify-center text-foreground">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70 relative z-10">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                </div>
                <h3 className="text-xl font-medium tracking-tight mb-3">Assets</h3>
                <p className="text-sm text-muted-foreground max-w-[320px] text-balance">
                    로고, 폰트, 이미지 등의 에셋을 관리하고 AI에게 컨텍스트를 제공하세요.
                </p>
            </div>
        </PageContainer>
    );
}

function DashboardView() {
    return (
        <PageContainer className="flex items-center justify-center">
            <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 liquid-glass-card rounded-2xl flex items-center justify-center text-foreground">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70 relative z-10">
                        <rect width="7" height="9" x="3" y="3" rx="1" />
                        <rect width="7" height="5" x="14" y="3" rx="1" />
                        <rect width="7" height="9" x="14" y="12" rx="1" />
                        <rect width="7" height="5" x="3" y="16" rx="1" />
                    </svg>
                </div>
                <h3 className="text-xl font-medium tracking-tight mb-3">Dashboard</h3>
                <p className="text-sm text-muted-foreground max-w-[320px] text-balance">
                    프로젝트 설정, 데이터베이스, 분석, 도메인 등을 관리하세요.
                </p>
            </div>
        </PageContainer>
    );
}

export function MainContent() {
    const { activeTab } = useUIStore();
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    // 대신 hidden CSS로 숨겨서 상태 유지 (Terminal 언마운트 방지)
    return (
        <div className="w-full h-full overflow-hidden relative">
            {/* Canvas Tab - 항상 마운트, 숨김 처리 */}
            <div className={`absolute inset-0 ${activeTab === 'canvas' ? '' : 'hidden'}`}>
                <div className="flex h-full">
                    {/* Page Preview */}
                    <div className="flex-1 relative">
                        <PagePreview />
                        {/* Floating Toolbar - Canvas 하단 중앙 */}
                        <FloatingToolbar />
                    </div>

                    {/* Panel Toggle */}
                    {!isPanelOpen && (
                        <button
                            onClick={() => setIsPanelOpen(true)}
                            className="absolute top-2 right-2 z-10 liquid-glass-button p-2 rounded-lg"
                            title="패널 열기"
                        >
                            <PanelRightClose size={16} className="text-white/70 relative z-10 rotate-180" />
                        </button>
                    )}

                    {/* Page Panel */}
                    {isPanelOpen && (
                        <PagePanel onClose={() => setIsPanelOpen(false)} />
                    )}

                    {/* Mission Control Overlay */}
                    <MissionControlView />
                </div>
            </div>

            {/* Code Tab - 항상 마운트, 숨김 처리 (Terminal 상태 유지) */}
            <div className={`absolute inset-0 ${activeTab === 'code' ? '' : 'hidden'}`}>
                <CodeEditor className="h-full" />
            </div>

            {/* Assets Tab */}
            <div className={`absolute inset-0 ${activeTab === 'assets' ? '' : 'hidden'}`}>
                <AssetsView />
            </div>

            {/* Dashboard Tab */}
            <div className={`absolute inset-0 ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
                <DashboardView />
            </div>
        </div>
    );
}

