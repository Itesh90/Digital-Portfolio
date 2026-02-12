'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, Code2, File } from 'lucide-react'
import { ChatPanel } from '@/components/builder/ChatPanel'
import { PreviewPanel } from '@/components/builder/PreviewPanel'
import { BuilderToolbar } from '@/components/builder/BuilderToolbar'
import { useBuilderStore } from '@/lib/stores/builder-store'
import { portfolios } from '@/lib/api'
import { cn } from '@/lib/utils'

type RightPanelTab = 'preview' | 'code'

export default function BuilderPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialPrompt = searchParams.get('initial_prompt')
    const portfolioId = params.id as string
    const [activeTab, setActiveTab] = useState<RightPanelTab>('preview')

    const {
        portfolio,
        isLoading,
        error,
        files,
        activeFile,
        setPortfolio,
        setLoading,
        setError,
        setActiveFile,
        updateFileContent,
        reset
    } = useBuilderStore()

    useEffect(() => {
        // Reset state when mounting or changing portfolio ID
        reset()

        async function loadPortfolio() {
            if (!portfolioId) return

            setLoading(true)
            try {
                const data = await portfolios.get(portfolioId)
                setPortfolio(data)
            } catch (err: any) {
                setError(err.message || 'Failed to load portfolio')
            } finally {
                setLoading(false)
            }
        }

        loadPortfolio()
    }, [portfolioId, setPortfolio, setLoading, setError, reset])

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading builder...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    const fileList = Object.values(files)
    const currentFile = activeFile ? files[activeFile] : null

    const getFileColor = (path: string) => {
        if (path.endsWith('.html')) return 'text-orange-500'
        if (path.endsWith('.css')) return 'text-blue-500'
        if (path.endsWith('.js')) return 'text-yellow-500'
        return 'text-gray-500'
    }

    const getLanguageLabel = (path: string) => {
        if (path.endsWith('.html')) return 'HTML'
        if (path.endsWith('.css')) return 'CSS'
        if (path.endsWith('.js')) return 'JavaScript'
        return 'Text'
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Toolbar */}
            <BuilderToolbar />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel - Left Side */}
                <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
                    <ChatPanel initialPrompt={initialPrompt || undefined} />
                </div>

                {/* Right Panel with Tab Toggle */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {/* Tab Bar */}
                    <div className="flex items-center gap-0 bg-white border-b border-gray-200 px-4">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                                activeTab === 'preview'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                        <button
                            onClick={() => setActiveTab('code')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                                activeTab === 'code'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Code2 className="w-4 h-4" />
                            Code
                            {fileList.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                    {fileList.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'preview' ? (
                        <div className="flex-1">
                            <PreviewPanel />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
                            {/* File Tabs */}
                            <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto">
                                {fileList.map((file) => (
                                    <button
                                        key={file.path}
                                        onClick={() => setActiveFile(file.path)}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-2 text-sm border-r border-[#3c3c3c] whitespace-nowrap transition-colors',
                                            activeFile === file.path
                                                ? 'bg-[#1e1e1e] text-white'
                                                : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#303030]'
                                        )}
                                    >
                                        <File className={cn('w-3.5 h-3.5', getFileColor(file.path))} />
                                        <span>{file.path.split('/').pop()}</span>
                                    </button>
                                ))}
                                {fileList.length === 0 && (
                                    <div className="px-4 py-2 text-gray-500 text-sm">
                                        No files generated yet...
                                    </div>
                                )}
                            </div>

                            {/* Code Editor */}
                            <div className="flex-1 overflow-hidden relative">
                                {currentFile ? (
                                    <div className="absolute inset-0 flex flex-col">
                                        {/* File info bar */}
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span>{currentFile.path}</span>
                                                <span className="px-1.5 py-0.5 bg-[#3c3c3c] rounded text-xs">
                                                    {getLanguageLabel(currentFile.path)}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {currentFile.content.split('\n').length} lines
                                            </span>
                                        </div>
                                        {/* Editor area */}
                                        <div className="flex-1 flex overflow-hidden">
                                            {/* Line numbers */}
                                            <div className="w-12 bg-[#1e1e1e] border-r border-[#3c3c3c] text-right pr-2 py-2 text-gray-500 text-xs font-mono select-none overflow-hidden">
                                                {currentFile.content.split('\n').map((_: string, i: number) => (
                                                    <div key={i} className="h-[1.5rem] leading-[1.5rem]">
                                                        {i + 1}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Textarea editor */}
                                            <textarea
                                                value={currentFile.content}
                                                onChange={(e) => {
                                                    if (activeFile) {
                                                        updateFileContent(activeFile, e.target.value)
                                                    }
                                                }}
                                                className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-2 resize-none focus:outline-none leading-[1.5rem]"
                                                spellCheck={false}
                                                style={{ tabSize: 2 }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <div className="text-center">
                                            <Code2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                            <p className="text-sm">Chat with AI to generate code</p>
                                            <p className="text-xs mt-1 text-gray-600">
                                                Files will appear here as tabs
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
