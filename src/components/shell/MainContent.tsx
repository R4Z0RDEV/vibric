'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { PagePreview, PagePanel, MissionControlView, FloatingToolbar } from '@/components/canvas';
import { CodeEditor } from '@/components/editor';
import { PanelRightClose } from 'lucide-react';

// Placeholder components for non-canvas tabs

function AssetsView() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 liquid-glass-card rounded-2xl flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70 relative z-10">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Assets</h3>
                <p className="text-sm text-white/60 max-w-[320px]">
                    로고, 폰트, 이미지 등의 에셋을 관리하고 AI에게 컨텍스트를 제공하세요.
                </p>
            </div>
        </div>
    );
}

function DashboardView() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 liquid-glass-card rounded-2xl flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70 relative z-10">
                        <rect width="7" height="9" x="3" y="3" rx="1" />
                        <rect width="7" height="5" x="14" y="3" rx="1" />
                        <rect width="7" height="9" x="14" y="12" rx="1" />
                        <rect width="7" height="5" x="3" y="16" rx="1" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Dashboard</h3>
                <p className="text-sm text-white/60 max-w-[320px]">
                    프로젝트 설정, 데이터베이스, 분석, 도메인 등을 관리하세요.
                </p>
            </div>
        </div>
    );
}

export function MainContent() {
    const { activeTab } = useUIStore();
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    const renderContent = () => {
        switch (activeTab) {
            case 'canvas':
                return (
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
                );
            case 'code':
                return <CodeEditor className="h-full" />;
            case 'assets':
                return <AssetsView />;
            case 'dashboard':
                return <DashboardView />;
            default:
                return <PagePreview />;
        }
    };

    return (
        <div className="w-full h-full overflow-hidden">
            {renderContent()}
        </div>
    );
}
