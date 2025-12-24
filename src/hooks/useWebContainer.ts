'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWebContainerStore } from '@/stores/webcontainer-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { usePageStore } from '@/stores/page-store';
import { fileNodesToFileSystemTree, defaultFileNodes } from '@/lib/webcontainer-templates';

export function useWebContainer() {
    const isInitializing = useRef(false);

    const {
        instance,
        status,
        error,
        previewUrl,
        terminalOutput,
        boot,
        mountFiles,
        startDevServer,
        writeFile,
        deleteFile,
        appendTerminalOutput,
        reset
    } = useWebContainerStore();

    const {
        files,
        setFiles,
        isBooted,
        setBooted,
        setServerUrl
    } = useFileSystemStore();

    const { syncFromFileSystem } = usePageStore();

    // 초기화: WebContainer 부트 → 파일 마운트 → Dev server 시작
    const initialize = useCallback(async () => {
        if (isInitializing.current || status !== 'idle') return;
        isInitializing.current = true;

        try {
            appendTerminalOutput('[Vibric] WebContainer 초기화 중...\n');

            // 1. WebContainer 부트
            await boot();

            // 2. 파일 시스템에 파일이 없으면 기본 템플릿 설정
            let currentFiles = useFileSystemStore.getState().files;
            if (currentFiles.length === 0) {
                setFiles(defaultFileNodes);
                currentFiles = defaultFileNodes;
            }

            // 3. 페이지 스토어를 파일 시스템과 동기화
            syncFromFileSystem(currentFiles);

            // 4. 파일을 WebContainer에 마운트
            const fileTree = fileNodesToFileSystemTree(currentFiles);
            await mountFiles(fileTree);
            appendTerminalOutput('[Vibric] 파일 마운트 완료\n');

            // 5. Dev server 시작
            await startDevServer();

            setBooted(true);
            appendTerminalOutput('[Vibric] 초기화 완료!\n');
        } catch (error) {
            console.error('[useWebContainer] Initialize failed:', error);
            appendTerminalOutput(`[Vibric] 초기화 실패: ${error}\n`);
        } finally {
            isInitializing.current = false;
        }
    }, [status, boot, mountFiles, startDevServer, setFiles, setBooted, appendTerminalOutput, syncFromFileSystem]);

    // 파일 변경 시 WebContainer에 동기화
    const syncFile = useCallback(async (path: string, content: string) => {
        if (!instance || status !== 'running') {
            console.warn('[useWebContainer] Cannot sync file - not running');
            return;
        }

        try {
            await writeFile(path, content);
            appendTerminalOutput(`[Vibric] 파일 업데이트: ${path}\n`);
        } catch (error) {
            console.error('[useWebContainer] Sync file failed:', error);
        }
    }, [instance, status, writeFile, appendTerminalOutput]);

    // 파일 삭제 시 WebContainer에서 제거
    const removeFile = useCallback(async (path: string) => {
        if (!instance || status !== 'running') {
            console.warn('[useWebContainer] Cannot remove file - not running');
            return;
        }

        try {
            await deleteFile(path);
            appendTerminalOutput(`[Vibric] 파일 삭제: ${path}\n`);
        } catch (error) {
            console.error('[useWebContainer] Remove file failed:', error);
        }
    }, [instance, status, deleteFile, appendTerminalOutput]);

    // previewUrl이 변경되면 FileSystemStore에도 반영
    useEffect(() => {
        if (previewUrl) {
            setServerUrl(previewUrl);
        }
    }, [previewUrl, setServerUrl]);

    return {
        instance,
        status,
        error,
        previewUrl,
        terminalOutput,
        files,
        isBooted,
        initialize,
        syncFile,
        removeFile,
        reset,
    };
}
