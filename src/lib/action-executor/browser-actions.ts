/**
 * Browser Actions - 프리뷰 브라우저 제어
 */

import type { ActionResult, RefreshPreviewAction, NavigateToAction } from './types';

// 프리뷰 제어를 위한 이벤트 버스 (간단한 구현)
type PreviewEventHandler = (event: PreviewEvent) => void;
const previewEventHandlers: Set<PreviewEventHandler> = new Set();

interface PreviewEvent {
    type: 'refresh' | 'navigate';
    url?: string;
}

/**
 * 프리뷰 이벤트 구독
 */
export function subscribeToPreviewEvents(handler: PreviewEventHandler): () => void {
    previewEventHandlers.add(handler);
    return () => previewEventHandlers.delete(handler);
}

/**
 * 프리뷰 이벤트 발행
 */
function emitPreviewEvent(event: PreviewEvent): void {
    previewEventHandlers.forEach(handler => handler(event));
}

/**
 * 브라우저 액션 실행 라우터
 */
export async function executeBrowserAction(
    action: RefreshPreviewAction | NavigateToAction
): Promise<ActionResult> {
    switch (action.type) {
        case 'refresh_preview':
            return refreshPreview(action);
        case 'navigate_to':
            return navigateTo(action);
    }
}

/**
 * 프리뷰 새로고침
 */
async function refreshPreview(action: RefreshPreviewAction): Promise<ActionResult> {
    try {
        emitPreviewEvent({ type: 'refresh' });

        return {
            success: true,
            action,
            output: 'Preview refreshed',
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * 특정 URL로 이동
 */
async function navigateTo(action: NavigateToAction): Promise<ActionResult> {
    try {
        emitPreviewEvent({ type: 'navigate', url: action.url });

        return {
            success: true,
            action,
            output: `Navigated to: ${action.url}`,
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
