'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import type { CanvasElement as CanvasElementType } from '@/types';

interface CanvasElementProps {
    element: CanvasElementType;
    isSelected: boolean;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function CanvasElement({ element, isSelected }: CanvasElementProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [elementStart, setElementStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const {
        viewport,
        selectElement,
        updateElement,
        setHoveredId,
        setDragging,
        isDragging,
    } = useCanvasStore();

    // Handle element click/selection
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            // Check if clicking on resize handle
            const target = e.target as HTMLElement;
            if (target.dataset.resizeHandle) {
                setIsResizing(true);
                setResizeHandle(target.dataset.resizeHandle as ResizeHandle);
                setDragStart({ x: e.clientX, y: e.clientY });
                setElementStart({
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                });
                return;
            }

            // Select element
            selectElement(element.id, e.shiftKey);

            // Start dragging
            setDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setElementStart({
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
            });
        },
        [element, selectElement, setDragging]
    );

    // Window-level mouse move handler for smooth drag/resize
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = (e.clientX - dragStart.x) / viewport.zoom;
            const deltaY = (e.clientY - dragStart.y) / viewport.zoom;

            if (isResizing && resizeHandle) {
                // Resize logic
                let newX = elementStart.x;
                let newY = elementStart.y;
                let newWidth = elementStart.width;
                let newHeight = elementStart.height;

                if (resizeHandle.includes('w')) {
                    newX = elementStart.x + deltaX;
                    newWidth = elementStart.width - deltaX;
                }
                if (resizeHandle.includes('e')) {
                    newWidth = elementStart.width + deltaX;
                }
                if (resizeHandle.includes('n')) {
                    newY = elementStart.y + deltaY;
                    newHeight = elementStart.height - deltaY;
                }
                if (resizeHandle.includes('s')) {
                    newHeight = elementStart.height + deltaY;
                }

                // Minimum size
                if (newWidth < 20) {
                    newWidth = 20;
                    if (resizeHandle.includes('w')) {
                        newX = elementStart.x + elementStart.width - 20;
                    }
                }
                if (newHeight < 20) {
                    newHeight = 20;
                    if (resizeHandle.includes('n')) {
                        newY = elementStart.y + elementStart.height - 20;
                    }
                }

                updateElement(element.id, {
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight,
                });
            } else if (isDragging) {
                // Drag logic
                updateElement(element.id, {
                    x: elementStart.x + deltaX,
                    y: elementStart.y + deltaY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeHandle(null);
            setDragging(false);
        };

        // Add window-level event listeners
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, resizeHandle, dragStart, elementStart, viewport.zoom, element.id, updateElement, setDragging]);

    // Render resize handles
    const renderResizeHandles = () => {
        if (!isSelected) return null;

        const handles: { position: ResizeHandle; className: string }[] = [
            { position: 'nw', className: 'top-0 left-0 cursor-nwse-resize -translate-x-1/2 -translate-y-1/2' },
            { position: 'n', className: 'top-0 left-1/2 cursor-ns-resize -translate-x-1/2 -translate-y-1/2' },
            { position: 'ne', className: 'top-0 right-0 cursor-nesw-resize translate-x-1/2 -translate-y-1/2' },
            { position: 'e', className: 'top-1/2 right-0 cursor-ew-resize translate-x-1/2 -translate-y-1/2' },
            { position: 'se', className: 'bottom-0 right-0 cursor-nwse-resize translate-x-1/2 translate-y-1/2' },
            { position: 's', className: 'bottom-0 left-1/2 cursor-ns-resize -translate-x-1/2 translate-y-1/2' },
            { position: 'sw', className: 'bottom-0 left-0 cursor-nesw-resize -translate-x-1/2 translate-y-1/2' },
            { position: 'w', className: 'top-1/2 left-0 cursor-ew-resize -translate-x-1/2 -translate-y-1/2' },
        ];

        return handles.map(({ position, className }) => (
            <div
                key={position}
                data-resize-handle={position}
                className={`
          absolute w-3 h-3
          bg-white border-2 border-blue-500
          rounded-sm
          ${className}
        `}
            />
        ));
    };

    return (
        <div
            ref={elementRef}
            className={`
        absolute pointer-events-auto select-none
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${element.locked ? 'pointer-events-none opacity-50' : ''}
        ${!element.visible ? 'hidden' : ''}
      `}
            style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                zIndex: element.zIndex,
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setHoveredId(element.id)}
            onMouseLeave={() => setHoveredId(null)}
        >
            {/* Element content */}
            <div
                className={`
          w-full h-full rounded-lg overflow-hidden
          ${element.type === 'frame' ? 'bg-zinc-800/50 border border-zinc-700/50' : ''}
          ${element.type === 'text' ? 'flex items-center justify-center text-white' : ''}
          ${element.type === 'image' ? 'bg-zinc-700/30' : ''}
          ${element.type === 'component' ? 'bg-blue-500/10 border border-blue-500/30' : ''}
        `}
            >
                {element.type === 'text' && (
                    <span className="text-sm">{element.name}</span>
                )}
                {element.type === 'frame' && (
                    <div className="p-2 text-xs text-white/50">{element.name}</div>
                )}
                {element.type === 'component' && (
                    <div className="p-2 text-xs text-blue-400">{element.name}</div>
                )}
            </div>

            {/* Resize handles */}
            {renderResizeHandles()}

            {/* Element label */}
            {isSelected && (
                <div className="absolute -top-6 left-0 text-xs text-blue-400 whitespace-nowrap">
                    {element.name}
                </div>
            )}
        </div>
    );
}
