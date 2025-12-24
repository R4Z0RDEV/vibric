'use client';

import { useCanvasStore } from '@/stores/canvas-store';
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical } from 'lucide-react';

export function LayerPanel() {
    const {
        elements,
        selectedIds,
        selectElement,
        updateElement,
        removeElement,
    } = useCanvasStore();

    // Sort elements by zIndex (highest first for top-to-bottom display)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    const handleToggleVisibility = (id: string, visible: boolean) => {
        updateElement(id, { visible: !visible });
    };

    const handleToggleLock = (id: string, locked: boolean) => {
        updateElement(id, { locked: !locked });
    };

    const handleDelete = (id: string) => {
        removeElement(id);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'frame':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                    </svg>
                );
            case 'text':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" x2="15" y1="20" y2="20" />
                        <line x1="12" x2="12" y1="4" y2="20" />
                    </svg>
                );
            case 'image':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                );
            case 'component':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                        <path d="m16.24 7.76-1.8 5.14a1 1 0 0 1-1.3.6l-5.14-1.8" />
                        <path d="M2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10c-1.13 0-2.22-.19-3.24-.54" />
                    </svg>
                );
            default:
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                    </svg>
                );
        }
    };

    if (elements.length === 0) {
        return (
            <div className="h-full flex flex-col">
                <div className="liquid-glass-subtle px-3 py-2 border-b border-white/10">
                    <h3 className="text-sm font-medium text-white relative z-10">Layers</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <p className="text-xs text-white/40 text-center">
                        레이어가 없습니다.
                        <br />
                        캔버스에 요소를 추가하세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="liquid-glass-subtle px-3 py-2 border-b border-white/10">
                <h3 className="text-sm font-medium text-white relative z-10">Layers</h3>
            </div>

            {/* Layer list */}
            <div className="flex-1 overflow-y-auto">
                {sortedElements.map((element) => {
                    const isSelected = selectedIds.includes(element.id);
                    const isVisible = element.visible !== false;
                    const isLocked = element.locked === true;

                    return (
                        <div
                            key={element.id}
                            className={`
                flex items-center gap-2 px-2 py-1.5
                border-b border-white/5
                cursor-pointer
                transition-colors duration-150
                ${isSelected ? 'bg-blue-500/20' : 'hover:bg-white/5'}
                ${!isVisible ? 'opacity-50' : ''}
              `}
                            onClick={() => selectElement(element.id)}
                        >
                            {/* Drag handle */}
                            <div className="text-white/30 hover:text-white/60 cursor-grab">
                                <GripVertical size={12} />
                            </div>

                            {/* Type icon */}
                            {getTypeIcon(element.type)}

                            {/* Name */}
                            <span className={`
                flex-1 text-xs truncate
                ${isSelected ? 'text-white' : 'text-white/70'}
              `}>
                                {element.name}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                {/* Visibility toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleVisibility(element.id, isVisible);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                >
                                    {isVisible ? (
                                        <Eye size={12} className="text-white/50" />
                                    ) : (
                                        <EyeOff size={12} className="text-white/30" />
                                    )}
                                </button>

                                {/* Lock toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleLock(element.id, isLocked);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                >
                                    {isLocked ? (
                                        <Lock size={12} className="text-orange-400" />
                                    ) : (
                                        <Unlock size={12} className="text-white/30" />
                                    )}
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(element.id);
                                    }}
                                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={12} className="text-white/30 hover:text-red-400" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="liquid-glass-subtle px-3 py-2 border-t border-white/10">
                <p className="text-xs text-white/40 relative z-10">
                    {elements.length}개 레이어
                </p>
            </div>
        </div>
    );
}
