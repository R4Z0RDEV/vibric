/**
 * Action Executor Types
 * 
 * AI 에이전트가 수행할 수 있는 모든 액션 타입 정의
 */

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
    // 파일 액션 (File)
    | 'create_file'
    | 'modify_file'
    | 'delete_file'
    | 'read_file'
    // 커맨드 액션 (Command)
    | 'run_command'
    // 분석 액션 (Analysis)
    | 'list_files'
    | 'analyze_code'
    // 디버깅 액션 (Debug)
    | 'get_logs'
    | 'get_errors'
    // 브라우저 액션 (Browser)
    | 'refresh_preview'
    | 'navigate_to'
    // 검색 액션 (Search)
    | 'web_search';

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'waiting_approval';

// ============================================================================
// Base Action Interface
// ============================================================================

export interface BaseAction {
    type: ActionType;
    status: ActionStatus;
}

// ============================================================================
// File Actions
// ============================================================================

export interface CreateFileAction extends BaseAction {
    type: 'create_file';
    path: string;
    content: string;
}

export interface ModifyFileAction extends BaseAction {
    type: 'modify_file';
    path: string;
    content: string;
    lines?: string; // e.g., "+45" or "-10"
}

export interface DeleteFileAction extends BaseAction {
    type: 'delete_file';
    path: string;
}

export interface ReadFileAction extends BaseAction {
    type: 'read_file';
    path: string;
}

// ============================================================================
// Command Actions
// ============================================================================

export interface RunCommandAction extends BaseAction {
    type: 'run_command';
    command: string;
    timeout?: number; // ms, default 30000
}

// ============================================================================
// Analysis Actions
// ============================================================================

export interface ListFilesAction extends BaseAction {
    type: 'list_files';
    path: string;
    recursive?: boolean;
}

export type AnalyzeTarget = 'dependencies' | 'structure' | 'errors' | 'unused';

export interface AnalyzeCodeAction extends BaseAction {
    type: 'analyze_code';
    path: string;
    target: AnalyzeTarget;
}

// ============================================================================
// Debug Actions
// ============================================================================

export type LogSource = 'terminal' | 'console' | 'all';

export interface GetLogsAction extends BaseAction {
    type: 'get_logs';
    lines?: number; // default 50
    source?: LogSource;
}

export interface GetErrorsAction extends BaseAction {
    type: 'get_errors';
}

// ============================================================================
// Browser Actions
// ============================================================================

export interface RefreshPreviewAction extends BaseAction {
    type: 'refresh_preview';
}

export interface NavigateToAction extends BaseAction {
    type: 'navigate_to';
    url: string;
}

// ============================================================================
// Search Actions
// ============================================================================

export interface WebSearchAction extends BaseAction {
    type: 'web_search';
    query: string;
}

// ============================================================================
// Union Type
// ============================================================================

export type ActionItem =
    | CreateFileAction
    | ModifyFileAction
    | DeleteFileAction
    | ReadFileAction
    | RunCommandAction
    | ListFilesAction
    | AnalyzeCodeAction
    | GetLogsAction
    | GetErrorsAction
    | RefreshPreviewAction
    | NavigateToAction
    | WebSearchAction;

// ============================================================================
// Action Results
// ============================================================================

export interface ActionResult {
    success: boolean;
    action: ActionItem;
    output?: string;
    error?: string;
    data?: unknown; // Action-specific data
}

export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface FileListResult {
    files: Array<{
        name: string;
        path: string;
        type: 'file' | 'directory';
    }>;
}

export interface AnalyzeResult {
    target: AnalyzeTarget;
    data: unknown;
}

export interface SearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

export interface TavilySearchResult {
    results: SearchResult[];
    query: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ActionError {
    action: ActionItem;
    error: string;
    stdout?: string;
    stderr?: string;
    suggestedFix?: string;
    retryCount: number;
    searchResults?: SearchResult[];
}

// ============================================================================
// Executor Options
// ============================================================================

export type ExecutionMode = 'fast' | 'spec';

export interface ExecutorOptions {
    mode: ExecutionMode;
    maxRetries?: number; // default 3
    onApprovalRequired?: (action: ActionItem) => Promise<boolean>;
    onActionStart?: (action: ActionItem) => void;
    onActionComplete?: (result: ActionResult) => void;
    onActionError?: (error: ActionError) => void;
}

// ============================================================================
// Action Categories (for UI)
// ============================================================================

export const ACTION_CATEGORIES = {
    file: ['create_file', 'modify_file', 'delete_file', 'read_file'],
    command: ['run_command'],
    analysis: ['list_files', 'analyze_code'],
    debug: ['get_logs', 'get_errors'],
    browser: ['refresh_preview', 'navigate_to'],
    search: ['web_search'],
} as const;

// 위험도가 높은 액션 (Spec Mode에서 승인 필요)
export const DANGEROUS_ACTIONS: ActionType[] = [
    'run_command',
    'delete_file',
];

// 읽기 전용 액션 (항상 자동 실행 가능)
export const READONLY_ACTIONS: ActionType[] = [
    'read_file',
    'list_files',
    'analyze_code',
    'get_logs',
    'get_errors',
    'web_search',
];
