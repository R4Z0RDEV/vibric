/**
 * Error Recovery Module
 * 
 * Fast Mode에서 자동 에러 복구를 담당
 * - 최대 3회 재시도
 * - 웹 검색으로 해결책 탐색
 * - Git 롤백으로 안전한 상태 복원
 */

import type {
    ActionItem,
    ActionResult,
    ActionError,
    SearchResult,
} from './types';
import { executeGitAction } from './git-actions';

export interface RecoveryOptions {
    maxRetries: number;
    enableWebSearch: boolean;
    enableGitRollback: boolean;
    onRetry?: (attempt: number, error: string) => void;
    onSearching?: (query: string) => void;
    onRollback?: () => void;
}

export interface RecoveryResult {
    recovered: boolean;
    attempts: number;
    finalError?: string;
    searchResults?: SearchResult[];
    rolledBack?: boolean;
}

const DEFAULT_OPTIONS: RecoveryOptions = {
    maxRetries: 3,
    enableWebSearch: true,
    enableGitRollback: true,
};

/**
 * 에러 복구 실행
 * 
 * 1. 최대 maxRetries 만큼 재시도
 * 2. 실패 시 웹 검색으로 해결책 탐색
 * 3. 계속 실패 시 Git 롤백
 */
export async function attemptRecovery(
    executeAction: () => Promise<ActionResult>,
    action: ActionItem,
    options: Partial<RecoveryOptions> = {}
): Promise<RecoveryResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let attempts = 0;
    let lastError = '';
    let searchResults: SearchResult[] | undefined;

    // Phase 1: 재시도
    while (attempts < opts.maxRetries) {
        attempts++;
        opts.onRetry?.(attempts, lastError);

        try {
            const result = await executeAction();
            if (result.success) {
                return { recovered: true, attempts };
            }
            lastError = result.error || 'Unknown error';
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }

        // 재시도 전 잠시 대기
        await sleep(1000 * attempts);
    }

    // Phase 2: 웹 검색으로 해결책 탐색
    if (opts.enableWebSearch) {
        const query = buildSearchQuery(action, lastError);
        opts.onSearching?.(query);

        try {
            const searchResponse = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (searchResponse.ok) {
                const data = await searchResponse.json();
                searchResults = data.results;
            }
        } catch (err) {
            console.error('[Recovery] Web search failed:', err);
        }

        // 검색 결과를 바탕으로 한 번 더 재시도
        if (searchResults && searchResults.length > 0) {
            try {
                const result = await executeAction();
                if (result.success) {
                    return { recovered: true, attempts: attempts + 1, searchResults };
                }
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
        }
    }

    // Phase 3: Git 롤백
    if (opts.enableGitRollback) {
        opts.onRollback?.();

        try {
            const rollbackResult = await executeGitAction({
                type: 'git_revert',
                status: 'pending',
                steps: 1,
            });

            if (rollbackResult.success) {
                return {
                    recovered: false,
                    attempts,
                    finalError: lastError,
                    searchResults,
                    rolledBack: true,
                };
            }
        } catch (err) {
            console.error('[Recovery] Git rollback failed:', err);
        }
    }

    return {
        recovered: false,
        attempts,
        finalError: lastError,
        searchResults,
        rolledBack: false,
    };
}

/**
 * 검색 쿼리 생성
 */
function buildSearchQuery(action: ActionItem, error: string): string {
    const actionContext = getActionContext(action);

    // 에러 메시지에서 핵심 키워드 추출
    const errorKeywords = extractErrorKeywords(error);

    return `${actionContext} ${errorKeywords} fix solution`;
}

/**
 * 액션 컨텍스트 추출
 */
function getActionContext(action: ActionItem): string {
    switch (action.type) {
        case 'run_command':
            return `npm ${action.command}`;
        case 'create_file':
        case 'modify_file':
            // 확장자로 기술 스택 추론
            if (action.path.endsWith('.tsx')) return 'React TypeScript';
            if (action.path.endsWith('.ts')) return 'TypeScript';
            if (action.path.endsWith('.jsx')) return 'React';
            if (action.path.endsWith('.js')) return 'JavaScript';
            if (action.path.endsWith('.css')) return 'CSS';
            return 'code';
        default:
            return action.type;
    }
}

/**
 * 에러 메시지에서 키워드 추출
 */
function extractErrorKeywords(error: string): string {
    // 일반적인 에러 패턴 제거 후 핵심 메시지 추출
    const cleaned = error
        .replace(/Error:|error:|ERR!|at\s+\S+/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100); // 너무 긴 에러는 자르기

    return cleaned;
}

/**
 * 비동기 대기
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 에러 분석 및 제안 생성
 */
export function analyzeError(error: ActionError): {
    category: 'syntax' | 'dependency' | 'runtime' | 'network' | 'unknown';
    suggestions: string[];
} {
    const errorLower = error.error.toLowerCase();

    // 문법 에러
    if (
        errorLower.includes('syntaxerror') ||
        errorLower.includes('unexpected token') ||
        errorLower.includes('parsing error')
    ) {
        return {
            category: 'syntax',
            suggestions: [
                '코드 문법 오류가 있습니다',
                '괄호, 따옴표 짝이 맞는지 확인하세요',
                '이전 체크포인트로 롤백을 권장합니다',
            ],
        };
    }

    // 의존성 에러
    if (
        errorLower.includes('module not found') ||
        errorLower.includes('cannot find module') ||
        errorLower.includes('enoent')
    ) {
        return {
            category: 'dependency',
            suggestions: [
                '필요한 패키지가 설치되지 않았습니다',
                'npm install 실행을 권장합니다',
                '파일 경로를 확인하세요',
            ],
        };
    }

    // 런타임 에러
    if (
        errorLower.includes('typeerror') ||
        errorLower.includes('referenceerror') ||
        errorLower.includes('undefined')
    ) {
        return {
            category: 'runtime',
            suggestions: [
                '실행 중 타입 오류가 발생했습니다',
                '변수 정의 및 초기화를 확인하세요',
                '웹 검색으로 해결책을 찾아봅니다',
            ],
        };
    }

    // 네트워크 에러
    if (
        errorLower.includes('econnrefused') ||
        errorLower.includes('fetch') ||
        errorLower.includes('network')
    ) {
        return {
            category: 'network',
            suggestions: [
                '네트워크 연결 문제가 있습니다',
                '서버 상태를 확인하세요',
                '잠시 후 다시 시도하세요',
            ],
        };
    }

    return {
        category: 'unknown',
        suggestions: [
            '알 수 없는 에러가 발생했습니다',
            '웹 검색으로 해결책을 찾아봅니다',
            '에러 메시지를 확인해주세요',
        ],
    };
}
