'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    Download,
    Globe,
    Undo2,
    Redo2,
    Loader2,
    Check,
    ChevronDown
} from 'lucide-react'
import { useBuilderStore } from '@/lib/stores/builder-store'

export function BuilderToolbar() {
    const [isPublishing, setIsPublishing] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)

    const { portfolio, previewHtml } = useBuilderStore()

    const handlePublish = async () => {
        if (!portfolio?.id) return
        setIsPublishing(true)

        try {
            const response = await fetch('/api/builder/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolioId: portfolio.id })
            })

            if (response.ok) {
                // Show success
            }
        } catch (error) {
            console.error('Publish failed:', error)
        } finally {
            setIsPublishing(false)
        }
    }

    const handleExport = async (format: 'html' | 'zip') => {
        if (!previewHtml) return
        setIsExporting(true)
        setShowExportMenu(false)

        try {
            if (format === 'html') {
                // Download as HTML file
                const blob = new Blob([previewHtml], { type: 'text/html' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${portfolio?.name || 'portfolio'}.html`
                a.click()
                URL.revokeObjectURL(url)
            } else {
                // Download as ZIP via API
                const response = await fetch('/api/builder/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        portfolioId: portfolio?.id,
                        html: previewHtml
                    })
                })

                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${portfolio?.name || 'portfolio'}.zip`
                a.click()
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    return (
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

            {/* Center: Undo/Redo */}
            <div className="flex items-center gap-1">
                <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    disabled
                    title="Undo"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
                <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    disabled
                    title="Redo"
                >
                    <Redo2 className="w-4 h-4" />
                </button>
            </div>

            {/* Right: Export & Publish */}
            <div className="flex items-center gap-3">
                {/* Export Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={!previewHtml || isExporting}
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
                    disabled={isPublishing || !previewHtml}
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
    )
}
