/**
 * Debug Actions - 디버깅 관련 액션
 */

import type { ActionResult, GetLogsAction, GetErrorsAction } from './types';
import { useWebContainerStore } from '@/stores/webcontainer-store';

/**
 * 디버깅 액션 실행 라우터
 */
export async function executeDebugAction(
    action: GetLogsAction | GetErrorsAction
): Promise<ActionResult> {
    switch (action.type) {
        case 'get_logs':
            return getLogs(action);
        case 'get_errors':
            return getErrors(action);
    }
}

/**
 * 로그 수집
 */
async function getLogs(action: GetLogsAction): Promise<ActionResult> {
    const { terminalOutput } = useWebContainerStore.getState();

    const lines = action.lines ?? 50;
    const source = action.source ?? 'all';

    try {
        let logs: string[];

        switch (source) {
            case 'terminal':
                logs = terminalOutput.slice(-lines);
                break;
            case 'console':
                // TODO: 브라우저 콘솔 로그 수집 (프리뷰 iframe에서)
                logs = ['Console log collection not yet implemented'];
                break;
            case 'all':
            default:
                logs = terminalOutput.slice(-lines);
                break;
        }

        return {
            success: true,
            action,
            output: logs.join(''),
            data: { lines: logs.length, source },
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
 * 에러 수집
 */
async function getErrors(action: GetErrorsAction): Promise<ActionResult> {
    const { terminalOutput, error: wcError } = useWebContainerStore.getState();

    try {
        const errors: Array<{ type: string; message: string }> = [];

        // WebContainer 에러
        if (wcError) {
            errors.push({ type: 'webcontainer', message: wcError });
        }

        // 터미널 출력에서 에러 패턴 찾기
        const errorPatterns = [
            /error:/i,
            /Error:/,
            /ERR!/,
            /failed/i,
            /ENOENT/,
            /EACCES/,
            /SyntaxError/,
            /TypeError/,
            /ReferenceError/,
        ];

        for (const line of terminalOutput) {
            for (const pattern of errorPatterns) {
                if (pattern.test(line)) {
                    errors.push({ type: 'terminal', message: line.trim() });
                    break;
                }
            }
        }

        return {
            success: true,
            action,
            output: errors.length > 0
                ? errors.map(e => `[${e.type}] ${e.message}`).join('\n')
                : 'No errors found',
            data: { errors },
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
