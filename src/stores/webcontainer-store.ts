import { create } from 'zustand';
import { WebContainer, FileSystemTree } from '@webcontainer/api';

export type WebContainerStatus =
    | 'idle'
    | 'booting'
    | 'ready'
    | 'installing'
    | 'running'
    | 'error';

interface WebContainerState {
    // 상태
    instance: WebContainer | null;
    status: WebContainerStatus;
    error: string | null;
    previewUrl: string | null;
    terminalOutput: string[];

    // 액션
    boot: () => Promise<void>;
    mountFiles: (files: FileSystemTree) => Promise<void>;
    runCommand: (command: string[]) => Promise<{ exitCode: number; output: string }>;
    startDevServer: () => Promise<string | null>;
    stopDevServer: () => Promise<void>;
    writeFile: (path: string, contents: string) => Promise<void>;
    readFile: (path: string) => Promise<string>;
    appendTerminalOutput: (line: string) => void;
    clearTerminalOutput: () => void;
    reset: () => void;
}

// 싱글톤 WebContainer 인스턴스
let webContainerInstance: WebContainer | null = null;
let devServerProcess: { kill: () => void } | null = null;

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
    instance: null,
    status: 'idle',
    error: null,
    previewUrl: null,
    terminalOutput: [],

    boot: async () => {
        // 이미 부팅된 경우 스킵
        if (webContainerInstance) {
            set({ instance: webContainerInstance, status: 'ready' });
            return;
        }

        set({ status: 'booting', error: null });

        try {
            // WebContainer 부트스트랩
            webContainerInstance = await WebContainer.boot();
            set({ instance: webContainerInstance, status: 'ready' });

            // 서버 준비 이벤트 리스너
            webContainerInstance.on('server-ready', (port, url) => {
                console.log(`[WebContainer] Server ready on port ${port}: ${url}`);
                set({ previewUrl: url });
            });

            // 에러 이벤트 리스너
            webContainerInstance.on('error', (error) => {
                console.error('[WebContainer] Error:', error);
                set({ error: error.message, status: 'error' });
            });

            console.log('[WebContainer] Boot completed');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[WebContainer] Boot failed:', message);
            set({ status: 'error', error: message });
        }
    },

    mountFiles: async (files) => {
        const { instance } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        try {
            await instance.mount(files);
            console.log('[WebContainer] Files mounted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[WebContainer] Mount failed:', message);
            throw error;
        }
    },

    runCommand: async (command) => {
        const { instance, appendTerminalOutput } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        const [cmd, ...args] = command;
        const process = await instance.spawn(cmd, args);
        let output = '';

        // stdout 스트림 핸들링
        const reader = process.output.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = value as string;
            output += text;
            appendTerminalOutput(text);
        }

        const exitCode = await process.exit;
        return { exitCode, output };
    },

    startDevServer: async () => {
        const { instance, appendTerminalOutput } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        try {
            // npm install 없이 바로 서버 시작
            set({ status: 'running' });
            appendTerminalOutput('$ node server.js\n');

            const devProcess = await instance.spawn('node', ['server.js']);
            devServerProcess = devProcess;

            // dev server output 스트리밍 (비동기로 계속)
            const devReader = devProcess.output.getReader();
            (async () => {
                while (true) {
                    const { done, value } = await devReader.read();
                    if (done) break;
                    get().appendTerminalOutput(value as string);
                }
            })();

            // server-ready 이벤트를 통해 URL이 설정됨
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            set({ status: 'error', error: message });
            appendTerminalOutput(`\nError: ${message}\n`);
            return null;
        }
    },

    stopDevServer: async () => {
        if (devServerProcess) {
            devServerProcess.kill();
            devServerProcess = null;
        }
        set({ status: 'ready', previewUrl: null });
    },

    writeFile: async (path, contents) => {
        const { instance } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        await instance.fs.writeFile(path, contents);
    },

    readFile: async (path) => {
        const { instance } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        return await instance.fs.readFile(path, 'utf-8');
    },

    appendTerminalOutput: (line) => {
        set((state) => ({
            terminalOutput: [...state.terminalOutput.slice(-500), line], // 최근 500라인 유지
        }));
    },

    clearTerminalOutput: () => {
        set({ terminalOutput: [] });
    },

    reset: () => {
        if (devServerProcess) {
            devServerProcess.kill();
            devServerProcess = null;
        }
        set({
            status: 'idle',
            error: null,
            previewUrl: null,
            terminalOutput: [],
        });
    },
}));
