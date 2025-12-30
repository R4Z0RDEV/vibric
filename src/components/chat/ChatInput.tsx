'use client';

import { useRef, useState, useEffect, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, Plus, Slash, AtSign, ChevronDown, X, Image as ImageIcon } from 'lucide-react';
import { useChatStore, ChatInputMode, SelectedModel } from '@/stores/chat-store';
import { MentionDropdown } from './MentionDropdown';
import { CommandPalette, DEFAULT_COMMANDS } from './CommandPalette';
import { MentionPill, CommandPill } from './InputPill';
import type { MentionItem, CommandItem } from '@/types';

// AI 모델 로고 컴포넌트
function GeminiLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="url(#gemini-gradient)" />
            <defs>
                <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4285F4" />
                    <stop offset="0.5" stopColor="#9B72CB" />
                    <stop offset="1" stopColor="#D96570" />
                </linearGradient>
            </defs>
            <path d="M12 6.5c-1.5 0-2.8 0.6-3.8 1.5L12 12l3.8-4c-1-0.9-2.3-1.5-3.8-1.5z" fill="white" fillOpacity="0.9" />
            <path d="M8.2 8l-2 2c-0.9 1-1.5 2.3-1.5 3.8 0 1.5 0.6 2.8 1.5 3.8l4-3.8L8.2 8z" fill="white" fillOpacity="0.7" />
            <path d="M12 17.5c1.5 0 2.8-0.6 3.8-1.5L12 12l-3.8 4c1 0.9 2.3 1.5 3.8 1.5z" fill="white" fillOpacity="0.5" />
            <path d="M15.8 16l2-2c0.9-1 1.5-2.3 1.5-3.8 0-1.5-0.6-2.8-1.5-3.8l-4 3.8L15.8 16z" fill="white" fillOpacity="0.3" />
        </svg>
    );
}

function ClaudeLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="6" fill="#CC785C" />
            <path d="M15.5 8.5L12 15L8.5 8.5H10.5L12 11.5L13.5 8.5H15.5Z" fill="white" />
            <path d="M12 15L8.5 8.5L6 13H8L9 11L10.5 14H13.5L15 11L16 13H18L15.5 8.5L12 15Z" fill="white" fillOpacity="0.8" />
        </svg>
    );
}

function OpenAILogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5047-2.6067-1.4998z" fill="white" />
        </svg>
    );
}

// 모델 정보
const AI_MODELS: { id: SelectedModel; name: string; icon: ReactNode }[] = [
    { id: 'gemini', name: 'Gemini', icon: <GeminiLogo className="w-5 h-5" /> },
    { id: 'claude', name: 'Claude', icon: <ClaudeLogo className="w-5 h-5" /> },
    { id: 'gpt-4', name: 'GPT-4', icon: <OpenAILogo className="w-5 h-5" /> },
];

interface ChatInputProps {
    onSubmit: (content: string) => void;
}

