import { create } from 'zustand';
import type { CanvasElement, Viewport } from '@/types';

// 선택된 요소 정보 인터페이스
export interface SelectedElementInfo {
    selector: string;
    tagName: string;
    className: string;
    textContent: string;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    filePath?: string;
    lineNumber?: number;
}

// 호버된 요소 정보 인터페이스
export interface HoveredElementInfo {
    selector: string;
    tagName: string;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface CanvasState {
    viewport: Viewport;
    elements: CanvasElement[];
    selectedIds: string[];
    hoveredId: string | null;
    isDragging: boolean;

    // Page Preview 상태
    previewUrl: string | null;
    isPreviewLoading: boolean;
    selectedElement: SelectedElementInfo | null;
    hoveredElement: HoveredElementInfo | null;
    isAIProcessing: boolean;
    isSelectionModeEnabled: boolean; // 요소 선택 모드

    // Viewport Actions
    pan: (deltaX: number, deltaY: number) => void;
    zoom: (scale: number, centerX: number, centerY: number) => void;
    resetViewport: () => void;

    // Element Actions
    addElement: (element: Omit<CanvasElement, 'id'>) => void;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    removeElement: (id: string) => void;

    // Selection Actions
    selectElement: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
    setHoveredId: (id: string | null) => void;
    setDragging: (dragging: boolean) => void;

    // Page Preview Actions
    setPreviewUrl: (url: string | null) => void;
    setPreviewLoading: (loading: boolean) => void;
    setSelectedElement: (element: SelectedElementInfo | null) => void;
    setHoveredElement: (element: HoveredElementInfo | null) => void;
    setAIProcessing: (processing: boolean) => void;
    toggleSelectionMode: () => void;
    setSelectionMode: (enabled: boolean) => void;
}

const DEFAULT_VIEWPORT: Viewport = {
    x: 0,
    y: 0,
    zoom: 1,
};

export const useCanvasStore = create<CanvasState>((set) => ({
    viewport: DEFAULT_VIEWPORT,
    elements: [],
    selectedIds: [],
    hoveredId: null,
    isDragging: false,

    // Page Preview 초기 상태
    previewUrl: null,
    isPreviewLoading: false,
    selectedElement: null,
    hoveredElement: null,
    isAIProcessing: false,
    isSelectionModeEnabled: false, // 기본값: 꺼짐

    // Viewport Actions
    pan: (deltaX, deltaY) => set((state) => ({
        viewport: {
            ...state.viewport,
            x: state.viewport.x + deltaX,
            y: state.viewport.y + deltaY,
        },
    })),

    zoom: (scale, centerX, centerY) => set((state) => {
        const newZoom = Math.min(Math.max(state.viewport.zoom * scale, 0.1), 5);
        const zoomRatio = newZoom / state.viewport.zoom;

        return {
            viewport: {
                zoom: newZoom,
                x: centerX - (centerX - state.viewport.x) * zoomRatio,
                y: centerY - (centerY - state.viewport.y) * zoomRatio,
            },
        };
    }),

    resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

    // Element Actions
    addElement: (element) => set((state) => ({
        elements: [
            ...state.elements,
            { ...element, id: crypto.randomUUID() },
        ],
    })),

    updateElement: (id, updates) => set((state) => ({
        elements: state.elements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
        ),
    })),

    removeElement: (id) => set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
        selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
    })),

    // Selection Actions
    selectElement: (id, multi = false) => set((state) => ({
        selectedIds: multi
            ? state.selectedIds.includes(id)
                ? state.selectedIds.filter((selectedId) => selectedId !== id)
                : [...state.selectedIds, id]
            : [id],
    })),

    clearSelection: () => set({ selectedIds: [], selectedElement: null }),

    setHoveredId: (id) => set({ hoveredId: id }),

    setDragging: (dragging) => set({ isDragging: dragging }),

    // Page Preview Actions
    setPreviewUrl: (url) => set({ previewUrl: url }),

    setPreviewLoading: (loading) => set({ isPreviewLoading: loading }),

    setSelectedElement: (element) => set({ selectedElement: element }),

    setHoveredElement: (element) => set({ hoveredElement: element }),

    setAIProcessing: (processing) => set({ isAIProcessing: processing }),

    toggleSelectionMode: () => set((state) => ({
        isSelectionModeEnabled: !state.isSelectionModeEnabled,
        // 선택 모드 끄면 선택/호버 초기화
        selectedElement: state.isSelectionModeEnabled ? null : state.selectedElement,
        hoveredElement: state.isSelectionModeEnabled ? null : state.hoveredElement,
    })),

    setSelectionMode: (enabled) => set({
        isSelectionModeEnabled: enabled,
        selectedElement: enabled ? null : null,
        hoveredElement: enabled ? null : null,
    }),
}));
