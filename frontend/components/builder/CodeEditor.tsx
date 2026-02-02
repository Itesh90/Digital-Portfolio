'use client'

/**
 * Code Editor Component
 * 
 * Monaco-based code editor with file tabs.
 */

import { useEffect, useRef, useState } from 'react'
import { File, X, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBuildStore, type VirtualFile } from '@/lib/buildStore'

interface CodeEditorProps {
    className?: string
}

export function CodeEditor({ className }: CodeEditorProps) {
    const { files, activeFile, setActiveFile, updateFileContent } = useBuildStore()
    const editorRef = useRef<HTMLTextAreaElement>(null)
    const [localContent, setLocalContent] = useState('')

    // Get file list
    const fileList = Object.values(files)
    const currentFile = activeFile ? files[activeFile] : null

    // Sync local content with store
    useEffect(() => {
        if (currentFile) {
            setLocalContent(currentFile.content)
        }
    }, [activeFile, currentFile?.content])

    // Handle content change
    const handleChange = (value: string) => {
        setLocalContent(value)
        if (activeFile) {
            updateFileContent(activeFile, value)
        }
    }

    // Get file language for syntax hints
    const getLanguageLabel = (file: VirtualFile) => {
        switch (file.language) {
            case 'html': return 'HTML'
            case 'css': return 'CSS'
            case 'javascript': return 'JavaScript'
            case 'typescript': return 'TypeScript'
            default: return 'Text'
        }
    }

    // Get file icon color
    const getFileColor = (file: VirtualFile) => {
        switch (file.language) {
            case 'html': return 'text-orange-500'
            case 'css': return 'text-blue-500'
            case 'javascript': return 'text-yellow-500'
            case 'typescript': return 'text-blue-600'
            default: return 'text-gray-500'
        }
    }

    return (
        <div className={cn("flex flex-col h-full bg-[#1e1e1e]", className)}>
            {/* File tabs */}
            <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto">
                {fileList.map((file) => (
                    <button
                        key={file.path}
                        onClick={() => setActiveFile(file.path)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm border-r border-[#3c3c3c] whitespace-nowrap transition-colors",
                            activeFile === file.path
                                ? "bg-[#1e1e1e] text-white"
                                : "bg-[#2d2d2d] text-gray-400 hover:bg-[#303030]"
                        )}
                    >
                        <File className={cn("w-3.5 h-3.5", getFileColor(file))} />
                        <span>{file.path.split('/').pop()}</span>
                    </button>
                ))}

                {fileList.length === 0 && (
                    <div className="px-4 py-2 text-gray-500 text-sm">
                        No files generated yet...
                    </div>
                )}
            </div>

            {/* Editor header */}
            {currentFile && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{currentFile.path}</span>
                        <span className="px-1.5 py-0.5 bg-[#3c3c3c] rounded text-xs">
                            {getLanguageLabel(currentFile)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">
                            {currentFile.content.split('\n').length} lines
                        </span>
                    </div>
                </div>
            )}

            {/* Code area */}
            <div className="flex-1 overflow-hidden relative">
                {currentFile ? (
                    <div className="absolute inset-0 flex">
                        {/* Line numbers */}
                        <div className="w-12 bg-[#1e1e1e] border-r border-[#3c3c3c] text-right pr-2 py-2 text-gray-500 text-xs font-mono select-none overflow-hidden">
                            {localContent.split('\n').map((_, i) => (
                                <div key={i} className="h-[1.5rem] leading-[1.5rem]">
                                    {i + 1}
                                </div>
                            ))}
                        </div>

                        {/* Code editor */}
                        <textarea
                            ref={editorRef}
                            value={localContent}
                            onChange={(e) => handleChange(e.target.value)}
                            className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-2 resize-none focus:outline-none leading-[1.5rem]"
                            spellCheck={false}
                            style={{
                                tabSize: 2,
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <File className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-sm">Select a file to edit</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
