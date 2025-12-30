/**
 * ActionExecutor - AI 에이전트 액션 실행 엔진
 * 
 * 모든 액션 타입을 처리하고 모드별로 실행 방식을 결정합니다.
 */

import type {
    ActionItem,
    ActionResult,
    ActionError,
    ExecutorOptions,
    ExecutionMode,
    DANGEROUS_ACTIONS,
    READONLY_ACTIONS,
} from './types';

// Action handlers
import { executeFileAction } from './file-actions';
import { executeCommandAction } from './command-actions';
import { executeAnalysisAction } from './analysis-actions';
import { executeDebugAction } from './debug-actions';
import { executeBrowserAction } from './browser-actions';
import { executeSearchAction } from './search-actions';

export class ActionExecutor {
    private mode: ExecutionMode;
    private maxRetries: number;
    private options: ExecutorOptions;

    constructor(options: ExecutorOptions) {
        this.mode = options.mode;
        this.maxRetries = options.maxRetries ?? 3;
        this.options = options;
    }

    /**
     * 단일 액션 실행
     */
    async execute(action: ActionItem): Promise<ActionResult> {
        // Spec Mode에서 위험 액션은 승인 필요
        if (this.mode === 'spec' && this.isDangerousAction(action)) {
            const approved = await this.requestApproval(action);
            if (!approved) {
                return {
                    success: false,
                    action,
                    error: 'User rejected the action',
                };
            }
        }

        // 액션 시작 콜백
        this.options.onActionStart?.(action);
        action.status = 'in_progress';

        try {
            const result = await this.executeAction(action);
            action.status = result.success ? 'completed' : 'error';
            this.options.onActionComplete?.(result);
            return result;
        } catch (error) {
            const actionError: ActionError = {
                action,
                error: error instanceof Error ? error.message : String(error),
                retryCount: 0,
            };
            action.status = 'error';
            this.options.onActionError?.(actionError);

            return {
                success: false,
                action,
                error: actionError.error,
            };
        }
    }

    /**
     * 여러 액션을 순차 실행
     */
    async executeChain(actions: ActionItem[]): Promise<ActionResult[]> {
        const results: ActionResult[] = [];

        for (const action of actions) {
            const result = await this.execute(action);
            results.push(result);

            // Fast Mode에서 에러 발생 시 복구 시도
            if (!result.success && this.mode === 'fast') {
                const recovered = await this.attemptRecovery(action, result.error || '');
                if (!recovered) {
                    // 복구 실패 - 나머지 액션 중단
                    break;
                }
            } else if (!result.success && this.mode === 'spec') {
                // Spec Mode에서는 에러 시 즉시 중단
                break;
            }
        }

        return results;
    }

    /**
     * 액션 타입별 실행 라우팅
     */
    private async executeAction(action: ActionItem): Promise<ActionResult> {
        switch (action.type) {
            // 파일 액션
            case 'create_file':
            case 'modify_file':
            case 'delete_file':
            case 'read_file':
                return executeFileAction(action);

            // 커맨드 액션
            case 'run_command':
                return executeCommandAction(action);

            // 분석 액션
            case 'list_files':
            case 'analyze_code':
                return executeAnalysisAction(action);

            // 디버깅 액션
            case 'get_logs':
            case 'get_errors':
                return executeDebugAction(action);

            // 브라우저 액션
            case 'refresh_preview':
            case 'navigate_to':
                return executeBrowserAction(action);

            // 검색 액션
            case 'web_search':
                return executeSearchAction(action);

            default:
                return {
                    success: false,
                    action,
                    error: `Unknown action type: ${(action as ActionItem).type}`,
                };
        }
    }

    /**
     * 위험 액션 여부 확인
     */
    private isDangerousAction(action: ActionItem): boolean {
        const dangerousTypes = ['run_command', 'delete_file'];
        return dangerousTypes.includes(action.type);
    }

    /**
     * Spec Mode에서 사용자 승인 요청
     */
    private async requestApproval(action: ActionItem): Promise<boolean> {
        if (this.options.onApprovalRequired) {
            action.status = 'waiting_approval';
            return this.options.onApprovalRequired(action);
        }
        // 승인 콜백이 없으면 기본적으로 승인
        return true;
    }

    /**
     * Fast Mode에서 에러 복구 시도
     */
    private async attemptRecovery(
        action: ActionItem,
        error: string,
        retryCount: number = 0
    ): Promise<boolean> {
        if (retryCount >= this.maxRetries) {
            // 최대 재시도 횟수 초과 - 웹 검색으로 해결책 탐색
            console.log(`[ActionExecutor] Max retries (${this.maxRetries}) exceeded for action:`, action.type);

            // TODO: 웹 검색 후 추가 재시도 로직
            // const searchResults = await this.searchForSolution(error);
            // if (searchResults.length > 0) {
            //   // AI에게 검색 결과 전달하고 해결책 요청
            // }

            return false;
        }

        console.log(`[ActionExecutor] Attempting recovery (${retryCount + 1}/${this.maxRetries}) for action:`, action.type);

        // 간단한 재시도 로직
        try {
            const result = await this.executeAction(action);
            return result.success;
        } catch {
            return this.attemptRecovery(action, error, retryCount + 1);
        }
    }

    /**
     * 모드 변경
     */
    setMode(mode: ExecutionMode): void {
        this.mode = mode;
    }

    /**
     * 현재 모드 반환
     */
    getMode(): ExecutionMode {
        return this.mode;
    }
}

// 싱글톤 인스턴스 (선택적 사용)
let executorInstance: ActionExecutor | null = null;

export function getActionExecutor(options?: ExecutorOptions): ActionExecutor {
    if (!executorInstance && options) {
        executorInstance = new ActionExecutor(options);
    }
    if (!executorInstance) {
        throw new Error('ActionExecutor not initialized. Provide options on first call.');
    }
    return executorInstance;
}

export function resetActionExecutor(): void {
    executorInstance = null;
}
