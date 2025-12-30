/**
 * Git Actions - 버전 관리 액션
 * 
 * WebContainer 내에서 isomorphic-git을 사용하여 Git 작업 수행
 * 또는 외부 Git 명령어를 통해 실행
 */

import type {
    ActionResult,
    GitCheckpointAction,
    GitRevertAction,
    GitStatusAction,
    GitDiffAction,
} from './types';
import { useWebContainerStore } from '@/stores/webcontainer-store';

/**
 * Git 액션 실행 라우터
 */
export async function executeGitAction(
    action: GitCheckpointAction | GitRevertAction | GitStatusAction | GitDiffAction
): Promise<ActionResult> {
    switch (action.type) {
        case 'git_checkpoint':
            return gitCheckpoint(action);
        case 'git_revert':
            return gitRevert(action);
        case 'git_status':
            return gitStatus();
        case 'git_diff':
            return gitDiff(action);
    }
}

/**
 * 체크포인트 생성 (git add . && git commit)
 * 에러 복구를 위해 현재 상태를 저장
 */
async function gitCheckpoint(action: GitCheckpointAction): Promise<ActionResult> {
    const { runCommand, status } = useWebContainerStore.getState();

    if (status !== 'running') {
        return {
            success: false,
            action,
            error: 'WebContainer is not running',
        };
    }

    try {
        // git add .
        const addResult = await runCommand(['git', 'add', '.']);
        if (addResult.exitCode !== 0) {
            // Git이 초기화되지 않은 경우 초기화
            if (addResult.output.includes('not a git repository')) {
                await runCommand(['git', 'init']);
                await runCommand(['git', 'add', '.']);
            } else {
                throw new Error(`git add failed: ${addResult.output}`);
            }
        }

        // git commit
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const message = action.message || `Checkpoint: ${timestamp}`;
        const commitResult = await runCommand(['git', 'commit', '-m', message]);

        // 변경 사항이 없으면 성공으로 처리
        if (commitResult.output.includes('nothing to commit')) {
            return {
                success: true,
                action,
                output: 'No changes to commit',
                data: { committed: false },
            };
        }

        // 커밋 해시 추출
        const hashMatch = commitResult.output.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
        const hash = hashMatch ? hashMatch[1] : 'unknown';

        return {
            success: true,
            action,
            output: `Checkpoint created: ${hash} - ${message}`,
            data: { committed: true, hash, message },
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
 * 이전 체크포인트로 롤백 (git reset --hard)
 */
async function gitRevert(action: GitRevertAction): Promise<ActionResult> {
    const { runCommand, status } = useWebContainerStore.getState();

    if (status !== 'running') {
        return {
            success: false,
            action,
            error: 'WebContainer is not running',
        };
    }

    try {
        const steps = action.steps || 1;

        // 현재 HEAD 확인
        const headResult = await runCommand(['git', 'rev-parse', 'HEAD']);
        const currentHead = headResult.output.trim().slice(0, 7);

        // git reset --hard HEAD~N
        const resetResult = await runCommand(['git', 'reset', '--hard', `HEAD~${steps}`]);

        if (resetResult.exitCode !== 0) {
            throw new Error(`git reset failed: ${resetResult.output}`);
        }

        // 새 HEAD 확인
        const newHeadResult = await runCommand(['git', 'rev-parse', 'HEAD']);
        const newHead = newHeadResult.output.trim().slice(0, 7);

        return {
            success: true,
            action,
            output: `Reverted from ${currentHead} to ${newHead} (${steps} step${steps > 1 ? 's' : ''} back)`,
            data: {
                previousHead: currentHead,
                currentHead: newHead,
                steps,
            },
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
 * 변경된 파일 목록 조회 (git status --porcelain)
 */
async function gitStatus(): Promise<ActionResult> {
    const { runCommand, status } = useWebContainerStore.getState();

    if (status !== 'running') {
        return {
            success: false,
            action: { type: 'git_status', status: 'error' },
            error: 'WebContainer is not running',
        };
    }

    try {
        const result = await runCommand(['git', 'status', '--porcelain']);

        if (result.exitCode !== 0 && result.output.includes('not a git repository')) {
            return {
                success: true,
                action: { type: 'git_status', status: 'completed' },
                output: 'Not a git repository',
                data: { files: [], isRepo: false },
            };
        }

        const files = result.output
            .split('\n')
            .filter(line => line.trim())
            .map(line => ({
                status: line.slice(0, 2).trim(),
                path: line.slice(3),
            }));

        return {
            success: true,
            action: { type: 'git_status', status: 'completed' },
            output: files.length > 0
                ? files.map(f => `${f.status} ${f.path}`).join('\n')
                : 'Working tree clean',
            data: { files, isRepo: true },
        };
    } catch (error) {
        return {
            success: false,
            action: { type: 'git_status', status: 'error' },
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * 변경 내용 확인 (git diff)
 */
async function gitDiff(action: GitDiffAction): Promise<ActionResult> {
    const { runCommand, status } = useWebContainerStore.getState();

    if (status !== 'running') {
        return {
            success: false,
            action,
            error: 'WebContainer is not running',
        };
    }

    try {
        const args = ['git', 'diff'];
        if (action.path) {
            args.push(action.path);
        }

        const result = await runCommand(args);

        return {
            success: true,
            action,
            output: result.output || 'No changes',
            data: { hasChanges: result.output.length > 0 },
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
