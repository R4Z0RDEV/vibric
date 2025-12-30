'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Terminal as TerminalIcon, RefreshCw } from 'lucide-react';
import { useWebContainerStore } from '@/stores/webcontainer-store';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    className?: string;
}

export function Terminal({ className = '' }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const shellProcessRef = useRef<any>(null);
    const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const { instance, status } = useWebContainerStore();

    // WebContainer 쉘 시작
    const startShell = useCallback(async (xterm: any) => {
        if (!instance || shellProcessRef.current) return;

        try {
            // jsh (WebContainer 쉘) 시작
            const shellProcess = await instance.spawn('jsh', {
                terminal: {
                    cols: xterm.cols,
                    rows: xterm.rows,
                },
            });

            shellProcessRef.current = shellProcess;

            // 쉘 출력 → 터미널에 표시
            shellProcess.output.pipeTo(
                new WritableStream({
                    write(data) {
                        xterm.write(data);
                    },
                })
            );

            // 터미널 입력 → 쉘로 전달
            const writer = shellProcess.input.getWriter();
            writerRef.current = writer;

            setIsConnected(true);
            console.log('[Terminal] WebContainer shell connected');
        } catch (error) {
            console.error('[Terminal] Failed to start shell:', error);
            xterm.writeln('\x1b[31m❌ WebContainer 쉘 연결 실패\x1b[0m');
        }
    }, [instance]);

    // xterm 초기화
    const initTerminal = useCallback(async () => {
        if (!terminalRef.current || xtermRef.current) return;

        // 동적 import - 브라우저에서만 로드
        const { Terminal: XTerm } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        // XTerm 인스턴스 생성
        const xterm = new XTerm({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", Consolas, monospace',
            theme: {
                background: '#18181b',
                foreground: '#fafafa',
                cursor: '#fafafa',
                cursorAccent: '#18181b',
                selectionBackground: 'rgba(59, 130, 246, 0.4)',
                black: '#18181b',
                red: '#f87171',
                green: '#4ade80',
                yellow: '#fbbf24',
                blue: '#60a5fa',
                magenta: '#c084fc',
                cyan: '#22d3ee',
                white: '#fafafa',
                brightBlack: '#52525b',
                brightRed: '#fca5a5',
                brightGreen: '#86efac',
                brightYellow: '#fde047',
                brightBlue: '#93c5fd',
                brightMagenta: '#d8b4fe',
                brightCyan: '#67e8f9',
                brightWhite: '#ffffff',
            },
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);

        // DOM에 터미널 마운트
        xterm.open(terminalRef.current);

        // 약간의 딜레이 후 fit 적용
        requestAnimationFrame(() => {
            fitAddon.fit();
        });

        xtermRef.current = xterm;
        fitAddonRef.current = fitAddon;
        setIsReady(true);

        // 환영 메시지
        xterm.writeln('\x1b[1;34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
        xterm.writeln('\x1b[1;36m  🚀 Vibric Terminal\x1b[0m');
        xterm.writeln('\x1b[90m  WebContainer 터미널 - 브라우저에서 Node.js 실행\x1b[0m');
        xterm.writeln('\x1b[1;34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
        xterm.writeln('');

        // 터미널 입력 → WebContainer 쉘로 전달
        xterm.onData((data: string) => {
            if (writerRef.current) {
                writerRef.current.write(data);
            }
        });

        // 리사이즈 핸들러
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
            // 쉘 리사이즈
            if (shellProcessRef.current && xtermRef.current) {
                shellProcessRef.current.resize?.({
                    cols: xtermRef.current.cols,
                    rows: xtermRef.current.rows,
                });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            xterm.dispose();
        };
    }, []);

    // 컴포넌트 마운트 후 터미널 초기화
    useEffect(() => {
        // DOM이 준비된 후에 초기화
        const timer = setTimeout(() => {
            initTerminal();
        }, 100);

        return () => {
            clearTimeout(timer);
            if (xtermRef.current) {
                xtermRef.current.dispose();
                xtermRef.current = null;
            }
        };
    }, [initTerminal]);

    // WebContainer 준비되면 쉘 연결
    useEffect(() => {
        if (instance && status === 'running' && xtermRef.current && !shellProcessRef.current) {
            startShell(xtermRef.current);
        }
    }, [instance, status, startShell]);

    // 터미널 크기 재조정
    useEffect(() => {
        if (fitAddonRef.current && !isMinimized && isReady) {
            setTimeout(() => fitAddonRef.current?.fit(), 100);
        }
    }, [isMinimized, isReady]);

    // 쉘 재연결
    const reconnectShell = useCallback(async () => {
        if (!instance || !xtermRef.current) return;

        // 기존 쉘 정리
        if (writerRef.current) {
            try {
                writerRef.current.close();
            } catch (e) { /* ignore */ }
        }
        shellProcessRef.current = null;
        writerRef.current = null;
        setIsConnected(false);

        // 터미널 클리어 후 재연결
        xtermRef.current.clear();
        xtermRef.current.writeln('\x1b[33m🔄 쉘 재연결 중...\x1b[0m');

        await startShell(xtermRef.current);
    }, [instance, startShell]);

    return (
        <div className={`flex flex-col bg-zinc-900 border-t border-zinc-800 ${className}`}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-400">터미널</span>
                    {isConnected ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">연결됨</span>
                    ) : status === 'running' ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">연결 중...</span>
                    ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded">대기 중</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {instance && (
                        <button
                            onClick={reconnectShell}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                            title="쉘 재연결"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    >
                        {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Terminal Content */}
            {!isMinimized && (
                <div
                    ref={terminalRef}
                    className="flex-1 min-h-[200px] overflow-hidden"
                    style={{ padding: '8px' }}
                />
            )}
        </div>
    );
}

