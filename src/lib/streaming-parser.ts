/**
 * StreamingParser - XML 응답 실시간 파싱 유틸리티
 * 
 * AI 응답에서 <thinking>, <actions>, <message> 태그를 실시간으로 파싱합니다.
 */

export interface ThinkingStep {
    title: string;
    content: string;
}

export interface ActionItem {
    type:
    | 'create_file'
    | 'modify_file'
    | 'delete_file'
    | 'read_file'
    | 'run_command'
    | 'list_files'
    | 'analyze_code'
    | 'get_logs'
    | 'get_errors'
    | 'refresh_preview'
    | 'navigate_to'
    | 'web_search'
    | 'git_checkpoint'
    | 'git_revert'
    | 'git_status'
    | 'git_diff';
    path?: string;
    lines?: string;  // e.g., "+45" or "-10"
    content?: string;
    command?: string;  // for run_command
    query?: string;    // for web_search
    url?: string;      // for navigate_to
    timeout?: number;  // for run_command
    recursive?: boolean; // for list_files
    target?: string;   // for analyze_code
    source?: string;   // for get_logs
    message?: string;  // for git_checkpoint
    steps?: number;    // for git_revert
    status: 'pending' | 'in_progress' | 'completed' | 'error' | 'waiting_approval';
}

export interface ParsedResponse {
    thinking: ThinkingStep[];
    actions: ActionItem[];
    message: string;
    isComplete: boolean;
}

export class StreamingParser {
    private buffer: string = '';
    private parsedResponse: ParsedResponse = {
        thinking: [],
        actions: [],
        message: '',
        isComplete: false,
    };

    /**
     * 새로운 청크를 추가하고 파싱합니다.
     */
    addChunk(chunk: string): ParsedResponse {
        this.buffer += chunk;
        this.parseBuffer();
        return this.getState();
    }

    /**
     * 현재 파싱 상태를 반환합니다.
     */
    getState(): ParsedResponse {
        return { ...this.parsedResponse };
    }

    /**
     * 파서를 초기화합니다.
     */
    reset(): void {
        this.buffer = '';
        this.parsedResponse = {
            thinking: [],
            actions: [],
            message: '',
            isComplete: false,
        };
    }

    /**
     * 버퍼에서 태그를 파싱합니다.
     */
    private parseBuffer(): void {
        // Parse thinking steps
        this.parseThinkingSteps();

        // Parse actions
        this.parseActions();

        // Parse message
        this.parseMessage();

        // Check if complete
        this.parsedResponse.isComplete = this.buffer.includes('</boltResponse>');
    }

