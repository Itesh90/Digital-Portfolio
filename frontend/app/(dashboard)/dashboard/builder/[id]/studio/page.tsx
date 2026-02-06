'use client'

/**
 * Portfolio Builder Studio
 * 
 * 3-panel layout: Build Steps | Code Editor | Live Preview
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    PanelLeftClose, PanelRightClose, Play, Download,
    ArrowLeft, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useBuildWebSocket, type BuildEvent } from '@/lib/useWebSocket'
import { useBuildStore } from '@/lib/buildStore'

import { BuildStepsPanel } from '@/components/builder/BuildStepsPanel'
import { CodeEditor } from '@/components/builder/CodeEditor'
import { LivePreview } from '@/components/builder/LivePreview'

export default function StudioPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const portfolioId = params.id as string
    const initialPrompt = searchParams.get('initial_prompt')

    // Panel visibility
    const [showSteps, setShowSteps] = useState(true)
    const [showPreview, setShowPreview] = useState(true)

    // Build state
    const {
        buildId,
        status,
        startBuild,
        processEvent,
        files,
        reset
    } = useBuildStore()

    const [isStarting, setIsStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Handle WebSocket events
    const handleEvent = useCallback((event: BuildEvent) => {
        processEvent(event)
    }, [processEvent])

    // WebSocket connection (only when we have a buildId)
    const { isConnected } = useBuildWebSocket({
        buildId: buildId || '',
        onEvent: handleEvent,
    })

    // Start build on mount
    useEffect(() => {
        const initBuild = async () => {
            if (buildId || isStarting) return

            setIsStarting(true)
            setError(null)

            try {
                // Supabase Auth handles authentication via cookies
                // No need for manual token management

                // Fetch portfolio data
                let resumeData = null
                try {
                    const portfolio = await api.getPortfolio(portfolioId)
                    if (portfolio.resume_id) {
                        const resume = await api.getResume(portfolio.resume_id)
                        resumeData = resume.parsed_data
                    }
                } catch (e) {
                    // Continue without resume data
                }

                // Start build via API (legacy - needs migration to Supabase Edge Functions)
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/build/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        portfolio_id: portfolioId,
                        resume_data: resumeData,
                        user_prompt: initialPrompt,
                        style: 'modern',
                    }),
                })

                if (!response.ok) {
                    throw new Error('Failed to start build')
                }

                const data = await response.json()
                startBuild(data.id)

            } catch (e: any) {
                setError(e.message || 'Failed to start build')
            } finally {
                setIsStarting(false)
            }
        }

        initBuild()
    }, [portfolioId])

    // Export files
    const handleExport = async () => {
        const fileList = Object.entries(files)
        if (fileList.length === 0) return

        // Create a simple zip-like structure (JSON for now)
        const exportData = {
            files: fileList.map(([path, file]) => ({
                path,
                content: file.content,
            })),
            exported_at: new Date().toISOString(),
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `portfolio-${portfolioId}.json`
        a.click()

        URL.revokeObjectURL(url)
    }

    return (
        <div className="h-screen flex flex-col bg-[#1a1a1a]">
            {/* Header */}
            <header className="h-14 bg-[#252525] border-b border-[#3c3c3c] flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-2 hover:bg-[#3c3c3c] rounded transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="text-white font-medium">Portfolio Studio</div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                        {status === 'building' && (
                            <span className="flex items-center gap-1.5 text-sm text-blue-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Building...
                            </span>
                        )}
                        {status === 'completed' && (
                            <span className="text-sm text-green-400">✓ Complete</span>
                        )}
                        {status === 'failed' && (
                            <span className="text-sm text-red-400">✗ Failed</span>
                        )}
                        {isConnected && (
                            <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Panel toggles */}
                    <button
                        onClick={() => setShowSteps(!showSteps)}
                        className={cn(
                            "p-2 rounded transition-colors",
                            showSteps ? "bg-[#3c3c3c] text-white" : "text-gray-400 hover:bg-[#3c3c3c]"
                        )}
                        title="Toggle build steps"
                    >
                        <PanelLeftClose className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                            "p-2 rounded transition-colors",
                            showPreview ? "bg-[#3c3c3c] text-white" : "text-gray-400 hover:bg-[#3c3c3c]"
                        )}
                        title="Toggle preview"
                    >
                        <PanelRightClose className="w-5 h-5" />
                    </button>

                    <div className="w-px h-5 bg-[#3c3c3c] mx-2" />

                    {/* Export button */}
                    <button
                        onClick={handleExport}
                        disabled={Object.keys(files).length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#9B3DDB] hover:bg-[#7B2CBF] text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="bg-red-900/50 border-b border-red-800 px-4 py-2 text-sm text-red-200">
                    {error}
                </div>
            )}

            {/* Main content - 3 panel layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left panel - Build Steps */}
                {showSteps && (
                    <div className="w-72 flex-shrink-0">
                        <BuildStepsPanel />
                    </div>
                )}

                {/* Center panel - Code Editor */}
                <div className="flex-1 min-w-0">
                    <CodeEditor />
                </div>

                {/* Right panel - Preview */}
                {showPreview && (
                    <div className="w-[45%] flex-shrink-0">
                        <LivePreview />
                    </div>
                )}
            </div>
        </div>
    )
}
