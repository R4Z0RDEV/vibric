'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const components: Components = {
        // 코드 블록 - pre > code 구조에서 code 처리
        code({ node, className, children, ...rest }) {
            // node prop은 버림 (DOM에 전달 X)
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            // language-* 클래스가 있으면 코드 블록 (fenced code block)
            // 없으면 인라인 코드
            if (match) {
                const language = match[1];
                return (
                    <div className="my-2 rounded-lg overflow-hidden max-w-full">
                        <div className="flex items-center justify-between bg-zinc-800 px-3 py-1 text-xs text-white/60">
                            <span>{language}</span>
                        </div>
                        <SyntaxHighlighter
                            style={oneDark}
                            language={language}
                            PreTag="div"
                            customStyle={{
                                margin: 0,
                                padding: '12px',
                                fontSize: '12px',
                                lineHeight: '1.5',
                                background: 'rgba(0, 0, 0, 0.4)',
                                borderRadius: '0 0 8px 8px',
                            }}
                            codeTagProps={{
                                style: {
                                    fontFamily: 'var(--font-mono, Consolas, Monaco, monospace)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }
                            }}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </div>
                );
            }

            // 인라인 코드 (language 없음)
            return (
                <code
                    className="bg-zinc-800/60 text-pink-400 px-1.5 py-0.5 rounded text-xs font-mono"
                    {...rest}
                >
                    {children}
                </code>
            );
        },
        // pre 태그 - 그냥 children 반환 (code에서 처리)
        pre({ children }) {
            return <>{children}</>;
        },
        // 테이블
        table({ children }) {
            return (
                <div className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse text-xs">
                        {children}
                    </table>
                </div>
            );
        },
        thead({ children }) {
            return <thead className="bg-white/10">{children}</thead>;
        },
        th({ children }) {
            return (
                <th className="border border-white/20 px-3 py-2 text-left text-white/90 font-semibold">
                    {children}
                </th>
            );
        },
        tbody({ children }) {
            return <tbody className="divide-y divide-white/10">{children}</tbody>;
        },
        tr({ children }) {
            return <tr className="hover:bg-white/5 transition-colors">{children}</tr>;
        },
        td({ children }) {
            return (
                <td className="border border-white/10 px-3 py-2 text-white/80">
                    {children}
                </td>
            );
        },
        // 헤딩
        h1({ children }) {
            return <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>;
        },
        h2({ children }) {
            return <h2 className="text-base font-bold text-white mt-3 mb-1.5">{children}</h2>;
        },
        h3({ children }) {
            return <h3 className="text-sm font-semibold text-white/90 mt-2 mb-1">{children}</h3>;
        },
        h4({ children }) {
            return <h4 className="text-sm font-medium text-white/80 mt-2 mb-1">{children}</h4>;
        },
        // 리스트
        ul({ children }) {
            return <ul className="list-disc list-inside my-2 space-y-1 text-white/80 pl-2">{children}</ul>;
        },
        ol({ children }) {
            return <ol className="list-decimal list-inside my-2 space-y-1 text-white/80 pl-2">{children}</ol>;
        },
        li({ children }) {
            return <li className="text-sm text-white/80 leading-relaxed">{children}</li>;
        },
        // 볼드 & 이탤릭
        strong({ children }) {
            return <strong className="font-bold text-white">{children}</strong>;
        },
        em({ children }) {
            return <em className="italic text-white/90">{children}</em>;
        },
        // 링크
        a({ href, children }) {
            return (
                <a
                    href={href}
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            );
        },
        // 인용
        blockquote({ children }) {
            return (
                <blockquote className="border-l-3 border-blue-500/50 bg-blue-500/10 pl-4 py-2 my-2 text-white/70 italic rounded-r">
                    {children}
                </blockquote>
            );
        },
        // 수평선
        hr() {
            return <hr className="border-white/20 my-4" />;
        },
        // 단락
        p({ children }) {
            return <p className="text-sm text-white/80 my-2 leading-relaxed">{children}</p>;
        },
    };

    return (
        <div className={`markdown-content prose prose-invert prose-sm overflow-x-auto break-words ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
