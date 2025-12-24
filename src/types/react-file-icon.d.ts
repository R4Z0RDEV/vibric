declare module 'react-file-icon' {
    import { FC } from 'react';

    export type DefaultExtensionType =
        | 'ai' | 'avi' | 'css' | 'csv' | 'doc' | 'docx' | 'exe' | 'gif'
        | 'go' | 'html' | 'jpg' | 'jpeg' | 'js' | 'json' | 'jsx' | 'md'
        | 'mp3' | 'mp4' | 'pdf' | 'php' | 'png' | 'ppt' | 'pptx' | 'py'
        | 'rb' | 'rs' | 'sass' | 'scss' | 'sh' | 'sql' | 'svg' | 'swift'
        | 'ts' | 'tsx' | 'txt' | 'vue' | 'xls' | 'xlsx' | 'xml' | 'yml'
        | 'yaml' | 'zip' | string;

    export interface FileIconProps {
        /** File extension (without the dot) */
        extension?: string;
        /** Icon type: 'default', 'acrobat', 'code', 'compressed', 'document', 'image', etc. */
        type?: string;
        /** Label position: 'top', 'center', 'bottom' */
        labelTextStyle?: object;
        /** Main label color */
        labelColor?: string;
        /** Secondary fold color */
        foldColor?: string;
        /** Glyph (icon in center) color */
        glyphColor?: string;
        /** Main icon color */
        color?: string;
        /** Gradient percentage */
        gradientOpacity?: number;
        /** Unique ID */
        id?: string;
        /** Radius for rounded corners */
        radius?: number;
    }

    export const FileIcon: FC<FileIconProps>;

    export const defaultStyles: Record<string, Partial<FileIconProps>>;
}
