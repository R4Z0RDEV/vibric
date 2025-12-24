'use client';

import { RefObject } from 'react';
import type { SelectedElementInfo, HoveredElementInfo } from '@/stores/canvas-store';

interface SelectionOverlayProps {
    containerRef: RefObject<HTMLDivElement | null>;
    selectedElement: SelectedElementInfo | null;
    hoveredElement: HoveredElementInfo | null;
}

export function SelectionOverlay({
    selectedElement,
    hoveredElement
}: SelectionOverlayProps) {
    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {/* Hovered Element Highlight */}
            {hoveredElement && !selectedElement && (
                <div
                    className="absolute border-2 border-blue-400/50 bg-blue-400/10 rounded transition-all duration-75"
                    style={{
                        left: hoveredElement.rect.x,
                        top: hoveredElement.rect.y,
                        width: hoveredElement.rect.width,
                        height: hoveredElement.rect.height,
                    }}
                >
                    {/* Tag Label */}
                    <div className="absolute -top-6 left-0 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded">
                        {hoveredElement.tagName.toLowerCase()}
                    </div>
                </div>
            )}

            {/* Selected Element Highlight */}
            {selectedElement && (
                <div
                    className="absolute border-2 border-blue-500 bg-blue-500/10 rounded transition-all duration-150"
                    style={{
                        left: selectedElement.rect.x,
                        top: selectedElement.rect.y,
                        width: selectedElement.rect.width,
                        height: selectedElement.rect.height,
                    }}
                >
                    {/* Tag Label */}
                    <div className="absolute -top-6 left-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded flex items-center gap-1">
                        <span>{selectedElement.tagName.toLowerCase()}</span>
                        {selectedElement.className && (
                            <span className="text-blue-200">.{selectedElement.className.split(' ')[0]}</span>
                        )}
                    </div>

                    {/* Resize Handles */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border border-blue-500 rounded-full" />
                </div>
            )}
        </div>
    );
}
