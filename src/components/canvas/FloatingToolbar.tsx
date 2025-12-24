'use client';

import { useCanvasStore } from '@/stores/canvas-store';
import {
    MousePointer2,
    Hand,
    Square,
    Type,
    Image,
    Component,
    ZoomIn,
    ZoomOut,
    Maximize,
} from 'lucide-react';
import { useState } from 'react';

type Tool = 'select' | 'pan' | 'frame' | 'text' | 'image' | 'component';

export function FloatingToolbar() {
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const {
        viewport,
        zoom,
        resetViewport,
        addElement,
        elements,
        isSelectionModeEnabled,
        toggleSelectionMode
    } = useCanvasStore();

    const handleZoomIn = () => {
        zoom(1.2, window.innerWidth / 2, window.innerHeight / 2);
    };

    const handleZoomOut = () => {
        zoom(0.8, window.innerWidth / 2, window.innerHeight / 2);
    };

    const handleFitToScreen = () => {
        resetViewport();
    };

    const handleAddElement = (type: 'frame' | 'text' | 'image' | 'component') => {
        const newElement = {
            type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${elements.length + 1}`,
            x: 100 + elements.length * 20,
            y: 100 + elements.length * 20,
            width: type === 'text' ? 200 : 300,
            height: type === 'text' ? 40 : 200,
            zIndex: elements.length + 1,
            visible: true,
            locked: false,
        };
        addElement(newElement);
        setActiveTool('select');
    };

    const tools = [
        { id: 'select' as Tool, icon: MousePointer2, label: '선택', shortcut: 'V' },
        { id: 'pan' as Tool, icon: Hand, label: '팬', shortcut: 'H' },
        { id: 'frame' as Tool, icon: Square, label: '프레임', shortcut: 'F' },
        { id: 'text' as Tool, icon: Type, label: '텍스트', shortcut: 'T' },
        { id: 'image' as Tool, icon: Image, label: '이미지', shortcut: 'I' },
        { id: 'component' as Tool, icon: Component, label: '컴포넌트', shortcut: 'C' },
    ];

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="liquid-glass-toolbar rounded-xl flex items-center">
                {/* Tool buttons */}
                <div className="flex items-center gap-0.5 px-1">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = activeTool === tool.id;

                        return (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    if (tool.id === 'select') {
                                        toggleSelectionMode();
                                    } else {
                                        setActiveTool(tool.id);
                                        if (['frame', 'text', 'image', 'component'].includes(tool.id)) {
                                            handleAddElement(tool.id as 'frame' | 'text' | 'image' | 'component');
                                        }
                                    }
                                }}
                                className={`
                  p-2.5 rounded-lg transition-all duration-200
                  ${tool.id === 'select' && isSelectionModeEnabled
                                        ? 'bg-blue-500/30 text-blue-400 ring-2 ring-blue-400/50'
                                        : isActive
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }
                `}
                                title={`${tool.label} (${tool.shortcut})`}
                            >
                                <Icon size={18} className="relative z-10" />
                            </button>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20 mx-1" />

                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 px-1">
                    <button
                        onClick={handleZoomOut}
                        className="p-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                        title="줌 아웃"
                    >
                        <ZoomOut size={18} className="relative z-10" />
                    </button>

                    <div className="px-2 min-w-[48px] text-center">
                        <span className="text-xs text-white/70 font-mono relative z-10">
                            {Math.round(viewport.zoom * 100)}%
                        </span>
                    </div>

                    <button
                        onClick={handleZoomIn}
                        className="p-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                        title="줌 인"
                    >
                        <ZoomIn size={18} className="relative z-10" />
                    </button>

                    <button
                        onClick={handleFitToScreen}
                        className="p-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                        title="화면에 맞춤"
                    >
                        <Maximize size={18} className="relative z-10" />
                    </button>
                </div>
            </div>
        </div>
    );
}
