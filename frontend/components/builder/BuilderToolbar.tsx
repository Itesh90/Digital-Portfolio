'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
    ArrowLeft,
    Download,
    Globe,
    Undo2,
    Redo2,
    Loader2,
    Check,
    ChevronDown,
    Settings,
    Pencil,
    Trash2,
    X,
    Copy,
    ExternalLink
} from 'lucide-react'
import { useBuilderStore } from '@/lib/stores/builder-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function BuilderToolbar() {
    const router = useRouter()
    const [isPublishing, setIsPublishing] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState('')
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
    const [showPublishSuccess, setShowPublishSuccess] = useState(false)
    const renameInputRef = useRef<HTMLInputElement>(null)
    const settingsRef = useRef<HTMLDivElement>(null)

    const { portfolio, files, setPortfolio } = useBuilderStore()

    // Close settings on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Focus rename input when renaming
    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus()
            renameInputRef.current.select()
        }
    }, [isRenaming])

    // Assemble files into single HTML for publish/export
    const assembleHtml = (): string => {
        const fileList = Object.values(files)
        if (fileList.length === 0) return ''

        const htmlFile = fileList.find(f => f.path.endsWith('.html'))
        const cssFiles = fileList.filter(f => f.path.endsWith('.css'))
        const jsFiles = fileList.filter(f => f.path.endsWith('.js'))

        const styles = cssFiles.map(f => f.content).join('\n')
        const scripts = jsFiles.map(f => f.content).join('\n')

        if (htmlFile) {
            let html = htmlFile.content
            // Inject CSS before </head>
            if (styles && html.includes('</head>')) {
                html = html.replace('</head>', `<style>\n${styles}\n</style>\n</head>`)
            }
            // Inject JS before </body>
            if (scripts && html.includes('</body>')) {
                html = html.replace('</body>', `<script>\n${scripts}\n</script>\n</body>`)
            }
            return html
        }

        // Fallback: build from scratch
        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${portfolio?.name || 'Portfolio'}</title><style>${styles}</style></head>
<body>${scripts ? `<script>${scripts}</script>` : ''}</body>
</html>`
    }

    const handlePublish = async () => {
        if (!portfolio?.id) return

        const html = assembleHtml()
        if (!html) {
            toast.error('No content to publish. Generate your portfolio first.')
            return
        }

        setIsPublishing(true)

        try {
            const response = await fetch('/api/builder/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    portfolioId: portfolio.id,
                    html,
                    files: Object.fromEntries(
                        Object.entries(files).map(([k, v]) => [k, { content: v.content }])
                    )
                })
            })

            const data = await response.json()

            if (response.ok && data.url) {
                setPublishedUrl(data.url)
                setShowPublishSuccess(true)
                setPortfolio({ ...portfolio, status: 'published', published_url: data.url })
                toast.success('Portfolio published!')
            } else {
                toast.error(data.error || 'Publish failed')
            }
        } catch (error) {
            console.error('Publish failed:', error)
            toast.error('Failed to publish portfolio')
        } finally {
            setIsPublishing(false)
        }
    }

    const handleExport = async (format: 'html' | 'zip') => {
        const html = assembleHtml()
        if (!html) {
            toast.error('No content to export')
            return
        }

        setIsExporting(true)
        setShowExportMenu(false)

        try {
            if (format === 'html') {
                const blob = new Blob([html], { type: 'text/html' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${portfolio?.name || 'portfolio'}.html`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('HTML downloaded')
            } else {
                const response = await fetch('/api/builder/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        portfolioId: portfolio?.id,
                        html,
                        files: Object.fromEntries(
                            Object.entries(files).map(([k, v]) => [k, { content: v.content }])
                        )
                    })
                })

                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${portfolio?.name || 'portfolio'}.zip`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('ZIP downloaded')
            }
        } catch (error) {
            console.error('Export failed:', error)
            toast.error('Export failed')
        } finally {
            setIsExporting(false)
        }
    }

    const handleRename = async () => {
        if (!portfolio?.id || !renameValue.trim()) {
            setIsRenaming(false)
            return
        }

        try {
            await api.updatePortfolio(portfolio.id, { name: renameValue.trim() })
            setPortfolio({ ...portfolio, name: renameValue.trim() })
            toast.success('Portfolio renamed')
        } catch (err: any) {
            toast.error(err?.message || 'Rename failed')
        }
        setIsRenaming(false)
        setShowSettings(false)
    }

    const handleDeletePortfolio = async () => {
        if (!portfolio?.id) return
        if (!confirm(`Delete "${portfolio.name || 'Untitled Portfolio'}"? This cannot be undone.`)) return

        try {
            await api.deletePortfolio(portfolio.id)
            toast.success('Portfolio deleted')
            router.push('/dashboard')
        } catch (err: any) {
            toast.error(err?.message || 'Delete failed')
        }
        setShowSettings(false)
    }

    const hasContent = Object.keys(files).length > 0

    return (
        <>
            <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
                {/* Left: Back & Title */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div>
                        <h1 className="font-semibold text-gray-900 truncate max-w-[200px]">
                            {portfolio?.name || 'Untitled Portfolio'}
                        </h1>
                        <p className="text-xs text-gray-500">
                            {portfolio?.status === 'published' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                    <Check className="w-3 h-3" /> Published
                                </span>
                            ) : (
                                'Draft'
                            )}
                        </p>
                    </div>
                </div>

                {/* Right: Settings, Export & Publish */}
                <div className="flex items-center gap-3">
                    {/* Settings Dropdown */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>

                        {showSettings && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                                <button
                                    onClick={() => {
                                        setRenameValue(portfolio?.name || '')
                                        setIsRenaming(true)
                                        setShowSettings(false)
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Rename Portfolio
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                    onClick={handleDeletePortfolio}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Portfolio
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={!hasContent || isExporting}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isExporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">Export</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <button
                                    onClick={() => handleExport('html')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Download HTML
                                </button>
                                <button
                                    onClick={() => handleExport('zip')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Download ZIP
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Publish Button */}
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || !hasContent}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {isPublishing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Globe className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">Publish</span>
                    </button>
                </div>
            </div>

            {/* Rename Modal */}
            {isRenaming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-[400px] mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rename Portfolio</h3>
                        <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename()
                                if (e.key === 'Escape') setIsRenaming(false)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            placeholder="Portfolio name"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setIsRenaming(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRename}
                                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Success Modal */}
            {showPublishSuccess && publishedUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-[450px] mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-600" />
                                Published!
                            </h3>
                            <button
                                onClick={() => setShowPublishSuccess(false)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Your portfolio is now live and accessible at:
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <span className="flex-1 text-sm text-purple-600 truncate font-mono">
                                {publishedUrl}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(publishedUrl)
                                    toast.success('URL copied!')
                                }}
                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md"
                                title="Copy URL"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <a
                                href={publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md"
                                title="Open in new tab"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                        <button
                            onClick={() => setShowPublishSuccess(false)}
                            className="w-full mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

