import { create } from 'zustand';
import type { FileNode } from '@/types';

// 페이지 인터페이스
export interface Page {
    id: string;
    name: string;
    path: string;  // 라우트 경로 (e.g., '/', '/about')
    fileName: string;  // 파일명 (e.g., 'index.html', 'about.html')
}

interface PageStoreState {
    // 상태
    pages: Page[];
    activePageId: string | null;
    isMissionControlOpen: boolean;

    // 액션
    addPage: (page: Omit<Page, 'id'>) => void;
    removePage: (id: string) => void;
    setActivePage: (id: string) => void;
    updatePage: (id: string, updates: Partial<Page>) => void;
    setPages: (pages: Page[]) => void;
    syncFromFileSystem: (files: FileNode[]) => void;
    toggleMissionControl: () => void;
    setMissionControlOpen: (open: boolean) => void;
}

// FileNode 배열에서 .html 파일을 찾아 Page 목록 생성
// 지원하는 페이지 파일 확장자
const PAGE_EXTENSIONS = ['.html', '.tsx', '.jsx', '.vue', '.svelte', '.astro'];

// 페이지로 취급하지 않는 특수 파일 패턴
const EXCLUDED_PATTERNS = [
    /^_/,           // _app.tsx, _document.tsx 등 Next.js 특수 파일
    /^\[/,          // [slug].tsx 등 동적 라우트 (현재는 제외)
    /\.test\./,     // *.test.tsx
    /\.spec\./,     // *.spec.tsx
    /\.stories\./,  // *.stories.tsx (Storybook)
    /layout\./,     // layout.tsx (Next.js App Router)
    /loading\./,    // loading.tsx
    /error\./,      // error.tsx
    /not-found\./,  // not-found.tsx
];

// 파일이 페이지로 취급될 수 있는지 확인
function isPageFile(fileName: string): boolean {
    // 확장자 확인
    const hasValidExtension = PAGE_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) return false;

    // 제외 패턴 확인
    const isExcluded = EXCLUDED_PATTERNS.some(pattern => pattern.test(fileName));
    if (isExcluded) return false;

    return true;
}

// 파일 확장자 제거
function removeExtension(fileName: string): string {
    for (const ext of PAGE_EXTENSIONS) {
        if (fileName.endsWith(ext)) {
            return fileName.slice(0, -ext.length);
        }
    }
    return fileName;
}

// FileNode 배열에서 페이지 파일을 찾아 Page 목록 생성
function extractPagesFromFiles(files: FileNode[]): Page[] {
    const pages: Page[] = [];
    const seenPaths = new Set<string>(); // 중복 경로 방지

    function traverse(nodes: FileNode[], parentPath: string = '') {
        for (const node of nodes) {
            if (node.type === 'file' && isPageFile(node.name)) {
                const fileName = node.name;
                const baseName = removeExtension(fileName);

                // index 파일 → 부모 경로, 다른 파일 → /파일명
                const isIndex = baseName === 'index' || baseName === 'page';
                let routePath: string;
                let displayName: string;

                if (isIndex) {
                    routePath = parentPath || '/';
                    displayName = parentPath ? parentPath.split('/').pop()! : 'Home';
                    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                } else {
                    routePath = parentPath ? `${parentPath}/${baseName}` : `/${baseName}`;
                    displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
                }

                // 중복 경로 방지
                if (seenPaths.has(routePath)) continue;
                seenPaths.add(routePath);

                const id = routePath === '/' ? 'home' : routePath.replace(/\//g, '-').slice(1);

                pages.push({
                    id,
                    name: displayName,
                    path: routePath,
                    fileName: node.path || fileName,
                });
            }

            // 디렉토리 탐색 (pages/, app/, src/pages/, src/app/ 등)
            if (node.children) {
                let newParentPath = parentPath;

                // pages 또는 app 디렉토리 내부의 경우 경로 누적
                if (['pages', 'app', 'routes'].includes(node.name) && !parentPath) {
                    // pages/, app/, routes/ 루트 디렉토리는 경로에 포함하지 않음
                    traverse(node.children, '');
                } else if (parentPath || !['src', 'lib', 'components', 'node_modules'].includes(node.name)) {
                    // 일반 디렉토리는 경로 누적
                    newParentPath = parentPath ? `${parentPath}/${node.name}` : `/${node.name}`;
                    traverse(node.children, newParentPath);
                } else {
                    // src/ 등은 경로에 포함하지 않고 탐색만
                    traverse(node.children, parentPath);
                }
            }
        }
    }

    traverse(files);

    // Home을 첫 번째로 정렬
    return pages.sort((a, b) => {
        if (a.id === 'home') return -1;
        if (b.id === 'home') return 1;
        return a.name.localeCompare(b.name);
    });
}


export const usePageStore = create<PageStoreState>((set) => ({
    // 초기 상태 - 빈 배열 (syncFromFileSystem에서 설정됨)
    pages: [],
    activePageId: null,
    isMissionControlOpen: false,

    // 페이지 목록 설정
    setPages: (pages) => set({ pages }),

    // 파일 시스템에서 페이지 동기화
    syncFromFileSystem: (files) => set((state) => {
        const pages = extractPagesFromFiles(files);
        // 활성 페이지가 없거나 더 이상 존재하지 않으면 첫 번째 페이지 선택
        const activePageId = pages.find(p => p.id === state.activePageId)?.id
            || pages[0]?.id
            || null;
        return { pages, activePageId };
    }),

    // 페이지 추가
    addPage: (page) => set((state) => ({
        pages: [
            ...state.pages,
            { ...page, id: `page-${Date.now()}` }
        ]
    })),

    // 페이지 삭제
    removePage: (id) => set((state) => ({
        pages: state.pages.filter(p => p.id !== id),
        activePageId: state.activePageId === id
            ? (state.pages[0]?.id || null)
            : state.activePageId
    })),

    // 활성 페이지 설정
    setActivePage: (id) => set({ activePageId: id }),

    // 페이지 업데이트
    updatePage: (id, updates) => set((state) => ({
        pages: state.pages.map(p =>
            p.id === id ? { ...p, ...updates } : p
        )
    })),

    // Mission Control 토글
    toggleMissionControl: () => set((state) => ({
        isMissionControlOpen: !state.isMissionControlOpen
    })),

    // Mission Control 열기/닫기
    setMissionControlOpen: (open) => set({ isMissionControlOpen: open }),
}));

