'use client';

import { useCallback } from 'react';
import { TopBar, TabBar } from './TopBar';
import { AgentChat } from './AgentChat';
import { MainContent } from './MainContent';
import { ResizeHandle } from './ResizeHandle';
import { useUIStore } from '@/stores/ui-store';

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 600;

export function AppShell() {
    const { sidebarWidth, isSidebarCollapsed, setSidebarWidth } = useUIStore();

    const handleResize = useCallback((delta: number) => {
        setSidebarWidth(
            Math.min(
                Math.max(sidebarWidth + delta, MIN_SIDEBAR_WIDTH),
                MAX_SIDEBAR_WIDTH
            )
        );
    }, [sidebarWidth, setSidebarWidth]);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
            {/* Top Bar */}
            <TopBar />

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Agent Chat Sidebar */}
                {!isSidebarCollapsed && (
                    <>
                        <div
                            className="flex-shrink-0 overflow-hidden"
                            style={{ width: sidebarWidth }}
                        >
                            <AgentChat />
                        </div>

                        {/* Resize Handle */}
                        <ResizeHandle onResize={handleResize} />
                    </>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab Bar */}
                    <TabBar />

                    {/* Content with Liquid Glass */}
                    <div className="flex-1 overflow-hidden liquid-glass-card rounded-xl m-2 ml-1">
                        <MainContent />
                    </div>
                </div>
            </div>
        </div>
    );
}
