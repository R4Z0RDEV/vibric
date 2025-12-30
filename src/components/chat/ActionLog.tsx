'use client';

import {
    FilePlus,
    FileEdit,
    FileX,
    FileSearch,
    Terminal,
    FolderTree,
    Microscope,
    Bug,
    AlertCircle,
    RefreshCw,
    Navigation,
    Globe,
    Loader2,
    Check,
    Clock,
    type LucideIcon
} from 'lucide-react';
import { FileTypeIcon } from './FileTypeIcon';
import { useUIStore } from '@/stores/ui-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import type { ActionItem } from '@/lib/streaming-parser';

interface ActionLogProps {
    action: ActionItem;
}

interface ActionTypeStyle {
    OverlayIcon: LucideIcon | null;
    overlayColor: string;
    bgColor: string;
    borderColor: string;
    label: string;
    labelColor: string;
    showFileIcon: boolean;  // 파일 아이콘 표시 여부
}

/**
 * 개별 액션 로그 아이템 - 모든 액션 타입 지원
 * 클릭 시 해당 액션에 맞는 동작 수행
 */
export function ActionLog({ action }: ActionLogProps) {
    const { type, path, lines, status, command, query, url } = action;
    const { setActiveTab } = useUIStore();
    const { openFile } = useFileSystemStore();

    // 클릭 핸들러 - 액션 타입에 따라 다른 동작
    const handleClick = () => {
        switch (type) {
            case 'create_file':
            case 'modify_file':
            case 'read_file':
                if (path) {
                    setActiveTab('code');
                    openFile(path);
                }
                break;
            case 'run_command':
            case 'get_logs':
            case 'get_errors':
                // 터미널 관련 - code 탭으로 이동 (터미널은 code 탭 하단에 있음)
                setActiveTab('code');
                break;
            case 'refresh_preview':
            case 'navigate_to':
                // 프리뷰 관련 - canvas 탭으로 이동 (프리뷰는 canvas에 있음)
                setActiveTab('canvas');
                break;
            // list_files, analyze_code, web_search는 클릭 동작 없음
            default:
                break;
        }
    };

    // 아이콘 색상과 배경
    const getTypeStyles = (): ActionTypeStyle => {
        switch (type) {
            case 'create_file':
                return {
                    OverlayIcon: FilePlus,
                    overlayColor: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500/30',
                    label: '(new)',
                    labelColor: 'text-green-400',
                    showFileIcon: true,
                };
            case 'modify_file':
                return {
                    OverlayIcon: FileEdit,
                    overlayColor: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/30',
                    label: lines || '',
                    labelColor: 'text-yellow-400',
                    showFileIcon: true,
                };
            case 'delete_file':
                return {
                    OverlayIcon: FileX,
                    overlayColor: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    label: '(deleted)',
                    labelColor: 'text-red-400',
                    showFileIcon: true,
                };
            case 'read_file':
                return {
                    OverlayIcon: FileSearch,
                    overlayColor: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    label: '(read)',
                    labelColor: 'text-blue-400',
                    showFileIcon: true,
                };
            case 'run_command':
                return {
                    OverlayIcon: Terminal,
                    overlayColor: 'text-amber-400',
                    bgColor: 'bg-amber-500/10',
                    borderColor: 'border-amber-500/30',
                    label: '',
                    labelColor: 'text-amber-400',
                    showFileIcon: false,
                };
            case 'list_files':
                return {
                    OverlayIcon: FolderTree,
                    overlayColor: 'text-cyan-400',
                    bgColor: 'bg-cyan-500/10',
                    borderColor: 'border-cyan-500/30',
                    label: '',
                    labelColor: 'text-cyan-400',
                    showFileIcon: false,
                };
            case 'analyze_code':
                return {
                    OverlayIcon: Microscope,
                    overlayColor: 'text-purple-400',
                    bgColor: 'bg-purple-500/10',
                    borderColor: 'border-purple-500/30',
                    label: '',
                    labelColor: 'text-purple-400',
                    showFileIcon: false,
                };
            case 'get_logs':
                return {
                    OverlayIcon: Bug,
                    overlayColor: 'text-orange-400',
                    bgColor: 'bg-orange-500/10',
                    borderColor: 'border-orange-500/30',
                    label: '',
                    labelColor: 'text-orange-400',
                    showFileIcon: false,
                };
            case 'get_errors':
                return {
                    OverlayIcon: AlertCircle,
                    overlayColor: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    label: '',
                    labelColor: 'text-red-400',
                    showFileIcon: false,
                };
            case 'refresh_preview':
                return {
                    OverlayIcon: RefreshCw,
                    overlayColor: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    label: '',
                    labelColor: 'text-blue-400',
                    showFileIcon: false,
                };
            case 'navigate_to':
                return {
                    OverlayIcon: Navigation,
                    overlayColor: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    label: '',
                    labelColor: 'text-blue-400',
                    showFileIcon: false,
                };
            case 'web_search':
                return {
                    OverlayIcon: Globe,
                    overlayColor: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/10',
                    borderColor: 'border-emerald-500/30',
                    label: '',
                    labelColor: 'text-emerald-400',
                    showFileIcon: false,
                };
            case 'git_checkpoint':
                return {
                    OverlayIcon: Globe,  // GitCommit 대신 임시로 Globe 사용
                    overlayColor: 'text-violet-400',
                    bgColor: 'bg-violet-500/10',
                    borderColor: 'border-violet-500/30',
                    label: '(save)',
                    labelColor: 'text-violet-400',
                    showFileIcon: false,
                };
            case 'git_revert':
                return {
                    OverlayIcon: RefreshCw,
                    overlayColor: 'text-rose-400',
                    bgColor: 'bg-rose-500/10',
                    borderColor: 'border-rose-500/30',
                    label: '(rollback)',
                    labelColor: 'text-rose-400',
                    showFileIcon: false,
                };
            case 'git_status':
            case 'git_diff':
                return {
                    OverlayIcon: FolderTree,
                    overlayColor: 'text-violet-400',
                    bgColor: 'bg-violet-500/10',
                    borderColor: 'border-violet-500/30',
                    label: '',
                    labelColor: 'text-violet-400',
                    showFileIcon: false,
                };
            default:
                return {
                    OverlayIcon: null,
                    overlayColor: 'text-white/60',
                    bgColor: 'bg-white/5',
                    borderColor: 'border-white/10',
                    label: '',
                    labelColor: 'text-white/40',
                    showFileIcon: false,
                };
        }
    };

    const styles = getTypeStyles();

    // 상태 아이콘
    const renderStatus = () => {
        switch (status) {
            case 'pending':
                return <div className="w-4 h-4" />; // placeholder
            case 'waiting_approval':
                return <Clock size={14} className="text-yellow-400" />;
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

    // 액션 타입별 표시 내용 결정
    const getDisplayContent = () => {
        switch (type) {
            case 'create_file':
            case 'modify_file':
            case 'delete_file':
            case 'read_file':
            case 'list_files':
            case 'analyze_code': {
                const filePath = path || '';
                const fileName = filePath.split('/').pop() || filePath || type;
                const dirPath = filePath.substring(0, filePath.lastIndexOf('/')) || '';
                return { title: fileName, subtitle: dirPath };
            }
            case 'run_command':
                return {
                    title: command || 'run command',
                    subtitle: '터미널 명령'
                };
            case 'get_logs':
                return {
                    title: '로그 수집',
                    subtitle: 'Terminal logs'
                };
            case 'get_errors':
                return {
                    title: '에러 수집',
                    subtitle: 'Error detection'
                };
            case 'refresh_preview':
                return {
                    title: '프리뷰 새로고침',
                    subtitle: 'Preview refresh'
                };
            case 'navigate_to':
                return {
                    title: url || '/',
                    subtitle: 'Navigate to URL'
                };
            case 'web_search':
                return {
                    title: query || 'search',
                    subtitle: 'Tavily 웹 검색'
                };
            default:
                return { title: type, subtitle: '' };
        }
    };

    const { title, subtitle } = getDisplayContent();
    const Icon = styles.OverlayIcon;

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${styles.bgColor} ${styles.borderColor} transition-all duration-300 cursor-pointer hover:bg-white/10 active:scale-[0.98]`}
        >
            {/* 아이콘 영역 */}
            <div className="relative flex-shrink-0">
                {styles.showFileIcon && path ? (
                    <>
                        <FileTypeIcon filePath={path} size={24} />
                        {Icon && (
                            <div className={`absolute -bottom-1 -right-1 ${styles.overlayColor}`}>
                                <Icon size={12} />
                            </div>
                        )}
                    </>
                ) : (
                    Icon && <Icon size={20} className={styles.overlayColor} />
                )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/90 font-medium truncate">
                        {title}
                    </span>
                    {styles.label && (
                        <span className={`text-xs ${styles.labelColor}`}>
                            {styles.label}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <span className="text-xs text-white/40 truncate block">
                        {subtitle}
                    </span>
                )}
            </div>

            {/* 상태 */}
            <div className="flex-shrink-0">
                {renderStatus()}
            </div>
        </div>
    );
}
