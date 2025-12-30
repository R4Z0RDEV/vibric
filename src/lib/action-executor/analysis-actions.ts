/**
 * Analysis Actions - 코드 분석 액션
 */

import type {
    ActionResult,
    ListFilesAction,
    AnalyzeCodeAction,
    FileListResult,
} from './types';
import { useFileSystemStore } from '@/stores/filesystem-store';
import type { FileNode } from '@/types';

/**
 * 분석 액션 실행 라우터
 */
export async function executeAnalysisAction(
    action: ListFilesAction | AnalyzeCodeAction
): Promise<ActionResult> {
    switch (action.type) {
        case 'list_files':
            return listFiles(action);
        case 'analyze_code':
            return analyzeCode(action);
    }
}

/**
 * 파일 목록 조회
 */
async function listFiles(action: ListFilesAction): Promise<ActionResult> {
    const { files } = useFileSystemStore.getState();

    try {
        const result = collectFiles(files, action.path, action.recursive ?? false);

        return {
            success: true,
            action,
            output: result.files.map(f => `${f.type === 'directory' ? '📁' : '📄'} ${f.path}`).join('\n'),
            data: result,
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
 * 파일 노드에서 파일 목록 수집
 */
function collectFiles(
    nodes: FileNode[],
    basePath: string,
    recursive: boolean
): FileListResult {
    const result: FileListResult = { files: [] };

    const normalizedBase = basePath.replace(/\/$/, '');

    const traverse = (nodeList: FileNode[]) => {
        for (const node of nodeList) {
            // 경로가 basePath로 시작하는지 확인
            if (node.path.startsWith(normalizedBase) || normalizedBase === '') {
                result.files.push({
                    name: node.name,
                    path: node.path,
                    type: node.type,
                });

                if (recursive && node.children) {
                    traverse(node.children);
                }
            }
        }
    };

    traverse(nodes);
    return result;
}

/**
 * 코드 분석
 */
async function analyzeCode(action: AnalyzeCodeAction): Promise<ActionResult> {
    const { files } = useFileSystemStore.getState();

    try {
        let analysisResult: unknown;

        switch (action.target) {
            case 'dependencies':
                analysisResult = analyzeDependencies(files);
                break;
            case 'structure':
                analysisResult = analyzeStructure(files);
                break;
            case 'errors':
                analysisResult = { errors: [] }; // TODO: 정적 분석 구현
                break;
            case 'unused':
                analysisResult = { unusedFiles: [] }; // TODO: 사용되지 않는 파일 분석
                break;
        }

        return {
            success: true,
            action,
            output: JSON.stringify(analysisResult, null, 2),
            data: analysisResult,
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
 * 의존성 분석 (package.json 기반)
 */
function analyzeDependencies(files: FileNode[]): object {
    // package.json 찾기
    const findPackageJson = (nodes: FileNode[]): FileNode | undefined => {
        for (const node of nodes) {
            if (node.name === 'package.json' && node.type === 'file') {
                return node;
            }
            if (node.children) {
                const found = findPackageJson(node.children);
                if (found) return found;
            }
        }
        return undefined;
    };

    const packageJson = findPackageJson(files);
    if (!packageJson?.content) {
        return { dependencies: {}, devDependencies: {} };
    }

    try {
        const parsed = JSON.parse(packageJson.content);
        return {
            dependencies: parsed.dependencies || {},
            devDependencies: parsed.devDependencies || {},
        };
    } catch {
        return { dependencies: {}, devDependencies: {}, error: 'Failed to parse package.json' };
    }
}

/**
 * 구조 분석
 */
function analyzeStructure(files: FileNode[]): object {
    const structure = {
        totalFiles: 0,
        totalDirectories: 0,
        byExtension: {} as Record<string, number>,
    };

    const countNodes = (nodes: FileNode[]) => {
        for (const node of nodes) {
            if (node.type === 'file') {
                structure.totalFiles++;
                const ext = node.name.split('.').pop() || 'unknown';
                structure.byExtension[ext] = (structure.byExtension[ext] || 0) + 1;
            } else {
                structure.totalDirectories++;
                if (node.children) {
                    countNodes(node.children);
                }
            }
        }
    };

    countNodes(files);
    return structure;
}
