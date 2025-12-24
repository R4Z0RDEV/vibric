import { create } from 'zustand';
import type { FileNode } from '@/types';

interface FileSystemState {
    files: FileNode[];
    activeFilePath: string | null;
    openFiles: string[];
    isBooted: boolean;
    serverUrl: string | null;

    // Actions
    setFiles: (files: FileNode[]) => void;
    updateFile: (path: string, content: string) => void;
    addFile: (parentPath: string, name: string, type: 'file' | 'directory') => void;
    deleteFile: (path: string) => void;
    renameFile: (path: string, newName: string) => void;

    setActiveFile: (path: string | null) => void;
    openFile: (path: string) => void;
    closeFile: (path: string) => void;

    setBooted: (booted: boolean) => void;
    setServerUrl: (url: string | null) => void;

    toggleDirectory: (path: string) => void;
}

// Helper to find and update a file in the tree
const updateFileInTree = (
    nodes: FileNode[],
    path: string,
    updater: (node: FileNode) => FileNode
): FileNode[] => {
    return nodes.map((node) => {
        if (node.path === path) {
            return updater(node);
        }
        if (node.children) {
            return {
                ...node,
                children: updateFileInTree(node.children, path, updater),
            };
        }
        return node;
    });
};

export const useFileSystemStore = create<FileSystemState>((set) => ({
    files: [],
    activeFilePath: null,
    openFiles: [],
    isBooted: false,
    serverUrl: null,

    setFiles: (files) => set({ files }),

    updateFile: (path, content) => set((state) => ({
        files: updateFileInTree(state.files, path, (node) => ({
            ...node,
            content,
        })),
    })),

    addFile: (parentPath, name, type) => set((state) => {
        const newPath = parentPath ? `${parentPath}/${name}` : name;
        const newNode: FileNode = {
            name,
            path: newPath,
            type,
            children: type === 'directory' ? [] : undefined,
            content: type === 'file' ? '' : undefined,
        };

        if (!parentPath) {
            return { files: [...state.files, newNode] };
        }

        return {
            files: updateFileInTree(state.files, parentPath, (node) => ({
                ...node,
                children: [...(node.children || []), newNode],
            })),
        };
    }),

    deleteFile: (path) => set((state) => {
        const filterTree = (nodes: FileNode[]): FileNode[] => {
            return nodes
                .filter((node) => node.path !== path)
                .map((node) => ({
                    ...node,
                    children: node.children ? filterTree(node.children) : undefined,
                }));
        };

        return {
            files: filterTree(state.files),
            openFiles: state.openFiles.filter((p) => p !== path),
            activeFilePath: state.activeFilePath === path ? null : state.activeFilePath,
        };
    }),

    renameFile: (path, newName) => set((state) => {
        const pathParts = path.split('/');
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');

        return {
            files: updateFileInTree(state.files, path, (node) => ({
                ...node,
                name: newName,
                path: newPath,
            })),
        };
    }),

    setActiveFile: (path) => set({ activeFilePath: path }),

    openFile: (path) => set((state) => ({
        openFiles: state.openFiles.includes(path)
            ? state.openFiles
            : [...state.openFiles, path],
        activeFilePath: path,
    })),

    closeFile: (path) => set((state) => {
        const newOpenFiles = state.openFiles.filter((p) => p !== path);
        return {
            openFiles: newOpenFiles,
            activeFilePath:
                state.activeFilePath === path
                    ? newOpenFiles[newOpenFiles.length - 1] || null
                    : state.activeFilePath,
        };
    }),

    setBooted: (booted) => set({ isBooted: booted }),

    setServerUrl: (url) => set({ serverUrl: url }),

    toggleDirectory: (path) => set((state) => ({
        files: updateFileInTree(state.files, path, (node) => ({
            ...node,
            isOpen: !node.isOpen,
        })),
    })),
}));
