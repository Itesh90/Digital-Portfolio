'use client'

/**
 * Live Preview Component
 * 
 * Renders the generated portfolio in an iframe sandbox.
 */

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Maximize2, ExternalLink, Smartphone, Monitor, Tablet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBuildStore } from '@/lib/buildStore'

interface LivePreviewProps {
    className?: string
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_SIZES: Record<ViewportSize, { width: number; height: number }> = {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
}

export function LivePreview({ className }: LivePreviewProps) {
    const { files, status } = useBuildStore()
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [viewport, setViewport] = useState<ViewportSize>('desktop')
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Assemble preview HTML from files
    const assemblePreview = (): string => {
        const fileList = Object.values(files)

        // Get CSS files
        const styles = fileList
            .filter(f => f.path.endsWith('.css'))
            .map(f => f.content)
            .join('\n')

        // Get HTML component files
        const components = fileList
            .filter(f => f.path.startsWith('/components/') && f.path.endsWith('.html'))
            .map(f => f.content)
            .join('\n')

        // Get JS files
        const scripts = fileList
            .filter(f => f.path.endsWith('.js'))
            .map(f => f.content)
            .join('\n')

        // Check if we have an index.html
        const indexFile = files['/index.html']
        if (indexFile) {
            let html = indexFile.content

            // Inline CSS: replace <link href="styles.css"> with <style>...</style>
            const cssFile = files['/styles.css']
            if (cssFile) {
                html = html.replace(
                    /<link[^>]*href=["']\.?\/?styles\.css["'][^>]*\/?>/gi,
                    `<style>${cssFile.content}</style>`
                )
            }

            // Inline JS: replace <script src="script.js"> with <script>...</script>
            const jsFile = files['/script.js']
            if (jsFile) {
                html = html.replace(
                    /<script[^>]*src=["']\.?\/?script\.js["'][^>]*><\/script>/gi,
                    `<script>${jsFile.content}</script>`
                )
            }

            return html
        }

        // Otherwise, assemble from parts
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Preview</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        ${styles}
    </style>
</head>
<body>
    ${components}
    <script>${scripts}</script>
</body>
</html>`
    }

    // Update iframe content
    const updatePreview = () => {
        if (!iframeRef.current) return

        const html = assemblePreview()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)

        iframeRef.current.src = url

        // Cleanup
        return () => URL.revokeObjectURL(url)
    }

    // Update preview when files change
    useEffect(() => {
        const cleanup = updatePreview()
        return cleanup
    }, [files])

    // Manual refresh
    const handleRefresh = () => {
        setIsRefreshing(true)
        updatePreview()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    // Open in new tab
    const openInNewTab = () => {
        const html = assemblePreview()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
    }

    const hasContent = Object.keys(files).length > 0

    return (
        <div className={cn("flex flex-col h-full bg-gray-100", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Preview</span>
                    {status === 'building' && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Live Updating
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Viewport buttons */}
                    <button
                        onClick={() => setViewport('mobile')}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewport === 'mobile' ? "bg-gray-200" : "hover:bg-gray-100"
                        )}
                        title="Mobile view"
                    >
                        <Smartphone className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setViewport('tablet')}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewport === 'tablet' ? "bg-gray-200" : "hover:bg-gray-100"
                        )}
                        title="Tablet view"
                    >
                        <Tablet className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setViewport('desktop')}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewport === 'desktop' ? "bg-gray-200" : "hover:bg-gray-100"
                        )}
                        title="Desktop view"
                    >
                        <Monitor className="w-4 h-4 text-gray-600" />
                    </button>

                    <div className="w-px h-5 bg-gray-200 mx-1" />

                    {/* Action buttons */}
                    <button
                        onClick={handleRefresh}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn(
                            "w-4 h-4 text-gray-600",
                            isRefreshing && "animate-spin"
                        )} />
                    </button>
                    <button
                        onClick={openInNewTab}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Open in new tab"
                    >
                        <ExternalLink className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 p-4 overflow-auto flex items-start justify-center">
                {hasContent ? (
                    <div
                        className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
                        style={{
                            width: viewport === 'desktop' ? '100%' : VIEWPORT_SIZES[viewport].width,
                            maxWidth: '100%',
                            height: viewport === 'desktop' ? '100%' : VIEWPORT_SIZES[viewport].height,
                        }}
                    >
                        <iframe
                            ref={iframeRef}
                            className="w-full h-full border-0"
                            title="Portfolio Preview"
                            sandbox="allow-scripts"
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium text-gray-500">Preview</p>
                            <p className="text-sm mt-1">
                                {status === 'building'
                                    ? 'Building your portfolio...'
                                    : 'Start a build to see the preview'
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