export function ChatInput({ onSubmit }: ChatInputProps) {
    const {
        inputValue,
        setInputValue,
        isLoading,
        inputMode,
        setInputMode,
        selectedModel,
        setSelectedModel,
    } = useChatStore();

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modelButtonRef = useRef<HTMLButtonElement>(null);
    const mentionButtonRef = useRef<HTMLButtonElement>(null);
    const commandButtonRef = useRef<HTMLButtonElement>(null);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [isMounted, setIsMounted] = useState(false);

    const inputContainerRef = useRef<HTMLDivElement>(null);

    // 멘션 및 명령어 상태
    const [showMention, setShowMention] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [showCommand, setShowCommand] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [mentions, setMentions] = useState<MentionItem[]>([]);
    const [activeCommand, setActiveCommand] = useState<CommandItem | null>(null);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelDropdownRef = useRef<HTMLDivElement>(null);

    // 클라이언트 마운트 확인
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 드롭다운 위치 계산
    useEffect(() => {
        if (showModelDropdown && modelButtonRef.current) {
            const rect = modelButtonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.top - 8, // 버튼 위 8px
                left: rect.left,
            });
        }
    }, [showModelDropdown]);

    // 모델 드롭다운 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                showModelDropdown &&
                modelButtonRef.current &&
                !modelButtonRef.current.contains(e.target as Node) &&
                modelDropdownRef.current &&
                !modelDropdownRef.current.contains(e.target as Node)
            ) {
                setShowModelDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showModelDropdown]);

    // 파일 선택 핸들러
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setAttachedFiles(prev => [...prev, ...Array.from(files)]);
        }
        // 같은 파일 다시 선택 가능하도록 리셋
        e.target.value = '';
    };

    // 파일 삭제 핸들러
    const handleFileRemove = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // @ 및 / 입력 감지
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputValue(value);

        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);

        // @ 감지 (공백 또는 시작 뒤)
        const mentionMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
        if (mentionMatch) {
            setShowMention(true);
            setMentionQuery(mentionMatch[1]);
            setShowCommand(false);
        } else {
            setShowMention(false);
            setMentionQuery('');
        }

        // / 감지 (줄 시작)
        const commandMatch = textBeforeCursor.match(/(?:^|\n)\/(\S*)$/);
        if (commandMatch) {
            setShowCommand(true);
            setCommandQuery(commandMatch[1]);
            setShowMention(false);
        } else {
            setShowCommand(false);
            setCommandQuery('');
        }
    };

    // 멘션 선택 핸들러
    const handleMentionSelect = (item: MentionItem) => {
        const cursorPos = inputRef.current?.selectionStart || inputValue.length;
        const textBeforeCursor = inputValue.slice(0, cursorPos);
        const textAfterCursor = inputValue.slice(cursorPos);

        // @ 이후 텍스트 제거 (Pill로 표시하므로)
        const newTextBefore = textBeforeCursor.replace(/@\S*$/, '');
        setInputValue(newTextBefore + textAfterCursor);
        setMentions((prev) => [...prev, item]);
        setShowMention(false);

        // 포커스 유지
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    // 명령어 선택 핸들러
    const handleCommandSelect = (command: CommandItem) => {
        const cursorPos = inputRef.current?.selectionStart || inputValue.length;
        const textBeforeCursor = inputValue.slice(0, cursorPos);
        const textAfterCursor = inputValue.slice(cursorPos);

        // / 이후 텍스트 제거 (Pill로 표시하므로)
        const newTextBefore = textBeforeCursor.replace(/\/\S*$/, '');
        setInputValue(newTextBefore + textAfterCursor);
        setActiveCommand(command);
        setShowCommand(false);

        // 액션 실행
        command.action();

        // 포커스 유지
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    // 기본 명령어 목록 (action 포함)
    const commands: CommandItem[] = DEFAULT_COMMANDS.map((cmd) => ({
        ...cmd,
        action: () => {
            console.log(`Command executed: ${cmd.name}`);
            // TODO: 실제 명령어 액션 구현
        },
    }));

    // 전송 핸들러
    const handleSubmit = () => {
        if (!inputValue.trim() && mentions.length === 0 && !activeCommand && attachedFiles.length === 0) return;
        if (isLoading) return;
        onSubmit(inputValue.trim());
        setInputValue('');
        setMentions([]);
        setActiveCommand(null);
        setAttachedFiles([]);

        // 높이 리셋
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    };

    // Enter 키 핸들러
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Textarea 자동 높이 조절
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    };

    // 현재 선택된 모델
    const currentModel = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

    return (
        <>
            <div className="p-4">
                <div className="liquid-glass rounded-2xl">
                    {/* Mode Toggle - Spec / Fast */}
                    <div className="flex items-center gap-1 px-4 pt-3">
                        <div className="flex rounded-lg overflow-hidden liquid-glass-subtle">
                            <button
                                onClick={() => setInputMode('multi')}
                                className={`
                                px-4 py-1.5 text-sm font-medium transition-all duration-200
                                relative z-10
                                ${inputMode === 'multi'
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/50 hover:text-white/80'
                                    }
                            `}
                            >
                                Multi
                            </button>
                            <button
                                onClick={() => setInputMode('fast')}
                                className={`
                                px-4 py-1.5 text-sm font-medium transition-all duration-200
                            relative z-10
                            ${inputMode === 'fast'
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/50 hover:text-white/80'
                                    }
                            `}
                            >
                                Fast
                            </button>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div ref={inputContainerRef} className="px-4 py-3 relative">
                        {/* Pills Area - Command, Mention, Files */}
                        {(mentions.length > 0 || activeCommand || attachedFiles.length > 0) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {/* Command Pill */}
                                {activeCommand && (
                                    <CommandPill
                                        command={activeCommand}
                                        onRemove={() => setActiveCommand(null)}
                                    />
                                )}
                                {/* Mention Pills */}
                                {mentions.map((item) => (
                                    <MentionPill
                                        key={item.id}
                                        item={item}
                                        onRemove={() => setMentions((prev) => prev.filter((m) => m.id !== item.id))}
                                    />
                                ))}
                                {/* Attached File Previews */}
                                {attachedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="
                                            flex items-center gap-2 px-2 py-1
                                            bg-white/10 rounded-lg border border-white/20
                                            text-sm text-white/80
                                        "
                                    >
                                        {file.type.startsWith('image/') ? (
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={file.name}
                                                className="w-6 h-6 rounded object-cover"
                                            />
                                        ) : (
                                            <ImageIcon size={14} className="text-white/60" />
                                        )}
                                        <span className="max-w-[100px] truncate">{file.name}</span>
                                        <button
                                            onClick={() => handleFileRemove(index)}
                                            className="text-white/40 hover:text-white transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            placeholder={
                                inputMode === 'multi'
                                    ? 'What do you want to build?'
                                    : '무엇을 만들어 드릴까요?'
                            }
                            rows={1}
                            className="
                            w-full bg-transparent text-white text-sm
                            placeholder:text-white/50
                            resize-none outline-none
                            min-h-[48px] max-h-[200px]
                            relative z-10
                        "
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="relative flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-2">
                            {/* Hidden File Input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {/* + 파일 업로드 */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="
                                w-9 h-9 rounded-full
                                liquid-glass-button
                                flex items-center justify-center
                                text-white/60 hover:text-white
                                transition-colors
                            "
                                title="파일 첨부"
                            >
                                <Plus size={18} className="relative z-10" />
                            </button>

                            {/* / 명령어 */}
                            <button
                                ref={commandButtonRef}
                                onClick={() => setShowCommand(!showCommand)}
                                className={`
                                w-9 h-9 rounded-lg
                                flex items-center justify-center
                                transition-colors
                                ${showCommand ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}
                            `}
                                title="명령어"
                            >
                                <Slash size={18} />
                            </button>

                            {/* @ 멘션 */}
                            <button
                                ref={mentionButtonRef}
                                onClick={() => setShowMention(!showMention)}
                                className={`
                                w-9 h-9 rounded-lg
                                flex items-center justify-center
                                transition-colors
                                ${showMention ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}
                            `}
                                title="멘션"
                            >
                                <AtSign size={18} />
                            </button>

                            {/* Model Selector */}
                            <div className="relative">
                                <button
                                    ref={modelButtonRef}
                                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                                    className="
                                    flex items-center gap-2 px-3 py-1.5
                                    rounded-lg
                                    text-white/70 hover:text-white hover:bg-white/10
                                    transition-colors text-sm
                                "
                                >
                                    <span>{currentModel.icon}</span>
                                    <span>{currentModel.name}</span>
                                    <ChevronDown size={14} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Mention Dropdown - Portal로 렌더링 (텍스트박스 위) */}
                        <MentionDropdown
                            isOpen={showMention}
                            searchQuery={mentionQuery}
                            onSelect={handleMentionSelect}
                            onClose={() => setShowMention(false)}
                            anchorRef={inputContainerRef}
                        />

                        {/* Command Palette - Portal로 렌더링 (텍스트박스 위) */}
                        <CommandPalette
                            isOpen={showCommand}
                            searchQuery={commandQuery}
                            onSelect={handleCommandSelect}
                            onClose={() => setShowCommand(false)}
                            commands={commands}
                            anchorRef={inputContainerRef}
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!inputValue.trim() || isLoading}
                            className="
                            w-10 h-10 rounded-full
                            bg-white text-zinc-900
                            flex items-center justify-center
                            disabled:opacity-50 disabled:cursor-not-allowed
                            hover:bg-white/90
                            transition-colors
                        "
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div >

            {/* Model Dropdown Portal - 버튼 바로 위에 fixed로 배치 */}
            {
                isMounted && showModelDropdown && createPortal(
                    <div
                        ref={modelDropdownRef}
                        className="
                        liquid-glass-card rounded-lg
                        py-1 min-w-[140px]
                        animate-fade-in
                    "
                        style={{
                            position: 'fixed',
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            transform: 'translateY(-100%)',
                            zIndex: 9999,
                        }}
                    >
                        {AI_MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    setSelectedModel(model.id);
                                    setShowModelDropdown(false);
                                }}
                                className={`
                            w-full flex items-center gap-2 px-3 py-2
                            text-sm transition-colors
                            ${selectedModel === model.id
                                        ? 'text-white bg-white/10'
                                        : 'text-white/70 hover:text-white hover:bg-white/5'
                                    }
                        `}
                            >
                                <span>{model.icon}</span>
                                <span className="relative z-10">{model.name}</span>
                            </button>
                        ))}
                    </div>,
                    document.body
                )
            }

        </>
    );
}
