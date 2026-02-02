'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    Sparkles, ChevronLeft, Loader2,
    Send, Monitor, Smartphone, RefreshCw, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Portfolio } from '@/types'

// ===== BUILDING STATE SCREEN =====
const BuildingState = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FDF6F0] via-[#F8C8DC] to-[#E8D5E0]">
        {/* Decorative background blobs */}
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-[#F5D0A9]/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-[#F8C8DC]/40 rounded-full blur-[120px] animate-pulse" />

        {/* Content */}
        <div className="relative z-10 text-center animate-fade-in">
            {/* Animated Logo */}
            <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Outer ring - pulsing */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#F5D0A9] to-[#F8C8DC] animate-ping opacity-30" />

                {/* Inner circle with logo */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#F5D0A9] to-[#E8D5E0] flex items-center justify-center shadow-lg">
                    {/* Stripes animation */}
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                            <div className="w-10 h-1.5 bg-[#c65d3b] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                            <div className="w-8 h-1.5 bg-[#c65d3b] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="w-6 h-1.5 bg-[#c65d3b] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Text */}
            <h1 className="text-2xl md:text-3xl font-semibold text-[#1a1a1a] tracking-tight">
                Building your portfolio.
            </h1>

            {/* Subtle loading indicator */}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
                <div className="w-1.5 h-1.5 bg-[#9B3DDB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[#9B3DDB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[#9B3DDB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    </div>
)

// ===== ERROR STATE =====
const ErrorState = ({ onRetry, onGoBack }: { onRetry: () => void; onGoBack: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FDF6F0] via-[#F8C8DC] to-[#E8D5E0]">
        <div className="text-center animate-fade-in max-w-md mx-4">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-8">
                We couldn't generate your portfolio. Please try again or upload a different resume.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-full font-medium hover:bg-[#2a2a2a] transition"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </button>
                <button
                    onClick={onGoBack}
                    className="px-6 py-3 text-gray-600 hover:text-[#1a1a1a] font-medium transition"
                >
                    Go Back
                </button>
            </div>
        </div>
    </div>
)

// ===== MAIN BUILDER PAGE =====
export default function BuilderPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    // State
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
    const [loading, setLoading] = useState(true)
    const [prompt, setPrompt] = useState('')
    const [isBuilding, setIsBuilding] = useState(false)
    const [buildError, setBuildError] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
    const [initialBuild, setInitialBuild] = useState(true) // Full-screen build state

    // Initialize
    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getPortfolio(params.id as string)
                setPortfolio(data)

                // If brand new (no content), auto-generate with full-screen build state
                if (!data.content && !data.blueprint) {
                    setInitialBuild(true)
                    await triggerBuild(data.id, true)
                } else {
                    // Already has content, just load preview
                    setInitialBuild(false)
                    await refreshPreview(data.id)
                }
            } catch (err) {
                toast.error("Could not load workspace")
                router.push('/dashboard')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [params.id])

    const triggerBuild = async (pid: string, isInitial: boolean = false) => {
        setIsBuilding(true)
        setBuildError(false)

        if (isInitial) {
            setInitialBuild(true)
        }

        try {
            // 1. Generate Blueprint
            await api.generateBlueprint(pid)

            // 2. Refresh Preview
            await refreshPreview(pid)

            toast.success("Build complete")
            setInitialBuild(false)
        } catch (err) {
            console.error(err)
            setBuildError(true)
            if (!isInitial) {
                toast.error("Build failed")
            }
        } finally {
            setIsBuilding(false)
        }
    }

    const refreshPreview = async (pid: string) => {
        try {
            const { html } = await api.getPreview(pid)
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            setPreviewUrl(url)
        } catch (e) {
            console.error(e)
        }
    }

    const handlePromptSubmit = async () => {
        if (!prompt.trim() || !portfolio) return

        setIsBuilding(true)

        try {
            // Simulating AI thinking delay
            await new Promise(r => setTimeout(r, 1500))

            await api.generateBlueprint(portfolio.id)
            await refreshPreview(portfolio.id)
            setPrompt('')
            toast.success("Changes applied")
        } catch (err) {
            toast.error("Failed to apply changes")
        } finally {
            setIsBuilding(false)
        }
    }

    const handleRetry = () => {
        if (portfolio) {
            setBuildError(false)
            triggerBuild(portfolio.id, true)
        }
    }

    const handleGoBack = () => {
        router.push('/dashboard')
    }

    // Show building state for initial portfolio generation
    if (loading || (initialBuild && isBuilding && !buildError)) {
        return <BuildingState />
    }

    // Show error state if build failed
    if (buildError) {
        return <ErrorState onRetry={handleRetry} onGoBack={handleGoBack} />
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-900">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="h-4 w-px bg-gray-200" />
                    <span className="font-semibold text-gray-900 text-sm">
                        {portfolio?.name || 'Untitled Portfolio'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                        {portfolio?.status || 'Draft'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-0.5 rounded-lg mr-4">
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={cn("p-1.5 rounded-md transition-all", previewMode === 'desktop' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={cn("p-1.5 rounded-md transition-all", previewMode === 'mobile' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    <button className="text-xs py-2 px-4 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg font-medium transition-colors">
                        Publish
                    </button>
                </div>
            </header>

            {/* Workspace Body */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT PANEL: AI Control */}
                <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">

                    {/* Status Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {isBuilding ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-in fade-in">
                                <div className="w-12 h-12 bg-[#9B3DDB]/10 rounded-full flex items-center justify-center mb-4">
                                    <Sparkles className="w-6 h-6 text-[#9B3DDB] animate-pulse" />
                                </div>
                                <h3 className="font-medium text-gray-900">Applying changes...</h3>
                                <p className="text-sm text-gray-500 mt-1">Updating your portfolio layout.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-[#9B3DDB]/5 p-4 rounded-xl border border-[#9B3DDB]/10">
                                    <h4 className="text-sm font-semibold text-[#9B3DDB] flex items-center gap-2 mb-2">
                                        <Sparkles className="w-3 h-3" />
                                        Ready to customize
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Your portfolio is ready! Use the input below to refine the design, content, or structure.
                                    </p>
                                </div>

                                {/* Quick suggestions */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quick edits</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Make it darker', 'Add more projects', 'Simplify layout'].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => setPrompt(suggestion)}
                                                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full transition"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="relative">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isBuilding}
                                placeholder="What would you like to change?"
                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#9B3DDB]/20 focus:bg-white focus:border-[#9B3DDB]/30 transition-all resize-none disabled:opacity-50"
                                rows={3}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handlePromptSubmit()
                                    }
                                }}
                            />
                            <button
                                onClick={handlePromptSubmit}
                                disabled={!prompt.trim() || isBuilding}
                                className="absolute bottom-3 right-3 p-1.5 bg-[#9B3DDB] text-white rounded-lg hover:bg-[#7B2DBB] disabled:opacity-50 disabled:bg-gray-300 transition-colors"
                            >
                                {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-2 text-center">
                            Press Enter to apply changes
                        </div>
                    </div>
                </aside>

                {/* MAIN CANVAS: Preview */}
                <main className="flex-1 bg-gradient-to-br from-[#FDF6F0]/30 to-[#F8C8DC]/20 relative overflow-hidden flex items-center justify-center p-4">
                    {previewUrl ? (
                        <div className={cn(
                            "transition-all duration-500 ease-in-out shadow-2xl rounded-lg overflow-hidden bg-white border border-gray-200/50",
                            previewMode === 'mobile' ? "w-[375px] h-[812px]" : "w-full max-w-6xl h-full"
                        )}>
                            <iframe
                                src={previewUrl}
                                className="w-full h-full"
                                title="Live Preview"
                            />
                        </div>
                    ) : (
                        <div className="text-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p>Loading Preview...</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
