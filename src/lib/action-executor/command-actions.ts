/**
 * Command Actions - 터미널 명령 실행
 */

import type { ActionResult, RunCommandAction } from './types';
import { useWebContainerStore } from '@/stores/webcontainer-store';

// 차단된 명령어 패턴 (바닐라 전용 환경)
const BLOCKED_COMMANDS = [
    'npm',
    'yarn',
    'pnpm',
    'npx create-',
    'npx init',
];

/**
 * 차단된 명령인지 확인
 */
function isBlockedCommand(command: string): boolean {
    const lowerCommand = command.toLowerCase().trim();
    return BLOCKED_COMMANDS.some(blocked => lowerCommand.startsWith(blocked));
}

/**
 * 커맨드 액션 실행
 */
export async function executeCommandAction(
    action: RunCommandAction
): Promise<ActionResult> {
    const { runCommand, status, appendTerminalOutput } = useWebContainerStore.getState();

    // 차단된 명령 체크
    if (isBlockedCommand(action.command)) {
        appendTerminalOutput(`$ ${action.command}\n`);
        appendTerminalOutput(`❌ 차단됨: 바닐라 HTML/CSS/JS 환경에서는 npm/yarn 명령을 사용할 수 없습니다.\n`);
        appendTerminalOutput(`💡 styles.css에 직접 CSS를 작성하세요.\n\n`);

        return {
            success: false,
            action,
            error: 'Package manager commands are blocked in vanilla environment',
        };
    }

    if (status !== 'running') {
        return {
            success: false,
            action,
            error: 'WebContainer is not running',
        };
    }

    try {
        appendTerminalOutput(`$ ${action.command}\n`);

        // 명령어를 배열로 분리
        const parts = action.command.split(' ');
        const result = await runCommand(parts);

        const success = result.exitCode === 0;

        return {
            success,
            action,
            output: result.output,
            data: {
                exitCode: result.exitCode,
                stdout: result.output,
                stderr: '',
            },
            error: success ? undefined : `Command failed with exit code ${result.exitCode}`,
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

