'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { CanvasElement } from './CanvasElement';
import { FloatingToolbar } from './FloatingToolbar';

interface CanvasStageProps {
    className?: string;
}

export function CanvasStage({ className = '' }: CanvasStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const {
        viewport,
        elements,
        selectedIds,
        isDragging,
        pan,
        zoom,
        clearSelection,
        setDragging,
    } = useCanvasStore();

    // Handle wheel zoom
    const handleWheel = useCallback(
        (e: WheelEvent) => {
            e.preventDefault();

            if (e.ctrlKey || e.metaKey) {
                // Zoom
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;

                const centerX = e.clientX - rect.left;
                const centerY = e.clientY - rect.top;
                const scale = e.deltaY > 0 ? 0.9 : 1.1;

                zoom(scale, centerX, centerY);
            } else {
                // Pan
                pan(-e.deltaX, -e.deltaY);
            }
        },
        [pan, zoom]
    );

    // Handle mouse down for panning
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            // Space + click or middle mouse button for panning
            if (e.button === 1 || (e.button === 0 && e.altKey)) {
                e.preventDefault();
                setIsPanning(true);
                setPanStart({ x: e.clientX, y: e.clientY });
            } else if (e.button === 0 && e.target === containerRef.current) {
                // Click on empty canvas area
                clearSelection();
            }
        },
        [clearSelection]
    );

    // Handle mouse move for panning
    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isPanning) {
                const deltaX = e.clientX - panStart.x;
                const deltaY = e.clientY - panStart.y;
                pan(deltaX, deltaY);
                setPanStart({ x: e.clientX, y: e.clientY });
            }
        },
        [isPanning, panStart, pan]
    );

    // Handle mouse up for panning
    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        if (isDragging) {
            setDragging(false);
        }
    }, [isDragging, setDragging]);

    // Attach wheel event listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    // Screen to world coordinate conversion
    const screenToWorld = useCallback(
        (screenX: number, screenY: number) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return { x: 0, y: 0 };

            return {
                x: (screenX - rect.left - viewport.x) / viewport.zoom,
                y: (screenY - rect.top - viewport.y) / viewport.zoom,
            };
        },
        [viewport]
    );

    return (
        <div
            ref={containerRef}
            className={`
        relative w-full h-full overflow-hidden
        dot-grid
        ${isPanning ? 'cursor-grabbing' : 'cursor-default'}
        ${className}
      `}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Transform container */}
            <div
                className="absolute origin-top-left pointer-events-none"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                }}
            >
                {/* Canvas elements */}
                {elements.map((element) => (
                    <CanvasElement
                        key={element.id}
                        element={element}
                        isSelected={selectedIds.includes(element.id)}
                    />
                ))}
            </div>

            {/* Floating toolbar */}
            <FloatingToolbar />

            {/* Empty state */}
            {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 liquid-glass-card rounded-2xl flex items-center justify-center">
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-white/70 relative z-10"
                            >
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M9 21V9" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-3">Canvas</h3>
                        <p className="text-sm text-white/60 max-w-[320px]">
                            AI가 생성한 컴포넌트가 여기에 표시됩니다.
                            <br />
                            채팅에서 페이지를 생성해보세요.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
