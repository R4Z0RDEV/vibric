'use client';

import { usePageStore } from '@/stores/page-store';
import {
    FileText,
    Plus,
    LayoutGrid,
    PanelRightClose,
    Home,
    Info,
    Mail,
    Trash2
} from 'lucide-react';

interface PagePanelProps {
    onClose: () => void;
}

export function PagePanel({ onClose }: PagePanelProps) {
    const {
        pages,
        activePageId,
        setActivePage,
        toggleMissionControl,
        removePage,
        addPage
    } = usePageStore();

    // 페이지 아이콘 반환
    const getPageIcon = (path: string) => {
        switch (path) {
            case '/':
                return <Home size={14} className="text-white/60" />;
            case '/about':
                return <Info size={14} className="text-white/60" />;
            case '/contact':
                return <Mail size={14} className="text-white/60" />;
            default:
                return <FileText size={14} className="text-white/60" />;
        }
    };

    const handleAddPage = () => {
        const pageNumber = pages.length + 1;
        addPage({
            name: `Page ${pageNumber}`,
            path: `/page-${pageNumber}`,
            fileName: `page-${pageNumber}.html`
        });
    };

    return (
        <div className="w-64 h-full flex flex-col bg-zinc-900/95 border-l border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <FileText size={18} className="text-white" />
                    <span className="text-sm font-medium text-white">Pages</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Mission Control Button */}
                    <button
                        onClick={toggleMissionControl}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Mission Control"
                    >
                        <LayoutGrid size={16} className="text-blue-400" />
                    </button>
                    {/* Add Page Button */}
                    <button
                        onClick={handleAddPage}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="페이지 추가"
                    >
                        <Plus size={16} className="text-white/60" />
                    </button>
                    {/* Close Panel */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    >
                        <PanelRightClose size={16} className="text-white/60" />
                    </button>
                </div>
            </div>

            {/* Pages Section */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        ALL PAGES
                    </span>
                </div>

                {/* Page List */}
                <div className="px-2">
                    {pages.map((page) => {
                        const isActive = page.id === activePageId;

                        return (
                            <div
                                key={page.id}
                                onClick={() => setActivePage(page.id)}
                                className={`
                                    group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all
                                    ${isActive
                                        ? 'bg-blue-500/20 border border-blue-500/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                    }
                                `}
                            >
                                {/* Page Icon */}
                                {getPageIcon(page.path)}

                                {/* Page Info */}
                                <div className="flex-1 min-w-0">
                                    <span className={`text-sm truncate block ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                                        {page.name}
                                    </span>
                                    <span className="text-xs text-zinc-500 truncate block">
                                        {page.path}
                                    </span>
                                </div>

                                {/* Delete Button (on hover) */}
                                {pages.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePage(page.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                                        title="페이지 삭제"
                                    >
                                        <Trash2 size={12} className="text-red-400" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                    {pages.length}개 페이지
                </p>
            </div>
        </div>
    );
}