    /**
     * <thinking> 블록 내의 <step> 태그들을 파싱합니다.
     */
    private parseThinkingSteps(): void {
        const stepRegex = /<step\s+title="([^"]*)">([\s\S]*?)<\/step>/g;
        const thinkingMatch = this.buffer.match(/<thinking>([\s\S]*?)<\/thinking>/);

        if (thinkingMatch) {
            const thinkingContent = thinkingMatch[1];
            const steps: ThinkingStep[] = [];
            let match;

            while ((match = stepRegex.exec(thinkingContent)) !== null) {
                steps.push({
                    title: match[1].trim(),
                    content: match[2].trim(),
                });
            }

            this.parsedResponse.thinking = steps;
        } else {
            // 아직 </thinking>이 없으면 진행 중인 step들을 파싱
            const partialSteps: ThinkingStep[] = [];
            const partialStepRegex = /<step\s+title="([^"]*)">([\s\S]*?)(?:<\/step>|$)/g;
            let match;

            while ((match = partialStepRegex.exec(this.buffer)) !== null) {
                partialSteps.push({
                    title: match[1].trim(),
                    content: match[2].trim(),
                });
            }

            if (partialSteps.length > 0) {
                this.parsedResponse.thinking = partialSteps;
            }
        }
    }

    /**
     * <actions> 블록 내의 <action> 태그들을 파싱합니다.
     * 모든 액션 타입과 속성 지원
     */
    private parseActions(): void {
        // 확장된 정규식 - 모든 속성 캡처
        const actionRegex = /<action\s+type="([^"]*)"([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/action>)/g;
        const actionsMatch = this.buffer.match(/<actions>([\s\S]*?)<\/actions>/);

        const parseAttributes = (attrString: string): Record<string, string> => {
            const attrs: Record<string, string> = {};
            const attrRegex = /(\w+)="([^"]*)"/g;
            let match;
            while ((match = attrRegex.exec(attrString)) !== null) {
                attrs[match[1]] = match[2];
            }
            return attrs;
        };

        const createActionItem = (
            type: string,
            attrs: Record<string, string>,
            content: string,
            status: ActionItem['status']
        ): ActionItem => {
            return {
                type: type as ActionItem['type'],
                path: attrs.path,
                lines: attrs.lines,
                content: content.trim() || undefined,
                command: attrs.command,
                query: attrs.query,
                url: attrs.url,
                timeout: attrs.timeout ? parseInt(attrs.timeout) : undefined,
                recursive: attrs.recursive === 'true',
                target: attrs.target,
                source: attrs.source,
                status,
            };
        };

        if (actionsMatch) {
            const actionsContent = actionsMatch[1];
            const actions: ActionItem[] = [];
            let match;

            while ((match = actionRegex.exec(actionsContent)) !== null) {
                const type = match[1];
                const attrs = parseAttributes(match[2]);
                const content = match[3] || '';
                actions.push(createActionItem(type, attrs, content, 'completed'));
            }

            this.parsedResponse.actions = actions;
        } else {
            // 아직 </actions>이 없으면 진행 중인 action들을 파싱
            const partialActions: ActionItem[] = [];
            const partialActionRegex = /<action\s+type="([^"]*)"([^>]*?)(?:\s*\/>|>([\s\S]*?)(?:<\/action>|$))/g;
            let match;

            while ((match = partialActionRegex.exec(this.buffer)) !== null) {
                const type = match[1];
                const attrs = parseAttributes(match[2]);
                const content = match[3] || '';
                const isComplete = this.buffer.includes(`</action>`);
                partialActions.push(createActionItem(type, attrs, content, isComplete ? 'completed' : 'in_progress'));
            }

            if (partialActions.length > 0) {
                this.parsedResponse.actions = partialActions;
            }
        }
    }

    /**
     * <message> 태그를 파싱합니다.
     */
    private parseMessage(): void {
        const messageMatch = this.buffer.match(/<message>([\s\S]*?)<\/message>/);

        if (messageMatch) {
            this.parsedResponse.message = this.dedent(messageMatch[1]);
        } else {
            // 진행 중인 메시지 파싱
            const partialMatch = this.buffer.match(/<message>([\s\S]*)$/);
            if (partialMatch) {
                this.parsedResponse.message = this.dedent(partialMatch[1]);
            }
        }
    }

    /**
     * 텍스트의 공통 들여쓰기를 제거합니다.
     * Markdown이 4-space 들여쓰기를 코드 블록으로 해석하는 문제 방지
     */
    private dedent(text: string): string {
        const lines = text.split('\n');

        // 빈 줄이 아닌 라인들의 최소 들여쓰기 찾기
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim().length === 0) continue; // 빈 줄 무시
            const match = line.match(/^(\s*)/);
            if (match) {
                minIndent = Math.min(minIndent, match[1].length);
            }
        }

        // 들여쓰기가 없거나 찾지 못했으면 원본 반환
        if (minIndent === 0 || minIndent === Infinity) {
            return text.trim();
        }

        // 각 줄에서 공통 들여쓰기 제거
        const dedented = lines.map(line => {
            if (line.trim().length === 0) return '';
            return line.slice(minIndent);
        }).join('\n');

        return dedented.trim();
    }

    /**
     * 원시 버퍼를 반환합니다 (디버깅용).
     */
    getRawBuffer(): string {
        return this.buffer;
    }
}

/**
 * 타이머 시작 시간을 기록하고 경과 시간을 반환하는 유틸리티
 */
export function createThinkingTimer(): {
    start: () => void;
    getElapsed: () => number;
} {
    let startTime: number = 0;

    return {
        start: () => {
            startTime = Date.now();
        },
        getElapsed: () => {
            if (startTime === 0) return 0;
            return Math.floor((Date.now() - startTime) / 1000);
        },
    };
}
