'use client';

import {
    PanelLeftClose,
    ChevronDown,
    Book,
    Zap,
    Link,
    Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUIStore } from '@/stores/ui-store';
import type { TabType } from '@/types';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
        id: 'canvas',
        label: 'Canvas',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
            </svg>
        )
    },
    {
        id: 'code',
        label: 'Code',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        )
    },
    {
        id: 'assets',
        label: 'Assets',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
        )
    },
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
        )
    },
];

export function TopBar() {
    const { toggleSidebar } = useUIStore();

    return (
        <header className="h-[50px] flex items-center justify-between px-4 liquid-glass-subtle rounded-none border-x-0 border-t-0">
            {/* Left Section */}
            <div className="flex items-center gap-3 relative z-10">
                {/* Logo */}
                <a href="/" className="flex items-center gap-1.5">
                    <div className="w-6 h-6 liquid-glass-button rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold relative z-10">V</span>
                    </div>
                    <h1 className="font-semibold text-base text-white">Vibric</h1>
                </a>

                {/* Sidebar Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="w-8 h-8 liquid-glass-button rounded-lg flex items-center justify-center text-white/70 hover:text-white"
                    title="Toggle chat panel"
                >
                    <PanelLeftClose className="w-4 h-4 relative z-10" />
                </button>

                <div className="w-px h-5 bg-white/20" />

                {/* Project Selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="liquid-glass-button rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white text-sm font-medium">
                            <span className="relative z-10">project</span>
                            <ChevronDown className="w-3 h-3 text-white/70 relative z-10" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="liquid-glass rounded-lg">
                        <DropdownMenuItem>My Project</DropdownMenuItem>
                        <DropdownMenuItem>New Project...</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 relative z-10">
                {/* Credits */}
                <button className="liquid-glass-button rounded-lg px-3 py-1.5 flex items-center gap-2 text-orange-400">
                    <Zap className="w-4 h-4 relative z-10" />
                    <span className="font-mono font-semibold text-xs relative z-10">100</span>
                </button>

                {/* Theme Toggle */}
                <button className="w-8 h-8 liquid-glass-button rounded-lg flex items-center justify-center text-white/70 hover:text-white">
                    <Moon className="w-4 h-4 relative z-10" />
                </button>

                {/* Docs */}
                <button className="liquid-glass-button rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white/70 hover:text-white">
                    <Book className="w-4 h-4 relative z-10" />
                    <span className="text-sm relative z-10">Docs</span>
                </button>

                {/* Share */}
                <button className="liquid-glass-button rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white">
                    <Link className="w-4 h-4 relative z-10" />
                    <span className="text-sm relative z-10">Share</span>
                </button>

                {/* User Avatar */}
                <button className="w-8 h-8 liquid-glass-button rounded-full flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-blue-400/50 to-purple-500/50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium relative z-10">U</span>
                    </div>
                </button>
            </div>
        </header>
    );
}

interface TabBarProps {
    className?: string;
}

export function TabBar({ className = '' }: TabBarProps) {
    const { activeTab, setActiveTab } = useUIStore();

    return (
        <div className={`flex items-center liquid-glass-subtle rounded-none border-x-0 border-t-0 ${className}`}>
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
            relative flex items-center gap-2 px-4 py-3
            font-medium text-sm whitespace-nowrap
            transition-all duration-300
            hover:bg-white/5
            ${activeTab === tab.id
                            ? 'text-white'
                            : 'text-white/60'
                        }
          `}
                >
                    <span className={`relative z-10 ${activeTab === tab.id ? '' : 'opacity-70'}`}>
                        {tab.icon}
                    </span>
                    <span className="max-w-[120px] truncate relative z-10">{tab.label}</span>

                    {/* Active indicator */}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                    )}
                </button>
            ))}
        </div>
    );
}
