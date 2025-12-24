'use client';

import { FilePlus, FileEdit, FileX, Loader2, Check } from 'lucide-react';
import { FileTypeIcon } from './FileTypeIcon';
import { useUIStore } from '@/stores/ui-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import type { ActionItem } from '@/lib/streaming-parser';

interface ActionLogProps {
    action: ActionItem;
}

/**
 * 개별 액션 로그 아이템 - 파일 확장자별 아이콘 지원
 * 클릭 시 Code 탭으로 전환 + 해당 파일 열기
 */
export function ActionLog({ action }: ActionLogProps) {
    const { type, path, lines, status } = action;
    const { setActiveTab } = useUIStore();
    const { openFile } = useFileSystemStore();

    // 클릭 핸들러 - Code 탭으로 전환 + 파일 열기
    const handleClick = () => {
        if (path) {
            setActiveTab('code');
            openFile(path);
        }
    };

    // 아이콘 색상과 배경
    const getTypeStyles = () => {
        switch (type) {
            case 'create_file':
                return {
                    OverlayIcon: FilePlus,
                    overlayColor: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500/30',
                    label: '(new)',
                    labelColor: 'text-green-400',
                };
            case 'modify_file':
                return {
                    OverlayIcon: FileEdit,
                    overlayColor: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/30',
                    label: lines || '',
                    labelColor: 'text-yellow-400',
                };
            case 'delete_file':
                return {
                    OverlayIcon: FileX,
                    overlayColor: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    label: '(deleted)',
                    labelColor: 'text-red-400',
                };
            default:
                return {
                    OverlayIcon: null,
                    overlayColor: 'text-white/60',
                    bgColor: 'bg-white/5',
                    borderColor: 'border-white/10',
                    label: '',
                    labelColor: 'text-white/40',
                };
        }
    };

    const styles = getTypeStyles();

    // 상태 아이콘
    const renderStatus = () => {
        switch (status) {
            case 'pending':
                return <div className="w-4 h-4" />; // placeholder
            case 'in_progress':
                return <Loader2 size={14} className="text-blue-400 animate-spin" />;
            case 'completed':
                return <Check size={14} className="text-green-400" />;
            case 'error':
                return <span className="text-red-400 text-xs">⚠</span>;
            default:
                return null;
        }
    };

    // 파일 경로에서 파일명 추출
    const fileName = path.split('/').pop() || path;
    const dirPath = path.substring(0, path.lastIndexOf('/')) || '/';

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${styles.bgColor} ${styles.borderColor} transition-all duration-300 cursor-pointer hover:bg-white/10 active:scale-[0.98]`}
        >
            {/* 파일 타입 아이콘 + 액션 오버레이 */}
            <div className="relative flex-shrink-0">
                <FileTypeIcon filePath={path} size={24} />
                {styles.OverlayIcon && (
                    <div className={`absolute -bottom-1 -right-1 ${styles.overlayColor}`}>
                        <styles.OverlayIcon size={12} />
                    </div>
                )}
            </div>

            {/* 파일 정보 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/90 font-medium truncate">
                        {fileName}
                    </span>
                    {styles.label && (
                        <span className={`text-xs ${styles.labelColor}`}>
                            {styles.label}
                        </span>
                    )}
                </div>
                <span className="text-xs text-white/40 truncate block">
                    {dirPath}
                </span>
            </div>

            {/* 상태 */}
            <div className="flex-shrink-0">
                {renderStatus()}
            </div>
        </div>
    );
}

