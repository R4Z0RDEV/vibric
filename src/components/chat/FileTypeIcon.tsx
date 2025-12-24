'use client';

import { FileIcon, defaultStyles } from 'react-file-icon';
import type { DefaultExtensionType } from 'react-file-icon';

// 확장자별 커스텀 색상 및 스타일
const customStyles: Record<string, { type?: string; color?: string; glyphColor?: string }> = {
    // React / TypeScript
    tsx: { color: '#61DAFB', glyphColor: '#282C34' }, // React cyan
    jsx: { color: '#61DAFB', glyphColor: '#282C34' },
    ts: { color: '#3178C6', glyphColor: 'white' }, // TypeScript blue
    js: { color: '#F7DF1E', glyphColor: 'black' }, // JavaScript yellow

    // Web
    html: { color: '#E34F26', glyphColor: 'white' }, // HTML orange
    css: { color: '#1572B6', glyphColor: 'white' }, // CSS blue
    scss: { color: '#CC6699', glyphColor: 'white' }, // Sass pink
    less: { color: '#1D365D', glyphColor: 'white' },

    // Data
    json: { color: '#292929', glyphColor: '#F7DF1E' },
    yaml: { color: '#CB171E', glyphColor: 'white' },
    yml: { color: '#CB171E', glyphColor: 'white' },
    xml: { color: '#E34F26', glyphColor: 'white' },

    // Config
    env: { color: '#4A5568', glyphColor: '#48BB78' },
    config: { color: '#4A5568', glyphColor: 'white' },

    // Backend
    py: { color: '#3776AB', glyphColor: '#FFD43B' }, // Python
    go: { color: '#00ADD8', glyphColor: 'white' }, // Go
    rs: { color: '#DEA584', glyphColor: 'black' }, // Rust
    java: { color: '#ED8B00', glyphColor: 'white' },
    kt: { color: '#7F52FF', glyphColor: 'white' }, // Kotlin
    swift: { color: '#FA7343', glyphColor: 'white' },
    dart: { color: '#00B4AB', glyphColor: 'white' },

    // Markdown & Docs
    md: { color: '#083FA1', glyphColor: 'white' },
    mdx: { color: '#F9AC00', glyphColor: 'black' },
    txt: { color: '#718096', glyphColor: 'white' },

    // Images
    png: { type: 'image', color: '#A855F7' },
    jpg: { type: 'image', color: '#A855F7' },
    jpeg: { type: 'image', color: '#A855F7' },
    svg: { type: 'vector', color: '#FFB13B' },
    gif: { type: 'image', color: '#22C55E' },
    webp: { type: 'image', color: '#4F46E5' },

    // Other
    sh: { color: '#4EAA25', glyphColor: 'white' }, // Shell
    bash: { color: '#4EAA25', glyphColor: 'white' },
    dockerfile: { color: '#2496ED', glyphColor: 'white' }, // Docker
    sql: { color: '#336791', glyphColor: 'white' },
    prisma: { color: '#2D3748', glyphColor: '#5A67D8' },
};

// 파일 경로에서 확장자 추출
export function getFileExtension(filePath: string): string {
    const filename = filePath.split('/').pop() || '';

    // 특수 파일들 처리
    if (filename === 'Dockerfile' || filename === 'dockerfile') return 'dockerfile';
    if (filename === '.env' || filename.startsWith('.env.')) return 'env';
    if (filename === 'package.json') return 'json';
    if (filename === 'tsconfig.json') return 'json';

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ext;
}

interface FileTypeIconProps {
    filePath: string;
    size?: number;
    className?: string;
}

export function FileTypeIcon({ filePath, size = 20, className = '' }: FileTypeIconProps) {
    const ext = getFileExtension(filePath);
    const customStyle = customStyles[ext] || {};
    const defaultStyle = (defaultStyles as Record<string, any>)[ext as DefaultExtensionType] || {};

    return (
        <div className={`inline-flex ${className}`} style={{ width: size, height: size }}>
            <FileIcon
                extension={ext}
                {...defaultStyle}
                {...customStyle}
                labelColor={customStyle.color || defaultStyle.labelColor}
            />
        </div>
    );
}

// 확장자에 따른 언어 이름 반환
export function getLanguageName(filePath: string): string {
    const ext = getFileExtension(filePath);
    const langMap: Record<string, string> = {
        tsx: 'React TypeScript',
        jsx: 'React JavaScript',
        ts: 'TypeScript',
        js: 'JavaScript',
        html: 'HTML',
        css: 'CSS',
        scss: 'SCSS',
        json: 'JSON',
        yaml: 'YAML',
        yml: 'YAML',
        py: 'Python',
        go: 'Go',
        rs: 'Rust',
        java: 'Java',
        kt: 'Kotlin',
        swift: 'Swift',
        dart: 'Dart',
        md: 'Markdown',
        sh: 'Shell',
        sql: 'SQL',
        prisma: 'Prisma',
    };
    return langMap[ext] || ext.toUpperCase();
}
