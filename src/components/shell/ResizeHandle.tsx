'use client';

import { useCallback, useState, useRef, useEffect } from 'react';

interface ResizeHandleProps {
    onResize: (delta: number) => void;
    direction?: 'horizontal' | 'vertical';
    className?: string;
}

export function ResizeHandle({
    onResize,
    direction = 'horizontal',
    className = ''
}: ResizeHandleProps) {
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    }, [direction]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
            const delta = currentPos - startPos.current;
            startPos.current = currentPos;
            onResize(delta);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, direction, onResize]);

    const isHorizontal = direction === 'horizontal';

    return (
        <div
            role="separator"
            tabIndex={0}
            onMouseDown={handleMouseDown}
            className={`
        resize-handle
        ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        relative flex justify-center items-center
        transition-colors duration-150
        hover:bg-accent/50
        ${isDragging ? 'bg-accent' : 'bg-transparent'}
        ${className}
      `}
        >
            {/* Visual indicator */}
            <div
                className={`
          ${isHorizontal ? 'w-0.5 h-8' : 'h-0.5 w-8'}
          bg-border rounded-full
          transition-colors duration-150
          ${isDragging ? 'bg-accent' : ''}
        `}
            />
        </div>
    );
}
