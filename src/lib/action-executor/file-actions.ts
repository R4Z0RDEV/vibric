/**
 * File Actions - 파일 관련 액션 실행
 * 
 * create_file, modify_file, delete_file, read_file 처리
 */

import type {
    ActionItem,
    ActionResult,
    CreateFileAction,
    ModifyFileAction,
    DeleteFileAction,
    ReadFileAction,
} from './types';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useWebContainerStore } from '@/stores/webcontainer-store';
import { addFileToTree, removeFileFromTree, findFileInTree } from '@/lib/webcontainer-templates';

/**
 * 파일 액션 실행 라우터
 */
export async function executeFileAction(
    action: CreateFileAction | ModifyFileAction | DeleteFileAction | ReadFileAction
): Promise<ActionResult> {
    switch (action.type) {
        case 'create_file':
            return createFile(action);
        case 'modify_file':
            return modifyFile(action);
        case 'delete_file':
            return deleteFile(action);
        case 'read_file':
            return readFile(action);
    }
}

/**
 * 파일 생성
 */
async function createFile(action: CreateFileAction): Promise<ActionResult> {
    const { files, setFiles } = useFileSystemStore.getState();
    const { writeFile, status } = useWebContainerStore.getState();

    try {
        // 1. FileSystem Store 업데이트
        const updatedFiles = addFileToTree(files, action.path, action.content);
        setFiles(updatedFiles);
        console.log(`[FileActions] FileSystem에 파일 생성: ${action.path}`);

        // 2. WebContainer에 동기화 (running 상태일 때만)
        if (status === 'running') {
            await writeFile(action.path, action.content);
            console.log(`[FileActions] WebContainer에 파일 동기화: ${action.path}`);
        }

        return {
            success: true,
            action,
            output: `Created file: ${action.path}`,
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
 * 파일 수정
 */
async function modifyFile(action: ModifyFileAction): Promise<ActionResult> {
    const { files, setFiles } = useFileSystemStore.getState();
    const { writeFile, status } = useWebContainerStore.getState();

    try {
        // 기존 파일 확인
        const existingFile = findFileInTree(files, action.path);
        if (!existingFile) {
            // 파일이 없으면 생성으로 처리
            console.log(`[FileActions] 파일이 없어서 생성: ${action.path}`);
        }

        // 1. FileSystem Store 업데이트
        const updatedFiles = addFileToTree(files, action.path, action.content);
        setFiles(updatedFiles);
        console.log(`[FileActions] FileSystem에 파일 수정: ${action.path}`);

        // 2. WebContainer에 동기화
        if (status === 'running') {
            await writeFile(action.path, action.content);
            console.log(`[FileActions] WebContainer에 파일 동기화: ${action.path}`);
        }

        return {
            success: true,
            action,
            output: `Modified file: ${action.path}${action.lines ? ` (${action.lines} lines)` : ''}`,
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
 * 파일 삭제
 */
async function deleteFile(action: DeleteFileAction): Promise<ActionResult> {
    const { files, setFiles } = useFileSystemStore.getState();
    const { deleteFile: wcDeleteFile, status } = useWebContainerStore.getState();

    try {
        // 1. FileSystem Store에서 삭제
        const updatedFiles = removeFileFromTree(files, action.path);
        setFiles(updatedFiles);
        console.log(`[FileActions] FileSystem에서 파일 삭제: ${action.path}`);

        // 2. WebContainer에서 삭제
        if (status === 'running') {
            await wcDeleteFile(action.path);
            console.log(`[FileActions] WebContainer에서 파일 삭제: ${action.path}`);
        }

        return {
            success: true,
            action,
            output: `Deleted file: ${action.path}`,
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
 * 파일 읽기
 */
async function readFile(action: ReadFileAction): Promise<ActionResult> {
    const { files } = useFileSystemStore.getState();
    const { readFile: wcReadFile, status } = useWebContainerStore.getState();

    try {
        // 1. FileSystem Store에서 먼저 시도
        const fileNode = findFileInTree(files, action.path);
        if (fileNode && fileNode.type === 'file' && fileNode.content) {
            return {
                success: true,
                action,
                output: fileNode.content,
                data: { source: 'filesystem-store' },
            };
        }

        // 2. WebContainer에서 읽기 시도
        if (status === 'running') {
            const content = await wcReadFile(action.path);
            return {
                success: true,
                action,
                output: content,
                data: { source: 'webcontainer' },
            };
        }

        return {
            success: false,
            action,
            error: `File not found: ${action.path}`,
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
