'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Terminal as TerminalIcon } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    className?: string;
}

export function Terminal({ className = '' }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isReady, setIsReady] = useState(false);

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
        xterm.write('\x1b[32m➜\x1b[0m \x1b[36mvibric\x1b[0m $ ');

        // 간단한 입력 핸들러 (데모용)
        let currentLine = '';
        xterm.onData((data: string) => {
            if (data === '\r') {
                // Enter 키
                xterm.writeln('');
                if (currentLine.trim()) {
                    handleCommand(xterm, currentLine.trim());
                }
                currentLine = '';
                xterm.write('\x1b[32m➜\x1b[0m \x1b[36mvibric\x1b[0m $ ');
            } else if (data === '\u007F') {
                // Backspace
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    xterm.write('\b \b');
                }
            } else if (data.charCodeAt(0) >= 32) {
                // 일반 문자만 처리 (제어 문자 제외)
                currentLine += data;
                xterm.write(data);
            }
        });

        // 리사이즈 핸들러
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
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

    // 터미널 크기 재조정
    useEffect(() => {
        if (fitAddonRef.current && !isMinimized && isReady) {
            setTimeout(() => fitAddonRef.current?.fit(), 100);
        }
    }, [isMinimized, isReady]);

    return (
        <div className={`flex flex-col bg-zinc-900 border-t border-zinc-800 ${className}`}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-400">터미널</span>
                </div>
                <div className="flex items-center gap-1">
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

// 간단한 명령어 핸들러 (데모용)
function handleCommand(xterm: any, command: string) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
        case 'help':
            xterm.writeln('\x1b[33m사용 가능한 명령어:\x1b[0m');
            xterm.writeln('  \x1b[36mhelp\x1b[0m     - 도움말 표시');
            xterm.writeln('  \x1b[36mclear\x1b[0m    - 화면 지우기');
            xterm.writeln('  \x1b[36mls\x1b[0m       - 파일 목록');
            xterm.writeln('  \x1b[36mecho\x1b[0m     - 텍스트 출력');
            xterm.writeln('');
            xterm.writeln('\x1b[90m* WebContainer 연결 시 npm, node 명령어 사용 가능\x1b[0m');
            break;

        case 'clear':
            xterm.clear();
            break;

        case 'ls':
            xterm.writeln('\x1b[34msrc/\x1b[0m');
            xterm.writeln('\x1b[34mpublic/\x1b[0m');
            xterm.writeln('\x1b[34mdocs/\x1b[0m');
            xterm.writeln('package.json');
            xterm.writeln('tailwind.config.ts');
            xterm.writeln('next.config.ts');
            break;

        case 'echo':
            xterm.writeln(args.join(' '));
            break;

        case 'npm':
        case 'node':
        case 'npx':
            xterm.writeln(`\x1b[33m⏳ ${cmd} 명령어는 WebContainer 연결 후 사용 가능합니다.\x1b[0m`);
            break;

        default:
            xterm.writeln(`\x1b[31m명령어를 찾을 수 없습니다: ${cmd}\x1b[0m`);
            xterm.writeln(`'help'를 입력하여 사용 가능한 명령어를 확인하세요.`);
    }
}
