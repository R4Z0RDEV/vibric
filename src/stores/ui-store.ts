import { create } from 'zustand';
import type { TabType } from '@/types';

interface UIState {
    // Sidebar
    sidebarWidth: number;
    isSidebarCollapsed: boolean;

    // Tabs
    activeTab: TabType;

    // Terminal
    isTerminalOpen: boolean;
    terminalHeight: number;

    // Actions
    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    setActiveTab: (tab: TabType) => void;
    toggleTerminal: () => void;
    setTerminalHeight: (height: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    sidebarWidth: 380,
    isSidebarCollapsed: false,
    activeTab: 'canvas',
    isTerminalOpen: false,
    terminalHeight: 200,

    // Actions
    setSidebarWidth: (width) => set({ sidebarWidth: width }),

    toggleSidebar: () => set((state) => ({
        isSidebarCollapsed: !state.isSidebarCollapsed
    })),

    setActiveTab: (tab) => set({ activeTab: tab }),

    toggleTerminal: () => set((state) => ({
        isTerminalOpen: !state.isTerminalOpen
    })),

    setTerminalHeight: (height) => set({ terminalHeight: height }),
}));
