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
    deleteFile: (path: string) => Promise<void>;
    appendTerminalOutput: (line: string) => void;
    clearTerminalOutput: () => void;
    reset: () => void;
}

// 싱글톤 WebContainer 인스턴스
let webContainerInstance: WebContainer | null = null;
let devServerProcess: { kill: () => void } | null = null;

// Vibric 요소 선택 스크립트 - 모든 HTML 페이지에서 사용
const VIBRIC_SELECTOR_SCRIPT = `
(function() {
    let hoveredElement = null;
    let selectionModeEnabled = true; // 기본 활성화

    // CSS 셀렉터 생성
    function getSelector(el) {
        if (el.id) return '#' + el.id;
        if (el.dataset && el.dataset.vibricId) return '[data-vibric-id="' + el.dataset.vibricId + '"]';
        let path = [];
        while (el && el.nodeType === 1) {
            let selector = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                selector += '.' + el.className.trim().split(/\\s+/).join('.');
            }
            path.unshift(selector);
            el = el.parentElement;
        }
        return path.join(' > ');
    }

    // 요소 정보 전송
    function sendElementInfo(type, el) {
        if (!el || el === document.body || el === document.documentElement) return;
        const rect = el.getBoundingClientRect();
        window.parent.postMessage({
            type: type,
            data: {
                selector: getSelector(el),
                tagName: el.tagName,
                className: el.className || '',
                textContent: (el.textContent || '').slice(0, 100),
                rect: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                }
            }
        }, '*');
    }

    // 부모로부터 선택 모드 상태 수신
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'vibric-selection-mode') {
            selectionModeEnabled = e.data.enabled;
            document.body.style.cursor = selectionModeEnabled ? 'crosshair' : '';
        }
    });

    document.addEventListener('mouseover', function(e) {
        if (!selectionModeEnabled) return;
        if (hoveredElement !== e.target) {
            hoveredElement = e.target;
            sendElementInfo('element-hover', e.target);
        }
    }, true);

    document.addEventListener('mouseout', function(e) {
        if (!selectionModeEnabled) return;
        if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
            hoveredElement = null;
            window.parent.postMessage({ type: 'element-leave' }, '*');
        }
    }, true);

    document.addEventListener('click', function(e) {
        if (!selectionModeEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        sendElementInfo('element-select', e.target);
    }, true);

    // 부모에게 준비 완료 알림
    window.parent.postMessage({ type: 'vibric-iframe-ready' }, '*');
})();
`;

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
    instance: null,
    status: 'idle',
    error: null,
    previewUrl: null,
    terminalOutput: [],

    boot: async () => {
        const { status } = get();

        // 이미 부팅 중이거나 부팅된 경우 스킵
        if (status !== 'idle') {
            console.log('[WebContainer] Skipping boot - already in status:', status);
            return;
        }

        // 이미 인스턴스가 있는 경우 (이전에 부팅됨)
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
        const { instance, appendTerminalOutput, runCommand } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        try {
            // Vibric 선택 스크립트 파일 주입 (모든 프로젝트에 자동 추가)
            try {
                await instance.fs.writeFile('vibric-selector.js', VIBRIC_SELECTOR_SCRIPT);
                console.log('[WebContainer] vibric-selector.js injected');
            } catch (e) {
                console.warn('[WebContainer] Failed to inject vibric-selector.js:', e);
            }

            // package.json을 읽어 프로젝트 타입 감지
            let isViteProject = false;
            try {
                const packageJsonContent = await instance.fs.readFile('package.json', 'utf-8');
                const packageJson = JSON.parse(packageJsonContent);
                isViteProject = !!(packageJson.devDependencies?.vite || packageJson.dependencies?.vite);
            } catch {
                // package.json이 없거나 파싱 실패시 정적 프로젝트로 처리
                isViteProject = false;
            }

            if (isViteProject) {
                // Vite 프로젝트: npm install → npm run dev
                set({ status: 'installing' });
                appendTerminalOutput('$ npm install\n');

                const installProcess = await instance.spawn('npm', ['install']);
                // npm install 출력 스트리밍 (비동기 - exit 대기를 block하지 않음)
                const installReader = installProcess.output.getReader();
                (async () => {
                    while (true) {
                        const { done, value } = await installReader.read();
                        if (done) break;
                        get().appendTerminalOutput(value as string);
                    }
                })();

                const installExitCode = await installProcess.exit;
                if (installExitCode !== 0) {
                    throw new Error(`npm install failed with exit code ${installExitCode}`);
                }

                set({ status: 'running' });
                appendTerminalOutput('\n$ npm run dev\n');

                const devProcess = await instance.spawn('npm', ['run', 'dev']);
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
            } else {
                // 정적 프로젝트 처리 Logic
                // 1. server.js 확인
                let hasServerJs = false;
                try {
                    await instance.fs.readFile('server.js');
                    hasServerJs = true;
                } catch {
                    hasServerJs = false;
                }

                if (hasServerJs) {
                    // server.js가 있으면 node 실행
                    set({ status: 'running' });
                    appendTerminalOutput('$ node server.js\n');

                    const devProcess = await instance.spawn('node', ['server.js']);
                    devServerProcess = devProcess;

                    // dev server output 스트리밍
                    const devReader = devProcess.output.getReader();
                    (async () => {
                        while (true) {
                            const { done, value } = await devReader.read();
                            if (done) break;
                            get().appendTerminalOutput(value as string);
                        }
                    })();
                } else {
                    // 2. server.js가 없으면 정적 파일 서빙 시도
                    // 먼저 index.html이 어디 있는지 확인
                    let serveDir = '.';  // 기본값: 루트

                    // 루트에 index.html이 없으면 다른 위치 확인
                    let hasRootIndex = false;
                    try {
                        await instance.fs.readFile('index.html');
                        hasRootIndex = true;
                    } catch { }

                    if (!hasRootIndex) {
                        // src/index.html 확인 (Vite 스타일)
                        try {
                            await instance.fs.readFile('src/index.html');
                            serveDir = 'src';
                        } catch { }
                    }

                    set({ status: 'running' });
                    appendTerminalOutput(`$ npx -y serve ${serveDir} -p 3001\n`);

                    const serveProcess = await instance.spawn('npx', ['-y', 'serve', serveDir, '-p', '3001']);
                    devServerProcess = serveProcess;

                    const serveReader = serveProcess.output.getReader();
                    (async () => {
                        while (true) {
                            const { done, value } = await serveReader.read();
                            if (done) break;
                            get().appendTerminalOutput(value as string);
                        }
                    })();
                }
            }

            // server-ready 이벤트를 통해 URL이 설정됨
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            set({ status: 'error', error: message });
            appendTerminalOutput(`\\nError: ${message}\\n`);
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

        // 부모 디렉토리 생성 (mkdir -p 동작)
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length > 1) {
            const dirPath = pathParts.slice(0, -1).join('/');
            try {
                await instance.fs.mkdir(dirPath, { recursive: true });
            } catch (err) {
                // 이미 존재하는 경우 무시
                console.log(`[WebContainer] Directory exists or created: ${dirPath}`);
            }
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

    deleteFile: async (path) => {
        const { instance } = get();
        if (!instance) {
            throw new Error('WebContainer not booted');
        }

        await instance.fs.rm(path, { recursive: true });
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
